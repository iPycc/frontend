import { requestJson } from "@/api/client"

export type WebsiteSettings = {
  site_url: string
  site_title: string
  site_logo_url: string
  site_description: string
  site_theme: string
  site_font: string
  site_border_radius: string
  footer_enabled: boolean
  footer_html: string
  filing_enabled: boolean
  filing_text: string
}

export type WebsiteSettingsResponse = {
  settings: WebsiteSettings
}

export type DetectedSiteUrlResponse = {
  site_url: string
}

export type SiteUrlStatusResponse = {
  saved_site_url: string
  detected_site_url: string
  matches: boolean
}

export async function getWebsiteSettings(signal?: AbortSignal) {
  return requestJson<WebsiteSettingsResponse>("/site/settings", { signal })
}

export async function updateWebsiteSettings(token: string, settings: WebsiteSettings) {
  return requestJson<WebsiteSettingsResponse>("/site/settings", {
    method: "PUT",
    token,
    body: settings,
  })
}

export async function getDetectedSiteUrl(signal?: AbortSignal) {
  return requestJson<DetectedSiteUrlResponse>("/site/detected-url", { signal })
}

export async function getSiteUrlStatus(token: string, signal?: AbortSignal) {
  return requestJson<SiteUrlStatusResponse>("/site/url-status", {
    token,
    signal,
  })
}

export async function updateSiteUrl(token: string, siteUrl: string) {
  return requestJson<WebsiteSettingsResponse>("/site/settings", {
    method: "PUT",
    token,
    body: { site_url: siteUrl },
  })
}
