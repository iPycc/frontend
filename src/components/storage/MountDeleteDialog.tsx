import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import type { MountDeletePreview } from "@/api/storage"
import type { BucketMount } from "@/lib/models"

export type MountDeleteMode = "detach" | "purge"

interface MountDeleteDialogProps {
  bucket: BucketMount | null
  preview: MountDeletePreview | null
  loading: boolean
  error: string | null
  deletingMode: MountDeleteMode | null
  onOpenChange: (open: boolean) => void
  onDelete: (mode: MountDeleteMode) => void
}

function previewSummary(preview: MountDeletePreview) {
  const items: string[] = []
  if (preview.file_count) items.push(`${preview.file_count} 个文件`)
  if (preview.folder_count) items.push(`${preview.folder_count} 个文件夹`)
  if (preview.active_upload_count) items.push(`${preview.active_upload_count} 个未完成上传`)
  if (preview.pending_cleanup_count) items.push(`${preview.pending_cleanup_count} 个待清理任务`)
  if (preview.remote_objects && !preview.file_count) items.push("COS 中存在未同步文件")
  return items
}

export function MountDeleteDialog({
  bucket,
  preview,
  loading,
  error,
  deletingMode,
  onOpenChange,
  onDelete,
}: MountDeleteDialogProps) {
  const isCos = preview?.provider === "tencent_cos" || bucket?.storageType === "tencent"
  const storageLabel = isCos ? "COS" : "本地存储"
  const busy = deletingMode !== null
  const summary = preview ? previewSummary(preview) : []
  const scope = preview?.prefix
    ? `${preview.bucket_name}/${preview.prefix}`
    : preview?.bucket_name || bucket?.bucket || bucket?.name || "当前存储桶"

  return (
    <Dialog
      open={bucket !== null}
      onOpenChange={(open) => {
        if (!busy) onOpenChange(open)
      }}
    >
      <DialogContent showCloseButton={!busy}>
        <DialogHeader>
          <DialogTitle>删除“{bucket?.name}”？</DialogTitle>
          <DialogDescription>
            请选择只移除 Cloudrave 挂载，还是同时永久删除挂载范围内的存储文件。
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col gap-2 py-2" aria-label="正在检查挂载内容">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          <p className="text-sm leading-6 text-destructive">
            {error}。你仍可仅删除挂载；为避免误删，暂不允许清空存储文件。
          </p>
        ) : preview?.remote_objects === null ? (
          <p className="text-sm leading-6 text-muted-foreground">
            {summary.length ? `Cloudrave 中记录有：${summary.join("、")}；` : "已读取 Cloudrave 中的记录，但"}
            暂时无法确认远端存储内容，执行全部删除时会再次连接存储服务。
          </p>
        ) : preview?.has_contents ? (
          <p className="text-sm leading-6 text-foreground">
            当前挂载点检测到{summary.length ? `：${summary.join("、")}` : "存储内容"}。
          </p>
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">当前挂载点未检测到文件或未完成上传。</p>
        )}

        <div className="flex flex-col gap-4 py-1">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-foreground">仅删除存储桶</p>
              <p className="text-sm leading-6 text-muted-foreground">
                移除 Cloudrave 中的挂载和策略，不影响 {storageLabel} 中的任何文件。
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={loading || busy}
              onClick={() => onDelete("detach")}
            >
              {deletingMode === "detach" ? "正在删除…" : "仅删除存储桶"}
            </Button>
          </div>

          <Separator />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-1">
              <p className="text-sm font-medium text-destructive">全部删除</p>
              <p className="text-sm leading-6 text-muted-foreground">
                永久删除 {scope} 范围内的文件、未完成上传和 Cloudrave 挂载；此操作不可撤销。
              </p>
            </div>
            <Button
              type="button"
              variant="destructive"
              disabled={loading || Boolean(error) || busy}
              onClick={() => onDelete("purge")}
            >
              {deletingMode === "purge" ? "正在全部删除…" : "全部删除"}
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => onOpenChange(false)}>
            取消
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
