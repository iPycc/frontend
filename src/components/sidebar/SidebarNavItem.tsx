import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"
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
    <NavLink
      to={to}
      className={cn(
        "flex h-9 items-center gap-3 rounded-full px-8 text-sm text-foreground transition-colors hover:bg-nav-hover-bg hover:text-foreground",
        active
          ? "bg-nav-active-bg text-nav-active-fg hover:bg-nav-active-bg hover:text-nav-active-fg"
          : "",
        className
      )}
    >
      {children}
    </NavLink>
  )
}
