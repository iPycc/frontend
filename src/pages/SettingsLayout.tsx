import { Link, Outlet, useLocation, useNavigate } from "react-router-dom"
import { IconDotsVertical } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const tabs = [
  { href: "/settings/profile", label: "个人信息" },
  { href: "/settings/security", label: "安全性" },
  { href: "/settings/personalization", label: "个性化" },
  { href: "/settings/buckets", label: "存储桶管理" },
]

export function SettingsLayout() {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <div className="flex-1 overflow-y-auto custom-scrollbar">
      <div className="app-panel flex min-h-full flex-col gap-6 rounded-none sm:rounded-2xl border-0 sm:border border-border/60 p-4 shadow-none sm:shadow-sm sm:p-6 bg-background">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold text-foreground">设置</h1>
          <p className="text-sm text-muted-foreground">
            管理个人资料、安全偏好、界面展示和存储桶连接。
          </p>
        </div>

        <div className="rounded-2xl bg-muted/60 p-1">
          <div className="hidden sm:flex flex-wrap gap-1">
            {tabs.map((tab) => {
              const active = location.pathname === tab.href

              return (
                <Link
                  key={tab.href}
                  to={tab.href}
                  className={cn(
                    "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-background/70 hover:text-foreground"
                  )}
                >
                  {tab.label}
                </Link>
              )
            })}
          </div>
          <div className="sm:hidden flex items-center justify-between">
             <div className="px-4 py-2 text-sm font-medium bg-background text-foreground shadow-sm rounded-xl">
               {tabs.find(t => t.href === location.pathname)?.label || "设置"}
             </div>
             <DropdownMenu>
               <DropdownMenuTrigger className="p-2 mr-1">
                 <IconDotsVertical size={20} className="text-muted-foreground" />
               </DropdownMenuTrigger>
               <DropdownMenuContent align="end">
                  {tabs.filter(t => t.href !== location.pathname).map(tab => (
                    <DropdownMenuItem key={tab.href} onClick={() => navigate(tab.href)}>
                      {tab.label}
                    </DropdownMenuItem>
                  ))}
               </DropdownMenuContent>
             </DropdownMenu>
          </div>
        </div>

        <Outlet />
      </div>
    </div>
  )
}

