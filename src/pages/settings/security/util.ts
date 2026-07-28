export function isPasskeyCanceled(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : ""
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  return (
    name === "AbortError" ||
    name === "NotAllowedError" ||
    message.includes("cancel") ||
    message.includes("aborted") ||
    message.includes("not allowed")
  )
}

export function normalizeToastDescription(title: string, description: string | undefined, fallback: string) {
  const cleaned = (description || "").trim()
  if (!cleaned) {
    return fallback
  }

  const normalizedTitle = title.replace(/\s+/g, "")
  const normalizedDescription = cleaned.replace(/\s+/g, "")
  if (
    normalizedDescription === normalizedTitle ||
    normalizedDescription === `${normalizedTitle}失败` ||
    normalizedDescription === `${normalizedTitle}成功`
  ) {
    return fallback
  }
  return cleaned
}
