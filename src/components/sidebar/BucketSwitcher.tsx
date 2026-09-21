import { useNavigate } from "react-router-dom"
import { IconCheck, IconChevronDown, IconPlus } from "@tabler/icons-react"

import { useAppState } from "@/state/app"
import { cn } from "@/lib/utils"
import { ProviderIcon as DriveIcon } from "@/components/storage/ProviderIcon"
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
              {/local|本机/i.test(activeBucket.provider) ? "本机存储" : activeBucket.provider}
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
                  {bucket.provider} · {bucket.region || "本机"}
                </span>
              </div>
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
