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

export function putPart(
  plan: UploadPartPlan,
  chunk: Blob,
  signal: AbortSignal,
  onProgress?: (loaded: number) => void
) {
  return new Promise<string | null>((resolve, reject) => {
    const request = new XMLHttpRequest()
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
      Object.entries(plan.headers).forEach(([name, value]) => request.setRequestHeader(name, value))
    } catch (error) {
      const setupError = new Error(error instanceof Error ? error.message : "无法初始化分片上传")
      Object.assign(setupError, { retryable: false })
      finish(() => reject(setupError))
      return
    }
    request.upload.onprogress = (event) => {
      onProgress?.(Math.min(event.loaded, chunk.size))
    }
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        finish(() => resolve(request.getResponseHeader("ETag")))
        return
      }
      finish(() => reject(new UploadHttpError(request.status)))
    }
    request.onerror = () => {
      const error = new Error("上传分片时网络连接中断")
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
      request.send(chunk)
    } catch (error) {
      const sendError = new Error(error instanceof Error ? error.message : "无法发送分片")
      Object.assign(sendError, { retryable: false })
      finish(() => reject(sendError))
    }
  })
}
