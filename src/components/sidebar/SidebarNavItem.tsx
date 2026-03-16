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
        "flex h-9 items-center gap-3 rounded-full px-8 text-[15px] text-[#303030] transition-colors hover:bg-[#ebf2f8] hover:text-[#1f2c39] dark:text-[#c1c1c1] dark:hover:bg-[#23282f] dark:hover:text-[#f1f1f1]",
        active
          ? "bg-[#cfe7f9] text-[#1d3040] hover:bg-[#c1def4] hover:text-[#1d3040] dark:bg-[#18384d] dark:text-[#eef6ff] dark:hover:bg-[#21455f] dark:hover:text-[#eef6ff]"
          : "",
        className
      )}
    >
      {children}
    </NavLink>
  )
}
