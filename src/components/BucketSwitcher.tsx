import { useNavigate } from "react-router-dom"
import { IconCheck, IconChevronDown, IconCloud, IconPlus } from "@tabler/icons-react"

import { useAppState } from "@/lib/app-state"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export function BucketSwitcher({ className }: { className?: string }) {
  const navigate = useNavigate()
  const { buckets, activeBucket, setActiveBucket } = useAppState()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-14 w-full items-center justify-between rounded-[18px] border border-[#d6d6d6] bg-white px-3 py-2 text-left shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] transition-colors hover:bg-white/95 dark:border-white/10 dark:bg-[#171717] dark:shadow-none dark:hover:bg-[#1d1d1d]",
          className
        )}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e9f6ff] text-[#1ea7ff] dark:bg-[#0f3553] dark:text-[#65c3ff]">
            <IconCloud size={20} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] text-[#2b2b2b] dark:text-[#f3f3f3]">
              {activeBucket.name}
            </div>
            <div className="truncate text-[12px] text-[#7c7c7c] dark:text-[#9b9b9b]">
              {activeBucket.provider}
            </div>
          </div>
        </div>
        <IconChevronDown size={18} className="text-[#666666] dark:text-[#b7b7b7]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" sideOffset={0} className="w-72 rounded-[22px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>已挂载存储桶</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {buckets.map((bucket) => (
            <DropdownMenuItem
              key={bucket.id}
              onClick={() => setActiveBucket(bucket.id)}
              className="flex items-center justify-between rounded-[14px] px-3 py-2.5"
            >
              <div className="flex flex-col">
                <span>{bucket.name}</span>
                <span className="text-xs text-muted-foreground">
                  {bucket.provider} · {bucket.region || "本机"}
                </span>
              </div>
              {activeBucket.id === bucket.id ? <IconCheck size={16} className="text-primary" /> : null}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-primary" onClick={() => navigate("/settings/buckets")}>
            <IconPlus size={16} />
            新建存储桶
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
