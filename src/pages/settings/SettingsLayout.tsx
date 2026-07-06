import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { IconChevronDown } from "@tabler/icons-react"
import { motion } from "motion/react"

import { useIsMobile } from "@/hooks/use-mobile"
import { usePageTitle } from "@/hooks/use-page-title"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { settingsTabs } from "./shared"

export function SettingsLayout() {
  usePageTitle("设置")
  const location = useLocation()
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const currentTab =
    settingsTabs.find((item) => location.pathname.endsWith(`/${item.id}`)) ??
    settingsTabs[0]
  const CurrentTabIcon = currentTab.icon
  const moreTabs = settingsTabs.filter((item) => item.id !== currentTab.id)

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col overflow-hidden",
        isMobile
          ? "flex min-h-0 flex-1 flex-col gap-2 overflow-hidden px-2 pb-3"
          : "app-panel rounded-xl border border-border px-5 py-6 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:shadow-none sm:px-6"
      )}
    >
      <h1 className="text-2xl font-semibold tracking-tight">设置</h1>

      <div className="mt-2 border-b border-border/60">
        {isMobile ? (
          <div className="flex items-center gap-5">
            <NavLink
              to={`/settings/${currentTab.id}`}
              className="inline-flex items-center gap-2 border-b-2 border-primary pb-3 text-sm text-primary"
            >
              <CurrentTabIcon size={16} />
              <span>{currentTab.label}</span>
            </NavLink>

            {moreTabs.length > 0 ? (
              <DropdownMenu>
                <DropdownMenuTrigger className="inline-flex items-center gap-1 pb-3 text-sm text-muted-foreground transition-colors hover:text-foreground">
                  更多
                  <IconChevronDown size={14} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48">
                  {moreTabs.map((item) => {
                    const Icon = item.icon

                    return (
                      <DropdownMenuItem
                        key={item.id}
                        onClick={() => navigate(`/settings/${item.id}`)}
                      >
                        <Icon size={16} />
                        <span>{item.label}</span>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap gap-6">
            {settingsTabs.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname.endsWith(`/${item.id}`)

              return (
                <NavLink
                  key={item.id}
                  to={`/settings/${item.id}`}
                  className={cn(
                    "relative inline-flex items-center gap-2 pb-3 text-sm transition-colors",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                  {isActive ? (
                    <motion.div
                      layoutId="settings-tab-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary"
                      transition={{ type: "spring", stiffness: 500, damping: 40 }}
                    />
                  ) : null}
                </NavLink>
              )
            })}
          </div>
        )}
      </div>

      <div className={cn("custom-scrollbar mt-6 flex-1 overflow-y-auto", isMobile ? "pr-4" : "pr-6")}>
        <Outlet />
      </div>
    </div>
  )
}
