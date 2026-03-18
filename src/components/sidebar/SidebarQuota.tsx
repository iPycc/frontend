import { NavLink } from "react-router-dom"

interface SidebarQuotaProps {
  used: number
  total: number
  quotaRatio: number
  formatBytes: (size?: number) => string
}

export function SidebarQuota({ used, total, quotaRatio, formatBytes }: SidebarQuotaProps) {
  return (
    <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:shadow-none">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground">已使用</span>
        <NavLink
          to="/settings/storage"
          className="text-sm text-primary transition-colors hover:text-primary/80"
        >
          详情
        </NavLink>
      </div>
      <div className="mt-3 h-2 rounded-full bg-border/70 dark:bg-muted">
        <div
          className="h-full rounded-full bg-primary"
          style={{
            width: `${Math.max(quotaRatio * 100, used > 0 ? 8 : 0)}%`,
          }}
        />
      </div>
      <div className="mt-2 text-sm text-muted-foreground">
        {formatBytes(used)} / {formatBytes(total)}
      </div>
    </div>
  )
}
