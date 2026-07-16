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
  requires_2fa?: boolean
  two_factor_token?: string
  message?: string
  data?: {
    user?: Record<string, unknown>
    token?: RawTokenPayload
    requires_2fa?: boolean
    two_factor_token?: string
    message?: string
  }
  session?: {
    user?: Record<string, unknown>
    token?: RawTokenPayload
    requires_2fa?: boolean
    two_factor_token?: string
    message?: string
  }
}

export type LoginResult =
  | ({ kind: "session" } & AuthSession)
  | { kind: "2fa"; twoFactorToken: string; method: "password" | "passkey"; message?: string }

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

function stringToHash(seed: string): number {
  let hash = 0
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash)
}

function hashToHsl(hash: number, offset = 0): string {
  const hue = (hash + offset * 137) % 360
  const saturation = 55 + ((hash >> 3) % 25)
  const lightness = 45 + ((hash >> 6) % 15)
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`
}

export function buildAvatar(seed: string): string {
  const hash = stringToHash(seed)
  const bg = hashToHsl(hash, 0)
  const fg = "#ffffff"
  const patternIndex = hash % 4

  let pattern = ""
  if (patternIndex === 0) {
    pattern = `<circle cx='50' cy='50' r='40' fill='${fg}' opacity='0.15'/>`
  } else if (patternIndex === 1) {
    pattern = `<rect x='20' y='20' width='60' height='60' rx='12' fill='${fg}' opacity='0.12'/>`
  } else if (patternIndex === 2) {
    pattern = `<path d='M50 15 L85 85 H15 Z' fill='${fg}' opacity='0.12'/>`
  } else {
    pattern = `<circle cx='50' cy='50' r='25' fill='none' stroke='${fg}' stroke-width='8' opacity='0.15'/>`
  }

  const svg = `
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
      <rect width='100' height='100' fill='${bg}'/>
      ${pattern}
      <text x='50' y='55' font-family='Inter, Noto Sans SC, sans-serif' font-size='36' font-weight='600'
            fill='${fg}' text-anchor='middle' dominant-baseline='middle'>
        ${seed.charAt(0).toUpperCase()}
      </text>
    </svg>
  `.trim()

  const encoded = svg
    .replace(/"/g, "'")
    .replace(/\s+/g, " ")
    .replace(/> </g, "><")
  return `data:image/svg+xml,${encodeURIComponent(encoded)}`
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

function normalizeLoginResult(
  payload: RawAuthResponse,
  method: "password" | "passkey"
): LoginResult {
  const requires2fa =
    payload.requires_2fa ??
    payload.data?.requires_2fa ??
    payload.session?.requires_2fa ??
    false
  const twoFactorToken =
    payload.two_factor_token ??
    payload.data?.two_factor_token ??
    payload.session?.two_factor_token

  if (requires2fa && twoFactorToken) {
    return {
      kind: "2fa",
      twoFactorToken,
      method,
      message: payload.message ?? payload.data?.message ?? payload.session?.message,
    }
  }

  return {
    kind: "session",
    ...normalizeAuthSession(payload),
  }
}

export async function login(request: LoginRequest): Promise<LoginResult> {
  const response = await requestJson<RawAuthResponse>("/session/token", {
    method: "POST",
    body: request,
  })

  return normalizeLoginResult(response, "password")
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

export async function finishPasskeyLogin(payload: {
  ceremonyId: string
  credential: Record<string, unknown>
}): Promise<LoginResult> {
  const response = await requestJson<RawAuthResponse>("/session/passkey/verify", {
    method: "POST",
    body: {
      ceremony_id: payload.ceremonyId,
      credential: payload.credential,
    },
    skipAuthRefresh: true,
  })

  return normalizeLoginResult(response, "passkey")
}

export async function verifyTwoFactorLogin(payload: {
  twoFactorToken: string
  code: string
  method?: "password" | "passkey"
}): Promise<AuthSession> {
  const response = await requestJson<RawAuthResponse>("/session/2fa/verify", {
    method: "POST",
    body: {
      two_factor_token: payload.twoFactorToken,
      code: payload.code,
      method: payload.method ?? "password",
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
