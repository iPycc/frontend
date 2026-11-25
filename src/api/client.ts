const DEFAULT_API_BASE = "/api/v1"

export class ApiError extends Error {
  status: number
  code?: string
  payload: unknown
  retryAfterMs?: number
  requestId?: string
  retryable?: boolean

  constructor(status: number, message: string, payload?: unknown, retryAfterMs?: number, requestId?: string, retryable?: boolean) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = payload && typeof payload === "object" && typeof (payload as Record<string, unknown>).code === "string"
      ? (payload as Record<string, string>).code : undefined
    this.payload = payload
    this.retryAfterMs = retryAfterMs
    this.requestId = requestId
    this.retryable = retryable
  }
}

type RequestOptions = {
  method?: string
  body?: unknown
  token?: string | null
  headers?: HeadersInit
  signal?: AbortSignal
  cache?: RequestCache
  skipAuthRefresh?: boolean
  onUploadProgress?: (loaded: number, total: number) => void
}

type AuthRuntime = {
  getAccessToken?: () => string | null
  refreshAccessToken?: () => Promise<string | null>
  onAuthFailure?: () => void
}

let authRuntime: AuthRuntime = {}
let refreshInFlight: Promise<string | null> | null = null

export function configureAuthClient(runtime: AuthRuntime) {
  authRuntime = runtime
}

function getApiBaseUrl() {
  const env = (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
  return env?.VITE_API_BASE_URL || DEFAULT_API_BASE
}

export function resolveRequestUrl(path: string) {
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  if (path.startsWith("/api/")) {
    return path
  }
  return `${getApiBaseUrl()}${path}`
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
    if (record.code !== "validation_error" && typeof record.message === "string" && record.message.trim()) {
      return record.message
    }
    const advice: Record<string, string> = {
      quota_exceeded: "存储空间不足，请释放空间或调整配额后重试",
      storage_reauthorization_required: "存储授权已失效，请重新授权后重试",
      storage_unavailable: "存储连接失败，请检查挂载状态后重试",
      rate_limited: "请求过于频繁，请稍后重试",
    }
    if (typeof record.code === "string" && advice[record.code]) return advice[record.code]
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
  return requestJsonInternal<T>(path, options, true)
}

export async function requestResponse(path: string, options: RequestOptions = {}) {
  return requestResponseInternal(path, options, true)
}

async function requestJsonInternal<T>(path: string, options: RequestOptions, allowRefresh: boolean): Promise<T> {
  const response = await requestResponseInternal(path, options, allowRefresh, "application/json")
  const rawText = await response.text()
  return (rawText ? parseMaybeJson(rawText) : null) as T
}

async function requestResponseInternal(
  path: string,
  options: RequestOptions,
  allowRefresh: boolean,
  accept = "*/*"
): Promise<Response> {
  const headers = new Headers(options.headers)

  if (options.body !== undefined && !headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json")
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", accept)
  }
  headers.set("X-Device-Fingerprint", getDeviceFingerprint())
  headers.set("X-Request-ID", globalThis.crypto?.randomUUID?.() ?? `web-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  const token = options.token ?? authRuntime.getAccessToken?.() ?? null
  if (token) {
    headers.set("Authorization", `Bearer ${token}`)
  }

  const url = resolveRequestUrl(path)
  const body = toRequestBody(options.body)
  const response = options.onUploadProgress && body instanceof FormData
    ? await uploadResponse(url, options.method ?? "POST", headers, body, options.signal, options.onUploadProgress)
    : await fetch(url, {
      method: options.method ?? "GET",
      headers,
      body,
      signal: options.signal,
      cache: options.cache,
      credentials: "include",
    })

  if (
    response.status === 401 &&
    allowRefresh &&
    !options.skipAuthRefresh &&
    !isAuthRoute(path)
  ) {
    const currentToken = authRuntime.getAccessToken?.() ?? null
    if (currentToken && currentToken !== token) {
      return requestResponseInternal(path, { ...options, token: currentToken }, true, accept)
    }

    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      const latestToken = authRuntime.getAccessToken?.() ?? refreshedToken
      return requestResponseInternal(path, { ...options, token: latestToken }, false, accept)
    }
    authRuntime.onAuthFailure?.()
  }

  if (!response.ok) {
    const rawText = await response.text()
    const payload = rawText ? parseMaybeJson(rawText) : null
    if (typeof window !== "undefined" && payload && typeof payload === "object" &&
        (payload as Record<string, unknown>).code === "storage_reauthorization_required") {
      window.dispatchEvent(new Event("cloudrave:storage-reauthorization"))
    }
    throw new ApiError(
      response.status,
      pickErrorMessage(payload, response.status),
      payload,
      parseRetryAfter(response.headers.get("Retry-After")),
      safeRequestId(response.headers.get("X-Request-ID"), payload),
      response.headers.get("X-Upload-Retryable") === "false" ? false : undefined
    )
  }

  return response
}

function safeRequestId(header: string | null, payload: unknown) {
  const fromBody = payload && typeof payload === "object" ? (payload as Record<string, unknown>).request_id : undefined
  for (const value of [header, fromBody]) {
    if (typeof value === "string" && /^[A-Za-z0-9._:-]{1,128}$/.test(value)) return value
  }
  return undefined
}

function uploadResponse(
  url: string,
  method: string,
  headers: Headers,
  body: FormData,
  signal: AbortSignal | undefined,
  onProgress: (loaded: number, total: number) => void
): Promise<Response> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const abort = () => xhr.abort()
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"))
      return
    }
    xhr.open(method, url)
    xhr.withCredentials = true
    headers.forEach((value, name) => xhr.setRequestHeader(name, value))
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded, event.total)
    }
    xhr.onload = () => {
      signal?.removeEventListener("abort", abort)
      const responseHeaders = new Headers()
      xhr.getAllResponseHeaders().trim().split(/[\r\n]+/).forEach((line) => {
        const index = line.indexOf(":")
        if (index > 0) responseHeaders.append(line.slice(0, index), line.slice(index + 1).trim())
      })
      resolve(new Response(xhr.status === 204 || xhr.status === 205 || xhr.status === 304 ? null : xhr.responseText, {
        status: xhr.status,
        statusText: xhr.statusText,
        headers: responseHeaders,
      }))
    }
    xhr.onerror = () => {
      signal?.removeEventListener("abort", abort)
      reject(new TypeError("上传时网络连接中断"))
    }
    xhr.onabort = () => {
      signal?.removeEventListener("abort", abort)
      reject(new DOMException("aborted", "AbortError"))
    }
    signal?.addEventListener("abort", abort, { once: true })
    xhr.send(body)
  })
}

function parseRetryAfter(value: string | null) {
  if (!value) return undefined

  const seconds = Number(value)
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.ceil(seconds * 1000)
  }

  const date = Date.parse(value)
  if (!Number.isFinite(date)) return undefined
  return Math.max(0, date - Date.now())
}

async function refreshAccessToken() {
  if (refreshInFlight) {
    return refreshInFlight
  }

  refreshInFlight = (async () => {
    try {
      return await authRuntime.refreshAccessToken?.() ?? null
    } finally {
      refreshInFlight = null
    }
  })()

  return refreshInFlight
}

function isAuthRoute(path: string) {
  return path.startsWith("/session/token")
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
