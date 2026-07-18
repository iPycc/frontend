import { IconArchive, IconFolderDown, IconInfoCircle } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"

export function DownloadMethodDialog({
  open,
  itemCount,
  supportsDirectoryDownload,
  onOpenChange,
  onDirectoryDownload,
  onArchiveDownload,
}: {
  open: boolean
  itemCount: number
  supportsDirectoryDownload: boolean
  onOpenChange: (open: boolean) => void
  onDirectoryDownload: () => void
  onArchiveDownload: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,32rem)]">
        <DialogHeader>
          <DialogTitle>选择下载方式</DialogTitle>
          <DialogDescription>
            即将下载 {itemCount} 项内容。保存原始文件夹不会生成 ZIP，并会保留目录结构。
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3">
          <button
            type="button"
            disabled={!supportsDirectoryDownload}
            onClick={() => {
              onOpenChange(false)
              onDirectoryDownload()
            }}
            className={cn(
              "flex items-start gap-3 rounded-xl border border-primary/40 bg-primary/[0.04] p-4 text-left transition-colors",
              supportsDirectoryDownload ? "hover:bg-primary/[0.08]" : "cursor-not-allowed opacity-55"
            )}
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconFolderDown size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 text-sm font-medium">
                保存原始文件夹
                <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">推荐</span>
              </span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                先选择本地文件夹，再逐个保存原始文件；保留文件名和文件夹层级。
              </span>
              {!supportsDirectoryDownload ? (
                <span className="mt-1.5 flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
                  <IconInfoCircle size={14} />当前浏览器不支持目录写入，请使用 ZIP
                </span>
              ) : null}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              onOpenChange(false)
              onArchiveDownload()
            }}
            className="flex items-start gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:bg-muted/60"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <IconArchive size={21} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="text-sm font-medium">服务器打包为 ZIP</span>
              <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                适用于不支持目录写入的浏览器，或需要单个压缩包时使用。
              </span>
            </span>
          </button>
        </div>

        <div className="flex justify-end">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>取消</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
