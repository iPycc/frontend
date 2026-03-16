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
        "flex h-8 items-center rounded-full pr-3 text-[15px] transition-colors",
        active
          ? "bg-[#cfe7f9] text-[#1d3040] hover:bg-[#c1def4] hover:text-[#1d3040] dark:bg-[#18384d] dark:text-[#eef6ff] dark:hover:bg-[#21455f] dark:hover:text-[#eef6ff]"
          : "text-[#404040] hover:bg-[#edf3f8] hover:text-[#1f2c39] dark:text-[#b9b9b9] dark:hover:bg-[#23282f] dark:hover:text-[#f1f1f1]",
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
