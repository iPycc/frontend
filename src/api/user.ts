import { buildGroupLabel, formatDateTimeToSeconds, normalizeRole } from "@/api/auth"
import { requestJson } from "@/api/client"
import type { AppUser, SecurityState, UserProfile } from "@/lib/models"

type RawUserResponse = {
  id?: number | string
  uid?: string
  email?: string
  username?: string
  role?: string
  group?: string
  avatar?: string | null
  created_at?: string
  password_updated_at?: string | null
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
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

function buildHomepage(username: string) {
  return `https://cloudrave.app/u/${encodeURIComponent(username.trim().toLowerCase().replace(/\s+/g, "-"))}`
}

function normalizeProfile(raw: RawUserResponse): ProfilePayload {
  const uid = String(raw.uid ?? raw.id ?? "")
  const username = String(raw.username ?? "Cloudrave User")
  const role = normalizeRole(raw.role)
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
      registeredAt: formatDateTimeToSeconds(raw.created_at),
    },
    profile: {
      username,
      avatar,
      email: String(raw.email ?? ""),
      uid,
      registeredAt: formatDateTimeToSeconds(raw.created_at),
      group: buildGroupLabel(role, raw.group),
      homepage: buildHomepage(username),
    },
    passwordUpdatedAt: formatDateTimeToSeconds(raw.password_updated_at ?? raw.created_at),
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
      current_password: payload.currentPassword,
      new_password: payload.newPassword,
      confirm_password: payload.confirmPassword,
    },
  })
}

export async function getLoginActivity(token: string): Promise<UserLoginActivityEntry[]> {
  const response = await requestJson<RawLoginActivityEntry[]>("/user/me/login-activity", {
    token,
  })

  return response.map((item) => ({
    id: `login-${item.id}`,
    method: item.method,
    result: item.result === "failure" ? "失败" : "成功",
    device: item.device,
    ip: item.ip || "-",
    time: formatDateTimeToSeconds(item.time),
    identifier: item.identifier,
  }))
}

export function mergePasswordUpdatedAt(security: SecurityState, passwordUpdatedAt: string): SecurityState {
  return {
    ...security,
    passwordUpdatedAt,
  }
}

