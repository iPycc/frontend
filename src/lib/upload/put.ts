import type { UploadPartPlan } from "@/api/uploads"

export class UploadHttpError extends Error {
  readonly status: number
  readonly retryable: boolean
  readonly maxAttempts: number | undefined

  constructor(status: number) {
    super(`上传分片失败 (${status})`)
    this.name = "UploadHttpError"
    this.status = status
    this.retryable = status === 403 || status === 408 || status === 425 || status === 429 || status >= 500
    this.maxAttempts = status === 403 ? 2 : undefined
  }
}

const BROWSER_MANAGED_HEADERS = new Set([
  "connection",
  "content-length",
  "cookie",
  "host",
  "origin",
  "referer",
  "user-agent",
])

export function putPart(
  plan: UploadPartPlan,
  chunk: Blob,
  signal: AbortSignal,
  onProgress?: (loaded: number) => void
) {
  return new Promise<string | null>((resolve, reject) => {
    if (plan.response_mode === "skip") {
      onProgress?.(chunk.size)
      resolve(plan.record_etag ?? `part-${plan.part_number}`)
      return
    }
    const request = new XMLHttpRequest()
    const opaqueResponse = plan.response_mode === "opaque"
    let settled = false

    const cleanup = () => signal.removeEventListener("abort", abort)
    const finish = (task: () => void) => {
      if (settled) return
      settled = true
      cleanup()
      task()
    }
    const abort = () => request.abort()

    try {
      request.open(plan.method, plan.url, true)
      Object.entries(plan.headers).forEach(([name, value]) => {
        if (!BROWSER_MANAGED_HEADERS.has(name.toLowerCase())) request.setRequestHeader(name, value)
      })
    } catch (error) {
      const setupError = new Error(error instanceof Error ? error.message : "无法初始化分片上传")
      Object.assign(setupError, { retryable: false })
      finish(() => reject(setupError))
      return
    }
    const trackProgress = (event: ProgressEvent) => {
      onProgress?.(Math.min(event.loaded, chunk.size))
    }
    if (!opaqueResponse) request.upload.onprogress = trackProgress
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        if (opaqueResponse) {
          onProgress?.(chunk.size)
          finish(() => resolve(plan.record_etag ?? `part-${plan.part_number}`))
          return
        }
        if (plan.response_mode === "wopan_json") {
          try {
            const payload = JSON.parse(request.responseText) as {
              code?: string
              msg?: string
              data?: { fid?: string }
            }
            if (String(payload.code ?? "") !== "0000") {
              const error = new Error(payload.msg || "联通云盘拒绝了上传分片")
              Object.assign(error, { retryable: false })
              finish(() => reject(error))
              return
            }
            const fid = String(payload.data?.fid ?? "")
            finish(() => resolve(fid ? `remote:${fid}` : (plan.record_etag ?? `part-${plan.part_number}`)))
            return
          } catch {
            const error = new Error("联通云盘上传响应无法解析")
            Object.assign(error, { retryable: false })
            finish(() => reject(error))
            return
          }
        }
        finish(() => resolve(plan.record_etag ?? request.getResponseHeader("ETag")))
        return
      }
      finish(() => reject(new UploadHttpError(request.status)))
    }
    request.onerror = () => {
      if (opaqueResponse && !signal.aborted) {
        // WoPan accepts a simple multipart POST but omits Access-Control-Allow-Origin,
        // so Chromium reports status 0 after sending the bytes. Completion is
        // verified against the provider's file list before Cloudrave creates a node.
        onProgress?.(chunk.size)
        finish(() => resolve(plan.record_etag ?? `part-${plan.part_number}`))
        return
      }
      const error = new Error(
        plan.body_mode === "multipart" || plan.record_etag
          ? "运营商上传地址不可达或被浏览器跨域策略拦截，未经过 Cloudrave 中转"
          : "上传分片时网络连接中断"
      )
      Object.assign(error, { retryable: true })
      finish(() => reject(error))
    }
    request.onabort = () => finish(() => reject(new DOMException("aborted", "AbortError")))

    if (signal.aborted) {
      finish(() => reject(new DOMException("aborted", "AbortError")))
      return
    }
    signal.addEventListener("abort", abort, { once: true })
    try {
      if (plan.body_mode === "multipart") {
        const form = new FormData()
        Object.entries(plan.form_fields ?? {}).forEach(([name, value]) => form.set(name, value))
        form.set(plan.file_field || "file", chunk, plan.form_fields?.fileName || "upload.bin")
        request.send(form)
        if (opaqueResponse) {
          // Registering an XMLHttpRequest upload listener before send() makes a
          // cross-origin request non-simple and triggers an OPTIONS preflight.
          // WoPan rejects that preflight, so attach immediately after send().
          request.upload.onprogress = trackProgress
        }
      } else {
        request.send(chunk)
      }
    } catch (error) {
      const sendError = new Error(error instanceof Error ? error.message : "无法发送分片")
      Object.assign(sendError, { retryable: false })
      finish(() => reject(sendError))
    }
  })
}
