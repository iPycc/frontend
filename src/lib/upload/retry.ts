import { ApiError } from "@/api/client"

const RETRIES = 3

export async function retryPart<T>(
  task: (attempt: number) => Promise<T>,
  signal: AbortSignal,
  attempts = RETRIES
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (signal.aborted) throw new DOMException("aborted", "AbortError")
    try {
      return await task(attempt)
    } catch (error) {
      lastError = error
      const maxAttempts = retryLimit(error, attempts)
      if (attempt + 1 >= maxAttempts || !retryable(error)) throw error
      await wait(retryDelay(attempt), signal)
    }
  }
  throw lastError
}

export async function retryRateLimited<T>(
  task: () => Promise<T>,
  signal: AbortSignal,
  attempts = RETRIES
): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    if (signal.aborted) throw new DOMException("aborted", "AbortError")
    try {
      return await task()
    } catch (error) {
      lastError = error
      if (!(error instanceof ApiError) || error.status !== 429 || attempt + 1 >= attempts) {
        throw error
      }
      await wait(retryDelay(attempt), signal)
    }
  }
  throw lastError
}

function retryDelay(attempt: number) {
  return 500 * 2 ** attempt
}

function retryLimit(error: unknown, fallback: number) {
  if (error && typeof error === "object" && "maxAttempts" in error && typeof error.maxAttempts === "number") {
    return Math.max(1, Math.min(fallback, Math.floor(error.maxAttempts)))
  }
  return fallback
}

function retryable(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return false
  if (error && typeof error === "object" && "retryable" in error && typeof error.retryable === "boolean") {
    return error.retryable
  }
  if (error instanceof ApiError) {
    return error.status === 408 || error.status === 425 || error.status === 429 || error.status >= 500
  }
  return true
}

function wait(delay: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("aborted", "AbortError"))
      return
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener("abort", abort)
      resolve()
    }, delay)
    const abort = () => {
      window.clearTimeout(timer)
      reject(new DOMException("aborted", "AbortError"))
    }
    signal.addEventListener("abort", abort, { once: true })
  })
}
