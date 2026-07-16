import * as React from "react"

import { getWebsiteSettings, type WebsiteSettings } from "@/api/site"

export const defaultWebsiteSettings: WebsiteSettings = {
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

export function useWebsiteSettings() {
  const [settings, setSettings] = React.useState<WebsiteSettings>(defaultWebsiteSettings)

  React.useEffect(() => {
    const controller = new AbortController()
    getWebsiteSettings(controller.signal)
      .then((response) => {
        setSettings({ ...defaultWebsiteSettings, ...response.settings })
      })
      .catch(() => {
        // Ignore failures; the footer simply won't render custom content.
      })
    return () => controller.abort()
  }, [])

  return settings
}
