import { IconAlertTriangle, IconFile, IconFolder } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type UploadConflictChoice = "rename" | "replace" | "skip"

export type UploadConflictInfo = {
  name: string
  kind: "file" | "folder"
  existingSize?: number
  existingModified?: string
  incomingSize: number
  incomingModified?: number
  incomingCount: number
}

function formatBytes(size = 0) {
  if (size < 1024) return `${size} B`
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`
  return `${(size / 1024 ** 3).toFixed(1)} GB`
}

function date(value?: string | number) {
  if (!value) return "未知"
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? "未知" : parsed.toLocaleString("zh-CN")
}

export function UploadConflictDialog({
  conflict,
  onResolve,
}: {
  conflict: UploadConflictInfo | null
  onResolve: (choice: UploadConflictChoice) => void
}) {
  return (
    <Dialog open={Boolean(conflict)} onOpenChange={(open) => !open && onResolve("skip")}>
      <DialogContent className="sm:max-w-[32rem]">
        <DialogHeader>
          <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <IconAlertTriangle size={21} />
          </div>
          <DialogTitle>目标位置已有同名{conflict?.kind === "folder" ? "文件夹" : "文件"}</DialogTitle>
          <DialogDescription>比较两边信息后，选择如何处理“{conflict?.name}”。替换时旧内容会先移入回收站。</DialogDescription>
        </DialogHeader>

        {conflict ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-border p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                {conflict.kind === "folder" ? <IconFolder size={18} className="text-primary" /> : <IconFile size={18} />}
                目标中的项目
              </div>
              <dl className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3"><dt>大小</dt><dd>{conflict.kind === "folder" ? "文件夹" : formatBytes(conflict.existingSize)}</dd></div>
                <div className="flex justify-between gap-3"><dt>修改时间</dt><dd className="text-right">{date(conflict.existingModified)}</dd></div>
              </dl>
            </div>
            <div className="rounded-lg border border-primary/30 bg-primary/[0.03] p-3">
              <div className="mb-3 flex items-center gap-2 text-sm font-medium">
                {conflict.kind === "folder" ? <IconFolder size={18} className="text-primary" /> : <IconFile size={18} />}
                即将上传
              </div>
              <dl className="space-y-1.5 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3"><dt>{conflict.kind === "folder" ? "文件数" : "大小"}</dt><dd>{conflict.kind === "folder" ? `${conflict.incomingCount} 个` : formatBytes(conflict.incomingSize)}</dd></div>
                <div className="flex justify-between gap-3"><dt>修改时间</dt><dd className="text-right">{date(conflict.incomingModified)}</dd></div>
              </dl>
            </div>
          </div>
        ) : null}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onResolve("skip")}>跳过</Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onResolve("rename")}>保留两者（添加 2）</Button>
            <Button onClick={() => onResolve("replace")}>替换</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
