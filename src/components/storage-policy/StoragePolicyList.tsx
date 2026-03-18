import * as React from "react"
import { IconPlus, IconRefresh, IconChevronDown } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { StoragePolicyCard } from "./StoragePolicyCard"
import type { BucketMount } from "@/lib/mock-data"

interface StoragePolicyListProps {
  buckets: BucketMount[]
  onAddPolicy: () => void
  onEditPolicy: (bucket: BucketMount) => void
  onDeletePolicy: (bucket: BucketMount) => void
}

export function StoragePolicyList({
  buckets,
  onAddPolicy,
  onEditPolicy,
  onDeletePolicy,
}: StoragePolicyListProps) {
  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" className="gap-1.5">
          <IconRefresh size={14} />
          刷新
        </Button>
        <Button variant="outline" size="sm" className="gap-1">
          全部
          <IconChevronDown size={14} />
        </Button>
      </div>

      {/* Grid */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {/* Add card */}
        <button
          type="button"
          onClick={onAddPolicy}
          className="flex min-h-[100px] items-center justify-center gap-2 rounded-[15px] border border-dashed border-border/60 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
        >
          <IconPlus size={16} />
          添加存储策略
        </button>

        {buckets.map((bucket) => (
          <StoragePolicyCard
            key={bucket.id}
            bucket={bucket}
            onEdit={onEditPolicy}
            onDelete={onDeletePolicy}
          />
        ))}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <button className="flex h-7 w-7 items-center justify-center rounded border border-border/60 hover:bg-muted">
            &lt;
          </button>
          <span className="flex h-7 w-7 items-center justify-center rounded bg-primary text-xs text-primary-foreground">
            1
          </span>
          <button className="flex h-7 w-7 items-center justify-center rounded border border-border/60 hover:bg-muted">
            &gt;
          </button>
        </div>
        <div className="flex items-center gap-1">
          每页 11 条
          <IconChevronDown size={14} />
        </div>
      </div>
    </div>
  )
}
