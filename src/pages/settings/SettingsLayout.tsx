import { NavLink, Outlet } from "react-router-dom"
import { usePageTitle } from "@/hooks/use-page-title"
import { cn } from "@/lib/utils"
import { settingsTabs } from "./shared"

export function SettingsLayout() {
  usePageTitle("设置")
  return (
    <div className="app-panel flex h-full min-h-0 flex-1 flex-col overflow-hidden rounded-[15px] px-5 py-6 sm:px-6">
      <h1 className="text-[30px] font-semibold tracking-tight">设置</h1>

      <div className="mt-5 border-b border-border/60">
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
      </div>

      <div className="custom-scrollbar mt-6 flex-1 overflow-y-auto pr-1">
        <Outlet />
      </div>
    </div>
  )
}
