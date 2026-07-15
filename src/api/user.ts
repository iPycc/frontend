import { buildGroupLabel, formatDateTimeToSeconds, normalizeRole } from "@/api/auth"
import { requestJson } from "@/api/client"
import type { AppUser, PasskeyCredential, SecurityState, UserProfile } from "@/lib/models"

type RawUserResponse = {
  id?: number | string
  uid?: string
  email?: string
  username?: string
  timezone?: string
  role?: string
  group?: string
  avatar?: string | null
  created_at?: string
  password_updated_at?: string | null
  two_factor_enabled?: boolean
}

type RawLoginActivityEntry = {
  id: number
  method: string
  result: string
  device: string
  ip?: string | null
  time: string
  identifier: string
}

export type ProfilePayload = {
  account: AppUser
  profile: UserProfile
  passwordUpdatedAt: string
  timezone: string
  twoFactorEnabled: boolean
}

export type UserLoginActivityEntry = {
  id: string
  method: string
  result: string
  device: string
  ip: string
  time: string
  identifier: string
}

export type ChangePasswordRequest = {
  currentPassword?: string
  newPassword: string
  confirmPassword: string
  ceremonyId?: string
  credential?: Record<string, unknown>
}

export type UserPreferencesPayload = {
  timezone: string
}

type RawPasskeyCredential = {
  id: number
  name: string
  created_at: string
  last_used_at?: string | null
  transports?: string[]
}

type RawPasskeyListResponse = {
  passkeys_enabled: boolean
  passkeys: RawPasskeyCredential[]
}

type RawPasskeyOptionsResponse = {
  ceremony_id: string
  options: Record<string, unknown>
}

type RawPasskeyVerificationResponse = {
  verified: boolean
  passkey: RawPasskeyCredential
}

function buildHomepage(username: string) {
  return `https://cloudrave.app/u/${encodeURIComponent(username.trim().toLowerCase().replace(/\s+/g, "-"))}`
}

function normalizeProfile(raw: RawUserResponse): ProfilePayload {
  const uid = String(raw.uid ?? raw.id ?? "")
  const username = String(raw.username ?? "Cloudrave User")
  const role = normalizeRole(raw.role)
  const timezone = typeof raw.timezone === "string" && raw.timezone.trim() ? raw.timezone : "Asia/Shanghai"
  const avatar = typeof raw.avatar === "string" && raw.avatar.trim()
    ? raw.avatar
    : `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(username)}`

  return {
    account: {
      id: uid,
      email: String(raw.email ?? ""),
      username,
      avatar,
      role,
      group: buildGroupLabel(role, raw.group),
      registeredAt: formatDateTimeToSeconds(raw.created_at, timezone),
      twoFactorEnabled: Boolean(raw.two_factor_enabled),
    },
    profile: {
      username,
      avatar,
      email: String(raw.email ?? ""),
      uid,
      registeredAt: formatDateTimeToSeconds(raw.created_at, timezone),
      group: buildGroupLabel(role, raw.group),
      homepage: buildHomepage(username),
    },
    passwordUpdatedAt: formatDateTimeToSeconds(raw.password_updated_at ?? raw.created_at, timezone),
    timezone,
    twoFactorEnabled: Boolean(raw.two_factor_enabled),
  }
}

function normalizePasskey(item: RawPasskeyCredential, timezone?: string): PasskeyCredential {
  return {
    id: String(item.id),
    name: item.name,
    createdAt: formatDateTimeToSeconds(item.created_at, timezone),
    lastUsedAt: item.last_used_at ? formatDateTimeToSeconds(item.last_used_at, timezone) : "从未使用",
  }
}

export async function getCurrentProfile(token: string) {
  const response = await requestJson<RawUserResponse>("/user/me", {
    token,
  })

  return normalizeProfile(response)
}

export async function updateCurrentProfile(
  token: string,
  payload: { email: string; username: string }
) {
  const response = await requestJson<RawUserResponse>("/user/me", {
    method: "PATCH",
    token,
    body: payload,
  })

  return normalizeProfile(response)
}

export async function uploadCurrentAvatar(token: string, file: File) {
  const formData = new FormData()
  formData.set("file", file)

  const response = await requestJson<RawUserResponse>("/user/me/avatar", {
    method: "POST",
    token,
    body: formData,
  })

  return normalizeProfile(response)
}

export async function changeCurrentPassword(token: string, payload: ChangePasswordRequest) {
  return requestJson<{ message: string }>("/user/me/password", {
    method: "POST",
    token,
    body: {
      ...(payload.currentPassword ? { current_password: payload.currentPassword } : {}),
      new_password: payload.newPassword,
      confirm_password: payload.confirmPassword,
      ...(payload.ceremonyId ? { ceremony_id: payload.ceremonyId, credential: payload.credential } : {}),
    },
  })
}

