import * as React from "react"
import { IconCloud, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BucketMount } from "@/lib/mock-data"

interface StoragePolicyCardProps {
  bucket: BucketMount
  onEdit: (bucket: BucketMount) => void
  onDelete: (bucket: BucketMount) => void
}

export function StoragePolicyCard({ bucket, onEdit, onDelete }: StoragePolicyCardProps) {
  const isLocal = bucket.isLocal || bucket.provider === "本机存储"
  const providerLabel = isLocal ? "本机存储" : "腾讯云 COS"

  return (
    <div
      className={cn(
        "group relative flex flex-col gap-3 rounded-[15px] border border-border/60 px-4 py-4 transition-colors hover:border-border",
        "bg-card"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-medium">{bucket.name}</span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
              Admin
            </span>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
          <span>{providerLabel}</span>
          <IconCloud size={20} className="text-muted-foreground/60" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onEdit(bucket)}
          className="text-xs text-primary hover:underline"
        >
          加载统计数据
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(bucket)}
          disabled={!bucket.canDelete}
        >
          <IconTrash size={14} />
        </Button>
      </div>
    </div>
  )
}
