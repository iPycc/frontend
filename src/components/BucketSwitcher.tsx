import { useNavigate } from "react-router-dom"
import { IconCheck, IconChevronDown, IconDatabase, IconPlus } from "@tabler/icons-react"

import { useAppState } from "@/lib/app-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"

export function BucketSwitcher() {
  const navigate = useNavigate()
  const { buckets, activeBucket, setActiveBucket } = useAppState()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center justify-between rounded-2xl border border-border/60 bg-background px-3 py-2 text-left transition-colors hover:bg-accent">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-primary p-2 text-primary-foreground shadow-sm">
            <IconDatabase size={18} />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-foreground">{activeBucket.name}</div>
            <div className="truncate text-xs text-muted-foreground">{activeBucket.provider}</div>
          </div>
        </div>
        <IconChevronDown size={16} className="text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-72">
        <DropdownMenuGroup>
          <DropdownMenuLabel>已挂载存储桶</DropdownMenuLabel>
          <DropdownMenuSeparator />
          {buckets.map((bucket) => (
            <DropdownMenuItem
              key={bucket.id}
              onClick={() => setActiveBucket(bucket.id)}
              className="flex items-center justify-between p-2"
            >
              <div className="flex flex-col">
                <span className="font-medium">{bucket.name}</span>
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
