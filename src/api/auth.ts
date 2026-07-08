import { requestJson } from "./client"
import type { AppUser, AuthSession, AuthTokens } from "@/lib/models"

let refreshRequestInFlight: Promise<AuthTokens> | null = null

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
  username: string
}

export type PasskeyOptionsResponse = {
  ceremony_id: string
  options: Record<string, unknown>
}

export type RawTokenPayload = {
  access_token?: string
  accessToken?: string
  access_expires?: string
  access_expires_at?: string
  accessExpiresAt?: string
  refresh_expires?: string
  refresh_expires_at?: string
  refreshExpiresAt?: string
}

export type RawAuthResponse = {
  user?: Record<string, unknown>
  token?: RawTokenPayload
  data?: {
    user?: Record<string, unknown>
    token?: RawTokenPayload
  }
  session?: {
    user?: Record<string, unknown>
    token?: RawTokenPayload
  }
}

export function normalizeRole(value: unknown): AppUser["role"] {
  const role = String(value ?? "").toLowerCase()

  if (role.includes("admin")) {
    return "admin"
  }

  if (role.includes("guest")) {
    return "guest"
  }

  return "user"
}

export function buildGroupLabel(role: AppUser["role"], fallback?: unknown) {
  if (typeof fallback === "string" && fallback.trim()) {
    return fallback
  }

  switch (role) {
    case "admin":
      return "管理员"
    case "guest":
      return "访客"
    case "user":
    default:
      return "普通用户"
  }
}

function buildAvatar(seed: string) {
  return `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(seed)}`
}

export function formatDateTimeToSeconds(value: unknown, timezone?: string) {
  if (typeof value !== "string" || !value.trim()) {
    return new Date().toLocaleString("zh-CN", { hour12: false, timeZone: timezone || undefined }).replace(/\//g, "-")
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  try {
    const parts = new Intl.DateTimeFormat("sv-SE", {
      timeZone: timezone || undefined,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date)
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? ""
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`
  } catch {
    const year = date.getFullYear()
    const month = `${date.getMonth() + 1}`.padStart(2, "0")
    const day = `${date.getDate()}`.padStart(2, "0")
    const hour = `${date.getHours()}`.padStart(2, "0")
    const minute = `${date.getMinutes()}`.padStart(2, "0")
    const second = `${date.getSeconds()}`.padStart(2, "0")
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }
}

export function normalizeUser(raw: Record<string, unknown>): AppUser {
  const email = String(raw.email ?? raw.user_name ?? raw.username ?? "")
  const uid = String(raw.uid ?? raw.user_uid ?? raw.id ?? crypto.randomUUID())
  const username = String(raw.username ?? raw.nickname ?? raw.name ?? email.split("@")[0] ?? "Cloudrave User")
  const role = normalizeRole(raw.role ?? raw.user_role ?? raw.group)
  const group = buildGroupLabel(role, raw.group)
  const avatar = String(raw.avatar ?? buildAvatar(username))
  const registeredAt = formatDateTimeToSeconds(raw.registeredAt ?? raw.registered_at ?? raw.created_at)

  return {
    id: uid,
    email,
    username,
    avatar,
    role,
    group,
    registeredAt,
  }
}

function normalizeTokens(token: RawTokenPayload): AuthTokens {
  const accessExpiresAt = token.access_expires ?? token.access_expires_at ?? token.accessExpiresAt ?? new Date(Date.now() + 1000 * 60 * 60).toISOString()
  const refreshExpiresAt = token.refresh_expires ?? token.refresh_expires_at ?? token.refreshExpiresAt ?? new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

  return {
    accessToken: token.access_token ?? token.accessToken ?? "",
    accessExpiresAt,
    refreshExpiresAt,
  }
}

function normalizeAuthSession(payload: RawAuthResponse): AuthSession {
  const rawUser = payload.user ?? payload.data?.user ?? payload.session?.user ?? {}
  const rawToken = payload.token ?? payload.data?.token ?? payload.session?.token ?? {}

  return {
    user: normalizeUser(rawUser),
    tokens: normalizeTokens(rawToken),
  }
}

export async function login(request: LoginRequest) {
  const response = await requestJson<RawAuthResponse>("/session/token", {
    method: "POST",
    body: request,
  })

  return normalizeAuthSession(response)
}

export async function register(request: RegisterRequest) {
  const response = await requestJson<RawAuthResponse>("/user", {
    method: "POST",
    body: request,
  })

  return normalizeAuthSession(response)
}

export async function refreshToken() {
  if (refreshRequestInFlight) {
    return refreshRequestInFlight
  }

  refreshRequestInFlight = (async () => {
    try {
      const response = await requestJson<RawTokenPayload>("/session/token/refresh", {
        method: "POST",
      })

      return normalizeTokens(response)
    } finally {
      refreshRequestInFlight = null
    }
  })()

  return refreshRequestInFlight
}

export async function beginPasskeyLogin(email?: string) {
  return requestJson<PasskeyOptionsResponse>("/session/passkey/options", {
    method: "POST",
    body: email?.trim() ? { email: email.trim().toLowerCase() } : {},
    skipAuthRefresh: true,
  })
}

export async function finishPasskeyLogin(payload: { ceremonyId: string; credential: Record<string, unknown> }) {
  // #region debug-point G:passkey-login-verify-request
  fetch("http://127.0.0.1:7777/event", {
    method: "POST",
    body: JSON.stringify({
      sessionId: "passkey-login-cancel",
      runId: "pre-fix",
      hypothesisId: "G",
      location: "auth.ts:finishPasskeyLogin:request",
      msg: "[DEBUG] Sending passkey verify request",
      data: {
        ceremonyId: payload.ceremonyId,
        credentialId: payload.credential?.id ?? null,
      },
      ts: Date.now(),
    }),
  }).catch(() => {})
  // #endregion
  const response = await requestJson<RawAuthResponse>("/session/passkey/verify", {
    method: "POST",
    body: {
      ceremony_id: payload.ceremonyId,
      credential: payload.credential,
    },
    skipAuthRefresh: true,
  })

  return normalizeAuthSession(response)
}

export async function logout(scope: "current" | "all" = "current") {
  await requestJson<void>("/session/token", {
    method: "DELETE",
    body: { scope },
  })
}
