export type PartProgressSnapshot = {
  uploadedBytes: number
  progress: number
  bytesPerSecond: number
  awaitingConfirmation: boolean
}

// Progress events can fire dozens of times per second. Four visual updates per
// second are smooth enough while keeping large queues off the React hot path.
const UPDATE_INTERVAL = 250

export function trackParts(
  totalBytes: number,
  onUpdate: (snapshot: PartProgressSnapshot) => void,
  initialParts: Array<{ partNumber: number; size: number }> = []
) {
  const committedByPart = new Map<number, number>(
    initialParts.map((part) => [part.partNumber, Math.max(0, part.size)])
  )
  const inFlightByPart = new Map<number, number>()
  const sizeByPart = new Map<number, number>()
  const awaitingByPart = new Set<number>()
  const samples: Array<{ at: number; bytes: number }> = []
  let timer: number | null = null

  const emit = () => {
    timer = null
    const committedBytes = Array.from(committedByPart.values()).reduce((sum, value) => sum + value, 0)
    const inFlightBytes = Array.from(inFlightByPart.values()).reduce((sum, value) => sum + value, 0)
    const allCommitted = committedBytes >= totalBytes
    const visibleLimit = allCommitted ? totalBytes : Math.max(totalBytes - 1, 0)
    const uploadedBytes = allCommitted
      ? totalBytes
      : Math.min(committedBytes + inFlightBytes, visibleLimit)
    const now = Date.now()
    while (samples.length && samples[0].at <= now - 3000) samples.shift()
    const awaitingConfirmation = inFlightByPart.size > 0 && awaitingByPart.size === inFlightByPart.size
    const bytesPerSecond = inFlightByPart.size && !awaitingConfirmation
      ? samples.reduce((sum, sample) => sum + sample.bytes, 0) / 3
      : 0
    onUpdate({
      uploadedBytes,
      progress: totalBytes > 0 ? Math.min((uploadedBytes / totalBytes) * 100, 100) : 100,
      bytesPerSecond,
      awaitingConfirmation,
    })
    if (samples.length) schedule()
  }

  const schedule = () => {
    if (timer === null) {
      timer = window.setTimeout(emit, UPDATE_INTERVAL)
    }
  }

  const begin = (partNumber: number, size: number) => {
    if (!committedByPart.has(partNumber)) {
      inFlightByPart.set(partNumber, 0)
      sizeByPart.set(partNumber, Math.max(0, size))
      awaitingByPart.delete(partNumber)
    }
  }

  const update = (partNumber: number, loaded: number) => {
    if (!committedByPart.has(partNumber)) {
      const previous = inFlightByPart.get(partNumber) ?? 0
      const next = Math.max(0, loaded)
      if (next > previous) samples.push({ at: Date.now(), bytes: next - previous })
      inFlightByPart.set(partNumber, next)
      const size = sizeByPart.get(partNumber)
      if (size !== undefined && size > 0 && next >= size) awaitingByPart.add(partNumber)
      else awaitingByPart.delete(partNumber)
    }
    schedule()
  }

  const commit = (partNumber: number, size: number) => {
    inFlightByPart.delete(partNumber)
    sizeByPart.delete(partNumber)
    awaitingByPart.delete(partNumber)
    committedByPart.set(partNumber, Math.max(0, size))
    if (timer !== null) window.clearTimeout(timer)
    emit()
  }

  const discard = (partNumber: number) => {
    inFlightByPart.delete(partNumber)
    sizeByPart.delete(partNumber)
    awaitingByPart.delete(partNumber)
    if (timer !== null) window.clearTimeout(timer)
    emit()
  }

  const dispose = () => {
    if (timer !== null) window.clearTimeout(timer)
    timer = null
  }

  return { begin, update, commit, discard, dispose }
}
