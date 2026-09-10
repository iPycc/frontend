export type DateTimeValue = string | number | Date | null | undefined

const ISO_WITHOUT_OFFSET = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,6})?)?$/

export function getSystemTimeZone() {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
    if (timezone) {
      new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format()
      return timezone
    }
  } catch {
    // Fall through to the universal default.
  }
  return "UTC"
}

export function parseDateTime(value: DateTimeValue): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : new Date(value.getTime())
  }
  if (typeof value === "number") {
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value !== "string" || !value.trim()) return null

  const trimmed = value.trim()
  // Cloudrave has always stored database timestamps in UTC. Older SQLite and
  // MySQL responses omitted the offset, so retain backwards compatibility by
  // interpreting a bare API timestamp as UTC instead of browser-local time.
  const normalized = ISO_WITHOUT_OFFSET.test(trimmed)
    ? `${trimmed.replace(" ", "T")}Z`
    : trimmed
  const date = new Date(normalized)
  return Number.isNaN(date.getTime()) ? null : date
}

export function normalizeDateTime(value: DateTimeValue) {
  const date = parseDateTime(value)
  if (date) return date.toISOString()
  return typeof value === "string" ? value : ""
}

function zonedParts(date: Date, timezone: string, includeSeconds: boolean) {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    ...(includeSeconds ? { second: "2-digit" as const } : {}),
    hourCycle: "h23",
  }).formatToParts(date)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: includeSeconds ? get("second") : 0,
  }
}

export function formatDateTime(value: DateTimeValue, timezone = getSystemTimeZone()) {
  const date = parseDateTime(value)
  if (!date) return typeof value === "string" && value ? value : "-"

  try {
    const parts = zonedParts(date, timezone, true)
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")} ${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}:${String(parts.second).padStart(2, "0")}`
  } catch {
    return formatDateTime(date, getSystemTimeZone())
  }
}

export function formatDate(value: DateTimeValue, timezone = getSystemTimeZone()) {
  const date = parseDateTime(value)
  if (!date) return typeof value === "string" && value ? value : "-"
  try {
    const parts = zonedParts(date, timezone, false)
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}`
  } catch {
    return formatDate(date, getSystemTimeZone())
  }
}

export function formatTimeZoneOffset(timezone: string, at = new Date()) {
  try {
    const part = new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    }).formatToParts(at).find((item) => item.type === "timeZoneName")?.value
    if (!part || part === "GMT") return "UTC"
    return part.replace("GMT", "UTC")
  } catch {
    return timezone
  }
}

export function toDateTimeLocalValue(value: DateTimeValue, timezone: string) {
  const date = parseDateTime(value)
  if (!date) return ""
  try {
    const parts = zonedParts(date, timezone, false)
    return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}T${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`
  } catch {
    return ""
  }
}

export function zonedDateTimeToIso(value: string, timezone: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(value)
  if (!match) return null
  const desired = {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  }
  const desiredAsUtc = Date.UTC(
    desired.year,
    desired.month - 1,
    desired.day,
    desired.hour,
    desired.minute,
    desired.second
  )
  let candidate = desiredAsUtc

  try {
    // Intl has no direct wall-clock-to-instant conversion. Iterating the
    // observed offset handles ordinary zones as well as daylight-saving dates.
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const observed = zonedParts(new Date(candidate), timezone, true)
      const observedAsUtc = Date.UTC(
        observed.year,
        observed.month - 1,
        observed.day,
        observed.hour,
        observed.minute,
        observed.second
      )
      const correction = desiredAsUtc - observedAsUtc
      candidate += correction
      if (correction === 0) break
    }

    const finalParts = zonedParts(new Date(candidate), timezone, true)
    if (Object.keys(desired).some((key) => (
      finalParts[key as keyof typeof finalParts] !== desired[key as keyof typeof desired]
    ))) {
      return null
    }
    return new Date(candidate).toISOString()
  } catch {
    return null
  }
}
