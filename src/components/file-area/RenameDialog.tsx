import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RenameDialogProps {
  open: boolean
  title?: string
  value: string
  onValueChange: (value: string) => void
  onCancel: () => void
  onSubmit: (name: string) => void
}

export function RenameDialog({
  open,
  title = "重命名",
  value,
  onValueChange,
  onCancel,
  onSubmit,
}: RenameDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>修改当前文件或文件夹的名称。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="rename-target">名称</Label>
          <Input
            id="rename-target"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={() => value.trim() && onSubmit(value.trim())}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
