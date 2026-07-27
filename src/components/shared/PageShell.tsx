import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageShell({
  title,
  description,
  action,
  className,
  contentClassName,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  className?: string
  contentClassName?: string
  children: ReactNode
}) {
  return (
    <div className={cn("app-panel flex-1 rounded-xl border border-border/60 p-5 shadow-sm", className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-base font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className={cn("mt-5", contentClassName)}>{children}</div>
    </div>
  )
}
