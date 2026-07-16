import { cn } from "@/lib/utils"
import { useWebsiteSettings } from "./useWebsiteSettings"

const FILING_LOGO_URL = "https://beian.mps.gov.cn/img/logo01.dd7ff50e.png"

export { useWebsiteSettings, FILING_LOGO_URL }

export function FilingLink({ className }: { className?: string }) {
  const settings = useWebsiteSettings()

  if (!settings.filing_enabled || !settings.filing_text) {
    return null
  }

  const code = settings.filing_text.trim()
  const queryUrl = `https://beian.mps.gov.cn/#/query/webSearch?code=${encodeURIComponent(code)}`

  return (
    <a
      href={queryUrl}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "inline-flex items-center justify-center gap-2 text-sm text-muted-foreground transition-colors hover:text-foreground",
        className
      )}
    >
      <img
        src={FILING_LOGO_URL}
        alt="备案"
        className="h-4 w-auto opacity-80"
      />
      <span>{settings.filing_text}</span>
    </a>
  )
}

export function FilingBar({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center py-3", className)}>
      <FilingLink />
    </div>
  )
}
