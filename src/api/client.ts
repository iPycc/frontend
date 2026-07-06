const DEFAULT_API_BASE = "/api/v1"

export class ApiError extends Error {
  status: number
  payload: unknown

  constructor(status: number, message: string, payload?: unknown) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.payload = payload
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
  headers?: HeadersInit
  signal?: AbortSignal
}

function getApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return env?.VITE_API_BASE_URL || DEFAULT_API_BASE
}

function toRequestBody(body: unknown) {
  if (body === undefined || body === null) {
    return undefined
  }

  if (typeof body === "string" || body instanceof FormData || body instanceof Blob) {
    return body
  }

  return JSON.stringify(body)
}

function pickErrorMessage(payload: unknown, status: number) {
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>
    const validationMessage = pickValidationMessage(record.detail)
    if (validationMessage) {
      return validationMessage
    }

    const message = record.message ?? record.msg ?? record.error ?? record.detail
    if (typeof message === "string" && message.trim()) {
      return message
    }
  }

  return `请求失败 (${status})`
}

export async function requestJson<T>(path: string, options: RequestOptions = {}) {
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  headers.set("Accept", "application/json")
  headers.set("X-Device-Fingerprint", getDeviceFingerprint())

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`)
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    method: options.method ?? "GET",
    headers,
    body: toRequestBody(options.body),
    signal: options.signal,
  })

  const rawText = await response.text()
  const payload = rawText ? parseMaybeJson(rawText) : null

  if (!response.ok) {
    throw new ApiError(response.status, pickErrorMessage(payload, response.status), payload)
  }

  return payload as T
}

function parseMaybeJson(rawText: string) {
  try {
    return JSON.parse(rawText) as unknown
  } catch {
    return rawText
  }
}

function pickValidationMessage(detail: unknown) {
  if (!Array.isArray(detail) || detail.length === 0) {
    return null
  }

  const firstItem = detail[0]
  if (!firstItem || typeof firstItem !== "object") {
    return null
  }

  const record = firstItem as Record<string, unknown>
  const message = typeof record.msg === "string" ? record.msg : null
  const location = Array.isArray(record.loc) ? record.loc.map(String).join(".") : ""

  if (!message) {
    return null
  }

  const fieldLabel = mapFieldLabel(location)
  const translatedMessage = translateValidationMessage(message)
  return fieldLabel ? `${fieldLabel}: ${translatedMessage}` : translatedMessage
}

function mapFieldLabel(location: string) {
  if (location.endsWith("email")) {
    return "邮箱"
  }
  if (location.endsWith("username")) {
    return "用户名"
  }
  if (location.endsWith("password")) {
    return "密码"
  }
  if (location.endsWith("current_password")) {
    return "旧密码"
  }
  if (location.endsWith("new_password")) {
    return "新密码"
  }
  if (location.endsWith("confirm_password")) {
    return "重复密码"
  }
  if (location.endsWith("refresh_token")) {
    return "刷新令牌"
  }
  return ""
}

function translateValidationMessage(message: string) {
  if (message.includes("at least 2 characters")) {
    return "至少需要 2 个字符"
  }
  if (message.includes("at least 8 characters")) {
    return "至少需要 8 个字符"
  }
  if (message.includes("at most 64 characters")) {
    return "不能超过 64 个字符"
  }
  if (message.includes("at most 128 characters")) {
    return "不能超过 128 个字符"
  }
  if (message.toLowerCase().includes("valid email")) {
    return "请输入有效的邮箱地址"
  }
  if (message.toLowerCase().includes("field required")) {
    return "该字段不能为空"
  }
  return message
}

function getDeviceFingerprint() {
  if (typeof window === "undefined") {
    return "server"
  }

  const ua = navigator.userAgent || "Unknown UA"
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    "Unknown Platform"
  const language = navigator.language || "unknown"
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "unknown"
  const screenSize = window.screen ? `${window.screen.width}x${window.screen.height}` : "unknown"

  return [platform, language, timezone, screenSize, ua].join(" | ")
}
