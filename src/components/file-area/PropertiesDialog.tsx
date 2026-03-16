import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { type FileNode } from "@/lib/mock-data"

interface PropertiesDialogProps {
  node: FileNode | undefined
  bucketName: string
  formatBytes: (size?: number) => string
  onClose: () => void
}

export function PropertiesDialog({ node, bucketName, formatBytes, onClose }: PropertiesDialogProps) {
  return (
    <Dialog open={Boolean(node)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>属性</DialogTitle>
          <DialogDescription>查看当前对象的 mock 元信息。</DialogDescription>
        </DialogHeader>
        {node ? (
          <div className="grid gap-3 rounded-[10px] border border-border/60 bg-muted/30 p-4 text-sm text-muted-foreground">
            <div>名称：{node.name}</div>
            <div>类型：{node.kind === "folder" ? "文件夹" : node.ext?.toUpperCase() || "文件"}</div>
            <div>大小：{formatBytes(node.size)}</div>
            <div>更新时间：{node.updatedAt}</div>
            <div>Bucket：{bucketName}</div>
          </div>
        ) : null}
        <DialogFooter>
          <Button onClick={onClose}>关闭</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
