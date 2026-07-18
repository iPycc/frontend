// A file fans out into several API calls. Keeping this low prevents a large
// folder selection from turning into a burst of upload-session requests.
export const FILE_LIMIT = 2
export const NETWORK_LIMIT = 3
const PART_LIMIT = 3

export function partLimit(requested: number) {
  return Math.max(1, Math.min(PART_LIMIT, Math.floor(requested || 1)))
}

export function takeUploads(pending: string[], active: Set<string>, limit = FILE_LIMIT) {
  const selected: string[] = []
  while (active.size + selected.length < limit && pending.length > 0) {
    const id = pending.shift()
    if (id && !active.has(id) && !selected.includes(id)) {
      selected.push(id)
    }
  }
  return selected
}
