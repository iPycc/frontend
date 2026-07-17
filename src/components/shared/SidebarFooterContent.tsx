import { cn } from "@/lib/utils"
import { useWebsiteSettings } from "./useWebsiteSettings"

const FILING_LOGO_URL = "./beian.png"

export function SidebarFooterContent({ className }: { className?: string }) {
  const settings = useWebsiteSettings()

  const showFooter = settings.footer_enabled && settings.footer_html
  const showFiling = settings.filing_enabled && settings.filing_text

  if (!showFooter && !showFiling) {
    return null
  }

  const code = settings.filing_text?.trim() ?? ""
  const queryUrl = code ? `https://beian.mps.gov.cn/#/query/webSearch?code=${encodeURIComponent(code)}` : "#"

  return (
    <div className={cn("space-y-2.5 border-t border-border/60 pt-3 pb-1", className)}>
      {showFooter ? (
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-center text-xs text-muted-foreground"
          dangerouslySetInnerHTML={{ __html: settings.footer_html }}
        />
      ) : null}
      {showFiling ? (
        <div className="flex justify-center">
          <a
            href={queryUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <img src={FILING_LOGO_URL} alt="备案" className="h-4 w-auto opacity-80" />
            <span>{settings.filing_text}</span>
          </a>
        </div>
      ) : null}
    </div>
  )
}
