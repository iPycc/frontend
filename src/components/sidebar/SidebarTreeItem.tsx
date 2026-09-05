import type { ReactNode } from "react"
import { NavLink } from "react-router-dom"
import { cn } from "@/lib/utils"

export function SidebarTreeItem({
  to,
  active,
  children,
  className,
  toggle,
}: {
  to: string
  active?: boolean
  children: ReactNode
  className?: string
  toggle?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex h-9 items-center rounded-full pr-3 text-sm transition-colors",
        active
          ? "font-medium bg-nav-active-bg text-nav-active-fg hover:bg-nav-active-bg hover:text-nav-active-fg"
          : "text-foreground hover:bg-nav-hover-bg hover:text-foreground",
        className
      )}
    >
      <span
        className="flex h-full w-8 shrink-0 items-center justify-center"
        aria-hidden={toggle ? undefined : true}
      >
        {toggle}
      </span>
      <NavLink to={to} className="flex min-w-0 flex-1 items-center gap-3">
        {children}
      </NavLink>
    </div>
  )
}
