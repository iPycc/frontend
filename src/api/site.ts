import { requestJson } from "@/api/client"

export type WebsiteSettings = {
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
