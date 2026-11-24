import { useNavigate } from "react-router-dom"
import { IconAlertCircle, IconCheck, IconChevronDown, IconPlus } from "@tabler/icons-react"

import { useAppState } from "@/state/app"
import { cn } from "@/lib/utils"
import { getProviderDisplayName, ProviderIcon as DriveIcon } from "@/components/storage/ProviderIcon"
import type { MountHealth } from "@/api/storage"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function ProviderIcon({ provider, driverId, size = "trigger" }: { provider: string; driverId?: string; size?: "trigger" | "menu" | "compact" }) {
  return <DriveIcon provider={provider} driverId={driverId} size={size === "compact" ? 18 : 28} />
}

export function BucketSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const navigate = useNavigate()
  const { buckets, activeBucket, setActiveBucket } = useAppState()

  const health = (bucket: (typeof buckets)[number]) => {
    const checked = bucket.extra?._health as MountHealth | undefined
    if (bucket.extra?.requires_reauthorization === true || checked?.status === "reauthorization_required") return { label: "需要重新授权", failed: true }
    if (checked?.status === "failed") return { label: "连接失败", failed: true }
    if (bucket.syncStatus === "failed") return { label: "连接失败", failed: true }
    return { label: "正常", failed: false }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`切换存储桶：${activeBucket.name}`}
        title={activeBucket.name}
        className={cn(
          compact
            ? "flex h-9 min-w-0 max-w-36 items-center gap-1 rounded-md px-1 text-left text-[13px] text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            : "flex h-14 w-full items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-left shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] transition-colors hover:bg-card/90 dark:shadow-none",
          className
        )}
      >
        {compact ? (
          <>
            <ProviderIcon provider={activeBucket.provider} driverId={activeBucket.driverId} size="compact" />
            <span className="truncate">{activeBucket.name}</span>
            <span
              aria-label={`挂载状态：${health(activeBucket).label}`}
              title={health(activeBucket).label}
              className={cn("size-1.5 shrink-0 rounded-full", health(activeBucket).failed ? "bg-destructive" : "bg-emerald-500")}
            />
          </>
        ) : <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0">
            <ProviderIcon provider={activeBucket.provider} driverId={activeBucket.driverId} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm text-foreground">
              {activeBucket.name}
            </div>
            <div className="truncate text-xs text-muted-foreground">
              {getProviderDisplayName(activeBucket.driverId, activeBucket.provider)}
            </div>
          </div>
        </div>}
        <IconChevronDown size={compact ? 14 : 18} className="shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={compact ? 4 : 0} className="w-72 max-w-[calc(100vw-1rem)] rounded-xl">
        <DropdownMenuGroup>
          <DropdownMenuLabel>已挂载存储桶</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {buckets.map((bucket) => (
            <DropdownMenuItem
              key={bucket.id}
              onClick={() => {
                if (health(bucket).failed) {
                  navigate(`/app/mounts?mount=${bucket.backendId}`)
                  return
                }
                if (bucket.id === activeBucket.id) return
                setActiveBucket(bucket.id)
                if (compact) navigate("/app")
              }}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5"
            >
              <div className="shrink-0">
                <ProviderIcon provider={bucket.provider} driverId={bucket.driverId} size="menu" />
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{bucket.name}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {getProviderDisplayName(bucket.driverId, bucket.provider)} · {bucket.region || "本机"}
                </span>
              </div>
              <span className={cn("inline-flex shrink-0 items-center gap-1 text-xs", health(bucket).failed ? "text-destructive" : "text-emerald-600 dark:text-emerald-400")}>
                {health(bucket).failed ? <IconAlertCircle size={14} /> : <IconCheck size={14} />}
                {health(bucket).label}
              </span>
              {activeBucket.id === bucket.id ? <IconCheck size={16} className="shrink-0 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-primary" onClick={() => navigate("/settings/storage")}>
            <IconPlus size={16} />
            新建存储桶
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
