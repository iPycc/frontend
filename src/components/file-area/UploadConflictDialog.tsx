import { File, Folder, ShieldAlert } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator"

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
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-destructive" aria-hidden="true" />
            <DialogTitle>目标位置已有同名{conflict?.kind === "folder" ? "文件夹" : "文件"}</DialogTitle>
          </div>
          <DialogDescription>
            选择如何处理“{conflict?.name}”。保留两者会自动为新项目添加序号；替换会永久删除当前项目。
          </DialogDescription>
        </DialogHeader>

        {conflict ? (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)] items-center gap-3 bg-muted/50 px-3 py-2.5 text-sm font-medium">
              <span className="text-xs text-muted-foreground">比较项目</span>
              <span className="flex min-w-0 items-center gap-2">
                {conflict.kind === "folder" ? <Folder className="shrink-0 text-primary" /> : <File className="shrink-0" />}
                <span className="truncate">当前项目</span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                {conflict.kind === "folder" ? <Folder className="shrink-0 text-primary" /> : <File className="shrink-0" />}
                <span className="truncate">即将上传</span>
              </span>
            </div>
            <Separator />
            <dl className="text-sm">
              <div className="grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-3 py-2.5">
                <dt className="text-muted-foreground">{conflict.kind === "folder" ? "内容" : "大小"}</dt>
                <dd className="min-w-0 break-words">
                  {conflict.kind === "folder" ? "现有文件夹" : formatBytes(conflict.existingSize)}
                </dd>
                <dd className="min-w-0 break-words">
                  {conflict.kind === "folder" ? `${conflict.incomingCount} 个文件` : formatBytes(conflict.incomingSize)}
                </dd>
              </div>
              <Separator />
              <div className="grid grid-cols-[5rem_minmax(0,1fr)_minmax(0,1fr)] gap-3 px-3 py-2.5">
                <dt className="text-muted-foreground">修改时间</dt>
                <dd className="min-w-0 break-words text-muted-foreground">{date(conflict.existingModified)}</dd>
                <dd className="min-w-0 break-words text-muted-foreground">{date(conflict.incomingModified)}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={() => onResolve("skip")}>跳过</Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button variant="destructive" onClick={() => onResolve("replace")}>永久替换</Button>
            <Button onClick={() => onResolve("rename")}>保留两者</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
