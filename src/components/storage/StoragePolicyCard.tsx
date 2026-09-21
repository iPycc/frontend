﻿import * as React from "react"
import { IconPencil, IconRefresh, IconTrash, IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BucketMount } from "@/lib/models"
import { MountStatus } from "@/components/storage/MountStatus"
import { ProviderIcon } from "@/components/storage/ProviderIcon"

interface StoragePolicyCardProps {
  bucket: BucketMount
  onEdit: (bucket: BucketMount) => void
  onDelete: (bucket: BucketMount) => void
  onSync: (bucket: BucketMount) => void
  syncing: boolean
}

export function StoragePolicyCard({ bucket, onEdit, onDelete, onSync, syncing }: StoragePolicyCardProps) {
  const isLocal = bucket.storageType === "local" || bucket.isLocal
  const providerLabel = isLocal ? "Local Storage（本机存储）" : bucket.provider
  const detail = isLocal ? bucket.basePrefix : bucket.bucket

  return (
    <div className={cn("group relative flex flex-col overflow-hidden rounded-2xl bg-muted/40 transition-all hover:bg-muted/60")}>
      <ProviderIcon driverId={bucket.driverId} provider={bucket.provider} size={54} className="absolute -right-1 -top-1 opacity-[0.15]" />

      <div className="relative flex flex-1 flex-col gap-1.5 p-5">
        <div className="truncate text-[15px] font-semibold text-foreground/90">{bucket.name}</div>
        <div className="text-xs text-muted-foreground">{providerLabel}</div>
        {detail ? <div className="mt-1 truncate font-mono text-xs text-muted-foreground/60">{detail}</div> : null}
        <div className="mt-2"><MountStatus bucket={bucket} /></div>
      </div>

      <div className="relative flex items-center justify-between gap-2 px-3 pb-3">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground"
            onClick={() => onEdit(bucket)}
          >
            <IconPencil size={14} />
            编辑
          </Button>
          {bucket.mountMode === "mirror" ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 px-3 text-xs text-muted-foreground hover:bg-background/60 hover:text-foreground"
              onClick={() => onSync(bucket)}
              disabled={!bucket.canEditConnection || (!syncing && bucket.syncStatus === "pending")}
            >
              {syncing ? <IconX size={14} /> : <IconRefresh size={14} />}
              {syncing ? "停止" : bucket.syncStatus === "running" ? "继续" : "同步"}
            </Button>
          ) : null}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          onClick={() => onDelete(bucket)}
          disabled={!bucket.canDelete}
        >
          <IconTrash size={15} />
        </Button>
      </div>
    </div>
  )
}
