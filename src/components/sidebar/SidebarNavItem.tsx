import type { ReactNode } from "react"
import { Link } from "react-router-dom"
import { cn } from "@/lib/utils"

export function SidebarNavItem({
  to,
  active,
  children,
  className,
}: {
  to: string
  active?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      data-ripple
      className={cn(
        "relative flex h-9 items-center gap-3 overflow-hidden rounded-full px-8 text-sm text-foreground transition-colors hover:bg-nav-hover-bg hover:text-foreground",
        active
          ? "font-medium bg-nav-active-bg text-nav-active-fg hover:bg-nav-active-bg hover:text-nav-active-fg"
          : "[&>svg]:text-muted-foreground",
        className
      )}
    >
      {children}
    </Link>
  )
}
