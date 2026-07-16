import * as React from "react"

import { getWebsiteSettings, type WebsiteSettings } from "@/api/site"

const defaultSettings: WebsiteSettings = {
  site_title: "",
  site_logo_url: "",
  site_description: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  site_theme: "",
  site_font: "",
  site_border_radius: "0.75rem",
  footer_enabled: true,
  footer_html: "",
  filing_enabled: false,
  filing_text: "",
}

export function SiteFooter() {
  const [settings, setSettings] = React.useState<WebsiteSettings>(defaultSettings)

  React.useEffect(() => {
    const controller = new AbortController()
    getWebsiteSettings(controller.signal)
      .then((response) => {
        setSettings({ ...defaultSettings, ...response.settings })
      })
      .catch(() => {
        // Ignore failures; the footer simply won't render custom content.
      })
    return () => controller.abort()
  }, [])

  const showFooter = settings.footer_enabled && (settings.footer_html || settings.filing_enabled)
  const showFiling = settings.filing_enabled && settings.filing_text

  if (!showFooter && !showFiling) {
    return null
  }

  return (
    <footer className="shrink-0 border-t border-border/60 bg-background/95">
      {showFooter ? (
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          {settings.footer_html ? (
            <div
              className="max-w-none text-sm text-muted-foreground"
              dangerouslySetInnerHTML={{ __html: settings.footer_html }}
            />
          ) : null}
        </div>
      ) : null}
      {showFiling ? (
        <div className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/60 bg-background/95 py-2 text-center text-xs text-muted-foreground">
          {settings.filing_text}
        </div>
      ) : null}
    </footer>
  )
}
