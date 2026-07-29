import type { SortValue, ViewMode } from "@/lib/models"

const STORAGE_KEY = "cloudrave.file-view-preferences.v1"

export type FileViewPreferences = {
  viewMode: ViewMode
  sortValue: SortValue
  pageSize: number
}

const DEFAULT_PREFERENCES: FileViewPreferences = {
  viewMode: "grid",
  sortValue: "name-asc",
  pageSize: 200,
}

const VIEW_MODES = new Set<ViewMode>(["grid", "list", "gallery"])
const SORT_VALUES = new Set<SortValue>(["updated-desc", "updated-asc", "name-asc", "name-desc", "size-desc"])

export function loadFileViewPreferences(): FileViewPreferences {
  if (typeof window === "undefined") return DEFAULT_PREFERENCES

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PREFERENCES
    const value = JSON.parse(raw) as Partial<FileViewPreferences>
    return {
      viewMode: value.viewMode && VIEW_MODES.has(value.viewMode) ? value.viewMode : DEFAULT_PREFERENCES.viewMode,
      sortValue: value.sortValue && SORT_VALUES.has(value.sortValue) ? value.sortValue : DEFAULT_PREFERENCES.sortValue,
      pageSize: typeof value.pageSize === "number"
        ? Math.min(2000, Math.max(50, Math.round(value.pageSize)))
        : DEFAULT_PREFERENCES.pageSize,
    }
  } catch {
    return DEFAULT_PREFERENCES
  }
}

export function saveFileViewPreferences(value: FileViewPreferences) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
}
