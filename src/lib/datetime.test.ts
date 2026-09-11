import assert from "node:assert/strict"
import test from "node:test"

import {
  formatDateTime,
  normalizeDateTime,
  toDateTimeLocalValue,
  zonedDateTimeToIso,
} from "./datetime"

test("bare database timestamps are interpreted as UTC", () => {
  assert.equal(normalizeDateTime("2026-09-10T00:00:00"), "2026-09-10T00:00:00.000Z")
  assert.equal(formatDateTime("2026-09-10T00:00:00", "Asia/Shanghai"), "2026-09-10 08:00:00")
})

test("one instant renders in the selected user timezone", () => {
  const instant = "2026-09-10T00:00:00Z"
  assert.equal(formatDateTime(instant, "Asia/Shanghai"), "2026-09-10 08:00:00")
  assert.equal(formatDateTime(instant, "Asia/Tokyo"), "2026-09-10 09:00:00")
  assert.equal(formatDateTime(instant, "America/New_York"), "2026-09-09 20:00:00")
})

test("datetime-local values round-trip through the selected timezone", () => {
  const iso = zonedDateTimeToIso("2026-09-10T09:30", "Asia/Tokyo")
  assert.equal(iso, "2026-09-10T00:30:00.000Z")
  assert.equal(toDateTimeLocalValue(iso, "Asia/Tokyo"), "2026-09-10T09:30")
})

test("daylight-saving offsets are applied by the IANA timezone", () => {
  assert.equal(
    zonedDateTimeToIso("2026-07-10T12:00", "America/New_York"),
    "2026-07-10T16:00:00.000Z"
  )
  assert.equal(
    zonedDateTimeToIso("2026-01-10T12:00", "America/New_York"),
    "2026-01-10T17:00:00.000Z"
  )
})

test("nonexistent daylight-saving wall times are rejected", () => {
  assert.equal(zonedDateTimeToIso("2026-03-08T02:30", "America/New_York"), null)
})
