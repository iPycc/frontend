﻿import * as React from "react"
import { IconChevronDown, IconPlus, IconRefresh } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import type { BucketMount } from "@/lib/models"
import { StoragePolicyCard } from "@/components/storage/StoragePolicyCard"

interface StoragePolicyListProps {
  buckets: BucketMount[]
  onAddPolicy: () => void
  onEditPolicy: (bucket: BucketMount) => void
  onDeletePolicy: (bucket: BucketMount) => void
  onSyncMount: (bucket: BucketMount) => void
  syncingMountId: number | null
}

export function StoragePolicyList({
  buckets,
  onAddPolicy,
  onEditPolicy,
  onDeletePolicy,
  onSyncMount,
  syncingMountId,
}: StoragePolicyListProps) {
  return (
    <div className="space-y-5">
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <button
          type="button"
          onClick={onAddPolicy}
          className="flex min-h-[120px] items-center justify-center gap-2 rounded-2xl bg-muted/30 text-[15px] text-muted-foreground transition-all hover:bg-muted/50 hover:text-foreground"
        >
          <IconPlus size={18} />
          添加存储策略
        </button>

        {buckets.map((bucket) => (
          <div key={bucket.id}>
            <StoragePolicyCard
              bucket={bucket}
              onEdit={onEditPolicy}
              onDelete={onDeletePolicy}
              onSync={onSyncMount}
              syncing={syncingMountId === bucket.backendId}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>共 {buckets.length} 项存储策略</div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" disabled>上一页</Button>
          <Button variant="ghost" size="sm" disabled>下一页</Button>
        </div>
      </div>
    </div>
  )
}
