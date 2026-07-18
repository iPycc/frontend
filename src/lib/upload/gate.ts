export function createGate(limit: number) {
  const capacity = Math.max(1, Math.floor(limit))
  const queue: Array<{
    resolve: () => void
    reject: (error: unknown) => void
    signal: AbortSignal
    abort: () => void
  }> = []
  let active = 0

  const drain = () => {
    while (active < capacity && queue.length > 0) {
      const waiter = queue.shift()
      if (!waiter) return
      waiter.signal.removeEventListener("abort", waiter.abort)
      if (waiter.signal.aborted) {
        waiter.reject(new DOMException("aborted", "AbortError"))
        continue
      }
      active += 1
      waiter.resolve()
    }
  }

  const acquire = (signal: AbortSignal) => {
    if (signal.aborted) return Promise.reject(new DOMException("aborted", "AbortError"))
    if (active < capacity) {
      active += 1
      return Promise.resolve()
    }
    return new Promise<void>((resolve, reject) => {
      const waiter = {
        resolve,
        reject,
        signal,
        abort: () => {
          const index = queue.indexOf(waiter)
          if (index >= 0) queue.splice(index, 1)
          reject(new DOMException("aborted", "AbortError"))
        },
      }
      queue.push(waiter)
      signal.addEventListener("abort", waiter.abort, { once: true })
    })
  }

  const run = async <T>(task: () => Promise<T>, signal: AbortSignal) => {
    await acquire(signal)
    try {
      if (signal.aborted) throw new DOMException("aborted", "AbortError")
      return await task()
    } finally {
      active -= 1
      drain()
    }
  }

  return { run }
}
