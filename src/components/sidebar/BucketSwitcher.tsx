import { useNavigate } from "react-router-dom"
import { IconCheck, IconChevronDown, IconPlus } from "@tabler/icons-react"

import { useAppState } from "@/state/app"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function ProviderIcon({ provider, size = "trigger" }: { provider: string; size?: "trigger" | "menu" | "compact" }) {
  const p = provider.toLowerCase()
  const px = size === "compact" ? 18 : 28

  if (p.includes("腾讯") || p.includes("tencent") || p.includes("cos")) {
    return (
      <svg viewBox="0 0 1402 1024" xmlns="http://www.w3.org/2000/svg" width={px} height={px} style={{ minWidth: px, minHeight: px }} aria-hidden="true">
        <path d="M1215.068154 831.197568a199.23384 199.23384 0 0 1-148.202014 58.441927l-477.741777 1.258319c148.202014-142.329859 263.967361-265.64512 276.830178-271.796902a660.058216 660.058216 0 0 1 64.453895-58.302113c51.311452-58.302113 96.471122-64.873335 141.910419-65.013148a190.006167 190.006167 0 0 1 142.190046 57.882674c77.596338 70.885303 77.875964 206.364314 0 277.529243z m95.911869-368.128211c-58.302113-57.882673-142.329859-102.902531-226.217791-102.622904S936.979657 393.162747 878.258104 432.310449c-19.294224 19.573851-57.882673 45.439297-83.887932 83.887932-32.017228 19.294224-508.360872 504.725728-508.360872 504.725728l703.679942-1.398132a520.384809 520.384809 0 0 0 109.613565-6.711035 372.322608 372.322608 0 0 0 206.364314-91.15822c122.336568-129.467043 121.777315-335.55173 5.312902-458.307738z" fill="#00A3FF"/>
        <path d="M517.539994 432.310449a322.688914 322.688914 0 0 0-200.212532-64.034456 289.553181 289.553181 0 0 0-226.497418 104.440477A333.174906 333.174906 0 0 0 98.100331 937.455616q77.596338 77.316711 174.4869 77.037085l128.767977-123.175448h-70.605677A264.386801 264.386801 0 0 1 181.988264 833.854019c-77.596338-77.176898-77.875964-199.793093 0-283.960651a180.638682 180.638682 0 0 1 141.211353-58.441927c38.868075 0 77.456524 6.291595 129.327229 57.882674 19.573851 25.585819 77.596338 64.314082 97.030376 90.039714h6.431408l77.316711-90.598967c-25.725633-32.57648-90.598967-83.608306-115.765347-116.464413" fill="#00C8DC"/>
        <path d="M1103.916643 282.850115C1045.334904 115.214063 877.279412-1.110536 696.500917 0.007969 476.99416 0.567222 303.206326 162.470932 265.037317 368.97506c12.862816 0 32.157041-6.431408 51.591079-6.431409s51.591079 6.291595 71.025116 6.151782A303.39469 303.39469 0 0 1 683.917727 129.055572 313.601055 313.601055 0 0 1 968.297819 308.995188s6.571221 6.431408 6.431408 0c45.299484-6.431408 90.459154-26.005259 129.187416-26.145073" fill="#006EFF"/>
      </svg>
    )
  }

  if (p.includes("阿里") || p.includes("aliyun") || p.includes("oss")) {
    return (
      <svg viewBox="0 0 32 32" fill="none" width={px} height={px} style={{ minWidth: px, minHeight: px }} aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#FF6A00" />
        <path d="M8 20l4-8 4 6 3-4 5 6H8z" fill="white" />
      </svg>
    )
  }

  if (p.includes("aws") || p.includes("s3") || p.includes("amazon")) {
    return (
      <svg viewBox="0 0 32 32" fill="none" width={px} height={px} style={{ minWidth: px, minHeight: px }} aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="#FF9900" />
        <path d="M10 19c2 1.5 7.5 2 12 0" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <path d="M22 17l2 2-2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M10 17l-2 2 2 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M16 9v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
      </svg>
    )
  }

  if (p.includes("local") || p.includes("本机")) {
    return (
      <svg viewBox="0 0 64 64" fill="none" width={px} height={px} style={{ minWidth: px, minHeight: px }} aria-hidden="true">
        <rect x="8" y="16" width="48" height="32" rx="5" fill="#4F46E5" />
        <rect x="8" y="16" width="48" height="18" rx="5" fill="#6366F1" />
        <circle cx="20" cy="38" r="3.5" fill="white" />
        <circle cx="30" cy="38" r="3.5" fill="white" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 32 32" fill="none" width={px} height={px} style={{ minWidth: px, minHeight: px }} aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="#1ea7ff" opacity="0.15" />
      <path d="M22 18a4 4 0 0 0-3-3.87V14a5 5 0 0 0-9.9-.9A4 4 0 1 0 10 21h12a4 4 0 0 0 0-3z" fill="#1ea7ff" />
    </svg>
  )
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
            <ProviderIcon provider={activeBucket.provider} size="compact" />
            <span className="truncate">{activeBucket.name}</span>
          </>
        ) : <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="shrink-0">
            <ProviderIcon provider={/local|本机/i.test(activeBucket.provider) ? "本机存储" : activeBucket.provider} />
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
                <ProviderIcon provider={bucket.provider} size="menu" />
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
