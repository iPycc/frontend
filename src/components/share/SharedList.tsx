import {
  IconChevronRight,
  IconLayoutGrid,
  IconListDetails,
  IconTrash,
} from "@tabler/icons-react"

import {
  groupSharedOwners,
  type SharedMount,
  type SharedOwner,
} from "@/api/shared"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/ui/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatDateTime } from "@/lib/datetime"
import { useSettingsState } from "@/state/app"

export type SharedViewMode = "grid" | "list"

export function SharedViewToggle({
  value,
  onChange,
}: {
  value: SharedViewMode
  onChange: (value: SharedViewMode) => void
}) {
  return (
    <div className="flex items-center rounded-lg border border-border bg-background p-0.5" aria-label="切换显示方式">
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(value === "grid" && "bg-muted text-foreground")}
        onClick={() => onChange("grid")}
        aria-label="网格视图"
        aria-pressed={value === "grid"}
      >
        <IconLayoutGrid size={17} />
      </Button>
      <Button
        variant="ghost"
        size="icon-sm"
        className={cn(value === "list" && "bg-muted text-foreground")}
        onClick={() => onChange("list")}
        aria-label="列表视图"
        aria-pressed={value === "list"}
      >
        <IconListDetails size={17} />
      </Button>
    </div>
  )
}

export function SharedList({
  items,
  loading,
  viewMode,
  onOpen,
}: {
  items: SharedMount[]
  loading: boolean
  viewMode: SharedViewMode
  onOpen: (owner: SharedOwner) => void
}) {
  const { settings } = useSettingsState()
  if (loading) {
    return (
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-label="正在加载与我共享">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  }

  const owners = groupSharedOwners(items)
  if (!owners.length) {
    return <EmptyState title="还没有其他用户与您共享" description="打开他人的分享链接并挂载后，共享用户会显示在这里。" />
  }

  if (viewMode === "list") {
    return (
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {owners.map((owner) => (
          <button
            key={owner.id}
            type="button"
            className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
            onClick={() => onOpen(owner)}
          >
            <OwnerAvatar owner={owner} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{owner.name}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                {owner.shareCount} 个分享 · {owner.itemCount} 项内容
              </span>
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">{formatDateTime(owner.latestSharedAt, settings.timezone)}</span>
            <IconChevronRight size={18} className="shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
      {owners.map((owner) => (
        <button
          key={owner.id}
          type="button"
          className="flex min-h-24 items-center gap-4 rounded-xl border border-border bg-card p-4 text-left transition-colors hover:bg-muted/50"
          onClick={() => onOpen(owner)}
        >
          <OwnerAvatar owner={owner} large />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{owner.name}</span>
            <span className="mt-1 block text-sm text-muted-foreground">{owner.shareCount} 个分享</span>
            <span className="mt-0.5 block text-xs text-muted-foreground">{owner.itemCount} 项共享内容</span>
          </span>
          <IconChevronRight size={19} className="shrink-0 text-muted-foreground" />
        </button>
      ))}
    </div>
  )
}

export function SharedMountList({
  items,
  viewMode,
  removingId,
  onOpen,
  onRemove,
}: {
  items: SharedMount[]
  viewMode: SharedViewMode
  removingId: number | null
  onOpen: (mount: SharedMount) => void
  onRemove: (mount: SharedMount) => void
}) {
  const { settings } = useSettingsState()
  if (!items.length) {
    return <EmptyState title="这个用户没有可用分享" description="原分享可能已被取消或过期。" />
  }

  if (viewMode === "list") {
    return (
      <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
        {items.map((mount) => (
          <div key={mount.id} className="flex items-center gap-3 px-4 py-3">
            <button
              type="button"
              className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
              disabled={!mount.available}
              onClick={() => onOpen(mount)}
            >
              <span className="block truncate text-sm font-medium">{titleOf(mount)}</span>
              <span className={cn("mt-0.5 block text-xs", mount.available ? "text-muted-foreground" : "text-destructive")}>
                {mount.available ? `${mount.roots.length} 项内容 · ${formatDateTime(mount.created_at, settings.timezone)}` : "原分享不可用"}
              </span>
            </button>
            <Button variant="ghost" size="icon-sm" disabled={!mount.available} onClick={() => onOpen(mount)} aria-label={`浏览 ${titleOf(mount)}`}>
              <IconChevronRight />
            </Button>
            <Button variant="ghost" size="icon-sm" disabled={removingId === mount.id} onClick={() => onRemove(mount)} aria-label={`卸载 ${titleOf(mount)}`}>
              <IconTrash className="text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(15rem,1fr))]">
      {items.map((mount) => (
        <div key={mount.id} className="flex min-h-28 flex-col rounded-xl border border-border bg-card p-4">
          <button
            type="button"
            className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
            disabled={!mount.available}
            onClick={() => onOpen(mount)}
          >
            <span className="block truncate font-medium">{titleOf(mount)}</span>
            <span className={cn("mt-1 block text-sm", mount.available ? "text-muted-foreground" : "text-destructive")}>
              {mount.available ? `${mount.roots.length} 项内容` : "原分享不可用"}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground">{formatDateTime(mount.created_at, settings.timezone)}</span>
          </button>
          <div className="mt-3 flex justify-end gap-1 border-t border-border pt-2">
            <Button variant="ghost" size="sm" disabled={!mount.available} onClick={() => onOpen(mount)}>
              浏览
              <IconChevronRight />
            </Button>
            <Button variant="ghost" size="icon-sm" disabled={removingId === mount.id} onClick={() => onRemove(mount)} aria-label={`卸载 ${titleOf(mount)}`}>
              <IconTrash className="text-destructive" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function OwnerAvatar({ owner, large = false }: { owner: SharedOwner; large?: boolean }) {
  return (
    <Avatar className={large ? "size-12" : "size-10"}>
      {owner.avatar ? <AvatarImage src={owner.avatar} alt={`${owner.name}的头像`} /> : null}
      <AvatarFallback>{owner.name.trim().slice(0, 1).toUpperCase() || "用"}</AvatarFallback>
    </Avatar>
  )
}

function titleOf(mount: SharedMount) {
  if (mount.roots.length === 1) return mount.roots[0].name
  return mount.roots.length ? `${mount.roots.length} 项共享内容` : `分享 ${mount.share_id.slice(0, 8)}`
}
