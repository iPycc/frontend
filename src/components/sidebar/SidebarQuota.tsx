import { NavLink } from "react-router-dom"

interface SidebarQuotaProps {
  used: number
  total: number
  quotaRatio: number
  formatBytes: (size?: number) => string
}

export function SidebarQuota({ used, total, quotaRatio, formatBytes }: SidebarQuotaProps) {
  return (
    <div className="rounded-[15px] border border-[#dadada] bg-white/88 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:bg-[#171717] dark:shadow-none">
      <div className="flex items-center justify-between">
        <span className="text-sm text-[#252525] dark:text-[#f2f2f2]">已使用</span>
        <NavLink
          to="/settings/storage"
          className="text-sm text-[#1976c9] transition-colors hover:text-[#0e5da5] dark:text-[#7dcbff] dark:hover:text-[#a3dcff]"
        >
          详情
        </NavLink>
      </div>
      <div className="mt-3 h-2 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]">
        <div
          className="h-full rounded-full bg-[#6eb9ff] dark:bg-[#4f98d9]"
          style={{
            width: `${Math.max(quotaRatio * 100, used > 0 ? 8 : 0)}%`,
          }}
        />
      </div>
      <div className="mt-2 text-sm text-[#505050] dark:text-[#c7c7c7]">
        {formatBytes(used)} / {formatBytes(total)}
      </div>
    </div>
  )
}
