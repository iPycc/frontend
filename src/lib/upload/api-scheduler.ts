type QueuedRequest<T> = {
  task: () => Promise<T>
  signal: AbortSignal
  resolve: (value: T) => void
  reject: (error: unknown) => void
  abort: () => void
}

type PendingRequest = QueuedRequest<unknown>

export function createUploadApiScheduler({
  concurrency = 2,
  minIntervalMs = 100,
}: {
  concurrency?: number
  minIntervalMs?: number
} = {}) {
  const capacity = Math.max(1, Math.floor(concurrency))
  const interval = Math.max(0, Math.floor(minIntervalMs))
  const queue: PendingRequest[] = []
  let active = 0
  let nextStartAt = 0
  let timer: ReturnType<typeof setTimeout> | undefined

  const scheduleDrain = (delay: number) => {
    if (timer) return
    timer = setTimeout(() => {
      timer = undefined
      drain()
    }, delay)
  }

  const drain = () => {
    if (active >= capacity || queue.length === 0) return

    const now = Date.now()
    const waitMs = nextStartAt - now
    if (waitMs > 0) {
      scheduleDrain(waitMs)
      return
    }

    const request = queue.shift()
    if (!request) return
    request.signal.removeEventListener("abort", request.abort)
    if (request.signal.aborted) {
      request.reject(new DOMException("aborted", "AbortError"))
      drain()
      return
    }

    active += 1
    nextStartAt = Date.now() + interval
    void request.task()
      .then(request.resolve)
      .catch(request.reject)
      .finally(() => {
        active -= 1
        drain()
      })

    if (active < capacity) drain()
  }

  const run = <T>(task: () => Promise<T>, signal: AbortSignal) => {
    if (signal.aborted) {
      return Promise.reject<T>(new DOMException("aborted", "AbortError"))
    }

    return new Promise<T>((resolve, reject) => {
      const request: QueuedRequest<T> = {
        task,
        signal,
        resolve,
        reject,
        abort: () => {
          const index = queue.indexOf(request as PendingRequest)
          if (index >= 0) queue.splice(index, 1)
          reject(new DOMException("aborted", "AbortError"))
        },
      }
      queue.push(request as PendingRequest)
      signal.addEventListener("abort", request.abort, { once: true })
      drain()
    })
  }

  return { run }
}
