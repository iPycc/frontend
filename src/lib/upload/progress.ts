export type PartProgressSnapshot = {
  uploadedBytes: number
  progress: number
  bytesPerSecond: number
}

// Progress events can fire dozens of times per second. Four visual updates per
// second are smooth enough while keeping large queues off the React hot path.
const UPDATE_INTERVAL = 250

export function trackParts(totalBytes: number, onUpdate: (snapshot: PartProgressSnapshot) => void) {
  const startedAt = Date.now()
  const committedByPart = new Map<number, number>()
  const inFlightByPart = new Map<number, number>()
  let highWaterBytes = 0
  let timer: number | null = null

  const emit = () => {
    timer = null
    const committedBytes = Array.from(committedByPart.values()).reduce((sum, value) => sum + value, 0)
    const inFlightBytes = Array.from(inFlightByPart.values()).reduce((sum, value) => sum + value, 0)
    const allCommitted = committedBytes >= totalBytes
    const visibleLimit = allCommitted ? totalBytes : Math.max(totalBytes - 1, 0)
    highWaterBytes = allCommitted
      ? totalBytes
      : Math.min(Math.max(highWaterBytes, committedBytes + inFlightBytes), visibleLimit)
    const elapsedSeconds = Math.max((Date.now() - startedAt) / 1000, 0.2)
    onUpdate({
      uploadedBytes: highWaterBytes,
      progress: totalBytes > 0 ? Math.min((highWaterBytes / totalBytes) * 100, 100) : 100,
      bytesPerSecond: highWaterBytes / elapsedSeconds,
    })
  }

  const schedule = () => {
    if (timer === null) {
      timer = window.setTimeout(emit, UPDATE_INTERVAL)
    }
  }

  const begin = (partNumber: number) => {
    if (!committedByPart.has(partNumber)) inFlightByPart.set(partNumber, 0)
  }

  const update = (partNumber: number, loaded: number) => {
    if (!committedByPart.has(partNumber)) inFlightByPart.set(partNumber, Math.max(0, loaded))
    schedule()
  }

  const commit = (partNumber: number, size: number) => {
    inFlightByPart.delete(partNumber)
    committedByPart.set(partNumber, Math.max(0, size))
    if (timer !== null) window.clearTimeout(timer)
    emit()
  }

  const dispose = () => {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
  }

  return { begin, update, commit, dispose }
}
