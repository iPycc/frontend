import { requestJson } from "./client"
import type { AppUser, AuthSession, AuthTokens } from "@/lib/models"

export type LoginRequest = {
  email: string
  password: string
}

export type RegisterRequest = {
  email: string
  password: string
  username: string
}

export type RawTokenPayload = {
  access_token?: string
  accessToken?: string
  refresh_token?: string
  refreshToken?: string
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

export function formatDateTimeToSeconds(value: unknown) {
  if (typeof value !== "string" || !value.trim()) {
    return new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-")
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const year = date.getFullYear()
  const month = `${date.getMonth() + 1}`.padStart(2, "0")
  const day = `${date.getDate()}`.padStart(2, "0")
  const hour = `${date.getHours()}`.padStart(2, "0")
  const minute = `${date.getMinutes()}`.padStart(2, "0")
  const second = `${date.getSeconds()}`.padStart(2, "0")
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`
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
    refreshToken: token.refresh_token ?? token.refreshToken ?? "",
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

export async function refreshToken(refreshToken: string) {
  const response = await requestJson<RawTokenPayload>("/session/token/refresh", {
    method: "POST",
    body: { refresh_token: refreshToken },
  })

  return normalizeTokens(response)
}

export async function logout(input?: { refreshToken?: string | null; accessToken?: string | null } | string | null) {
  const refreshToken = typeof input === "string" || input === null || input === undefined ? input : input.refreshToken
  const accessToken = typeof input === "object" && input !== null ? input.accessToken : null

  await requestJson<void>("/session/token", {
    method: "DELETE",
    token: accessToken ?? null,
    body: refreshToken ? { refresh_token: refreshToken } : undefined,
  })
}