export async function updateUserPreferences(token: string, payload: UserPreferencesPayload) {
  return requestJson<UserPreferencesPayload>("/user/me/preferences", {
    method: "PATCH",
    token,
    body: {
      timezone: payload.timezone,
    },
  })
}

export async function getLoginActivity(token: string, timezone?: string): Promise<UserLoginActivityEntry[]> {
  const response = await requestJson<RawLoginActivityEntry[]>("/user/me/login-activity", {
    token,
  })

  return response.map((item) => ({
    id: `login-${item.id}`,
    method: item.method,
    result: item.result === "failure" ? "失败" : "成功",
    device: item.device,
    ip: item.ip || "-",
    time: formatDateTimeToSeconds(item.time, timezone),
    identifier: item.identifier,
  }))
}

export async function listPasskeys(token: string, timezone?: string) {
  const response = await requestJson<RawPasskeyListResponse>("/user/me/passkeys", {
    token,
  })

  return {
    passkeysEnabled: response.passkeys_enabled,
    passkeys: response.passkeys.map((item) => normalizePasskey(item, timezone)),
  }
}

export async function beginPasskeyRegistration(token: string, name?: string) {
  return requestJson<RawPasskeyOptionsResponse>("/user/me/passkeys/registration/options", {
    method: "POST",
    token,
    body: name?.trim() ? { name } : {},
  })
}

export async function finishPasskeyRegistration(
  token: string,
  payload: { ceremonyId: string; name?: string; credential: Record<string, unknown> }
) {
  const response = await requestJson<RawPasskeyVerificationResponse>("/user/me/passkeys/registration/verify", {
    method: "POST",
    token,
    body: {
      ceremony_id: payload.ceremonyId,
      ...(payload.name?.trim() ? { name: payload.name } : {}),
      credential: payload.credential,
    },
  })

  return {
    verified: response.verified,
    passkey: normalizePasskey(response.passkey),
  }
}

export async function deletePasskey(token: string, passkeyId: string) {
  return requestJson<{ message: string }>(`/user/me/passkeys/${passkeyId}`, {
    method: "DELETE",
    token,
  })
}

export async function renamePasskey(token: string, passkeyId: string, name: string, timezone?: string) {
  const response = await requestJson<RawPasskeyCredential>(`/user/me/passkeys/${passkeyId}`, {
    method: "PATCH",
    token,
    body: {
      name,
    },
  })

  return normalizePasskey(response, timezone)
}

export async function getTwoFactorStatus(token: string) {
  return requestJson<{ enabled: boolean }>("/user/me/2fa", {
    token,
  })
}

export type TwoFactorSetupInitiateResponse = {
  setup_token: string
  secret: string
  qr_uri: string
}

export async function initiateTwoFactorSetupWithPassword(
  token: string,
  password: string
): Promise<TwoFactorSetupInitiateResponse> {
  return requestJson<TwoFactorSetupInitiateResponse>("/user/me/2fa/setup/password", {
    method: "POST",
    token,
    body: { password },
  })
}

export async function initiateTwoFactorSetupWithPasskey(
  token: string,
  ceremonyId: string,
  credential: Record<string, unknown>
): Promise<TwoFactorSetupInitiateResponse> {
  return requestJson<TwoFactorSetupInitiateResponse>("/user/me/2fa/setup/passkey", {
    method: "POST",
    token,
    body: { ceremony_id: ceremonyId, credential },
  })
}

export type TwoFactorSetupConfirmResponse = {
  enabled: boolean
  backup_codes: string[]
}

export async function confirmTwoFactorSetup(
  token: string,
  payload: { setupToken: string; secret: string; code: string }
): Promise<{ enabled: boolean; backupCodes: string[] }> {
  const response = await requestJson<TwoFactorSetupConfirmResponse>("/user/me/2fa/setup/confirm", {
    method: "POST",
    token,
    body: {
      setup_token: payload.setupToken,
      secret: payload.secret,
      code: payload.code,
    },
  })

  return {
    enabled: response.enabled,
    backupCodes: response.backup_codes,
  }
}

export type TwoFactorDisableRequest = {
  code: string
  password?: string
  ceremonyId?: string
  credential?: Record<string, unknown>
}

export async function disableTwoFactor(token: string, payload: TwoFactorDisableRequest) {
  return requestJson<{ message: string }>("/user/me/2fa/disable", {
    method: "POST",
    token,
    body: {
      code: payload.code,
      ...(payload.password ? { password: payload.password } : {}),
      ...(payload.ceremonyId ? { ceremony_id: payload.ceremonyId, credential: payload.credential } : {}),
    },
  })
}

export function mergePasswordUpdatedAt(security: SecurityState, passwordUpdatedAt: string): SecurityState {
  return {
    ...security,
    passwordUpdatedAt,
  }
}
