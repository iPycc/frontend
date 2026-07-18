import * as React from "react"

import { getWebsiteSettings, type WebsiteSettings } from "@/api/site"

const WEBSITE_SETTINGS_CACHE_KEY = "cloudrave.website-settings.v1"

export const defaultWebsiteSettings: WebsiteSettings = {
  site_url: "",
  site_title: "",
  site_logo_url: "",
  site_description: "",
  site_theme: "",
  site_font: "",
  site_border_radius: "0.75rem",
  footer_enabled: true,
  footer_html: "",
  filing_enabled: false,
  filing_text: "",
}

function normalizeWebsiteSettings(settings: Partial<WebsiteSettings>): WebsiteSettings {
  return { ...defaultWebsiteSettings, ...settings }
}

function readCachedWebsiteSettings(): WebsiteSettings {
  if (typeof window === "undefined") {
    return defaultWebsiteSettings
  }

  try {
    const cached = window.localStorage.getItem(WEBSITE_SETTINGS_CACHE_KEY)
    if (!cached) {
      return defaultWebsiteSettings
    }

    const parsed = JSON.parse(cached) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return defaultWebsiteSettings
    }

    return normalizeWebsiteSettings(parsed as Partial<WebsiteSettings>)
  } catch {
    return defaultWebsiteSettings
  }
}

let websiteSettingsSnapshot = readCachedWebsiteSettings()
let websiteSettingsRequest: Promise<WebsiteSettings> | null = null
const websiteSettingsListeners = new Set<() => void>()

function emitWebsiteSettingsChange() {
  websiteSettingsListeners.forEach((listener) => listener())
}

function subscribeToWebsiteSettings(listener: () => void) {
  websiteSettingsListeners.add(listener)
  return () => websiteSettingsListeners.delete(listener)
}

function getWebsiteSettingsSnapshot() {
  return websiteSettingsSnapshot
}

export function cacheWebsiteSettings(settings: Partial<WebsiteSettings>) {
  websiteSettingsSnapshot = normalizeWebsiteSettings(settings)

  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(
        WEBSITE_SETTINGS_CACHE_KEY,
        JSON.stringify(websiteSettingsSnapshot),
      )
    } catch {
      // Storage can be unavailable in private browsing or restricted environments.
    }
  }

  emitWebsiteSettingsChange()
  return websiteSettingsSnapshot
}

export function getSiteUrl(): string {
  if (typeof window === "undefined") {
    return ""
  }
  return websiteSettingsSnapshot.site_url.trim() || window.location.origin
}

function refreshWebsiteSettings() {
  if (!websiteSettingsRequest) {
    websiteSettingsRequest = getWebsiteSettings()
      .then((response) => cacheWebsiteSettings(response.settings))
      .finally(() => {
        websiteSettingsRequest = null
      })
  }

  return websiteSettingsRequest
}

export function useWebsiteSettings() {
  const settings = React.useSyncExternalStore(
    subscribeToWebsiteSettings,
    getWebsiteSettingsSnapshot,
    () => defaultWebsiteSettings,
  )

  React.useEffect(() => {
    void refreshWebsiteSettings().catch(() => {
      // Keep the last successful snapshot when the refresh fails.
    })
  }, [])

  return settings
}
