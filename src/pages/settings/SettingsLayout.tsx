import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom"
import { IconChevronDown } from "@tabler/icons-react"
import { usePageTitle } from "@/hooks/use-page-title"
import { useIsMobile } from "@/hooks/use-mobile"
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
          ? "px-4 py-5"
          : "app-panel rounded-[15px] border border-[#dcdcdc] px-5 py-6 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:shadow-none sm:px-6"
      )}
    >
      <h1 className="text-[30px] font-semibold tracking-tight">设置</h1>

      <div className="mt-5 border-b border-border/60">
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

              return (
                <NavLink
                  key={item.id}
                  to={`/settings/${item.id}`}
                  className={({ isActive }) =>
                    cn(
                      "inline-flex items-center gap-2 border-b-2 border-transparent pb-3 text-sm transition-colors",
                      isActive
                        ? "border-primary text-primary"
                        : "text-muted-foreground hover:text-foreground"
                    )
                  }
                >
                  <Icon size={16} />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </div>
        )}
      </div>

      <div className={cn("custom-scrollbar mt-6 flex-1 overflow-y-auto", isMobile ? "pr-0" : "pr-1")}>
        <Outlet />
      </div>
    </div>
  )
}
