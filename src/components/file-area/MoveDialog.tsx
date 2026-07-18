import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

interface MoveDialogProps {
  open: boolean
  folders: Array<{ id: string; name: string }>
  value: string
  onValueChange: (value: string) => void
  onCancel: () => void
  onSubmit: (targetId: string) => void
  title?: string
  description?: string
  submitLabel?: string
}

export function MoveDialog({
  open,
  folders,
  value,
  onValueChange,
  onCancel,
  onSubmit,
  title = "移动到",
  description = "选择新的目标文件夹。",
  submitLabel = "移动",
}: MoveDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="move-target">目标目录</Label>
          <select
            id="move-target"
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-[color:var(--focus-border)] focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-[color:var(--focus-border)] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
            value={value}
            onChange={(event) => onValueChange(event.target.value)}
          >
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            取消
          </Button>
          <Button onClick={() => onSubmit(value)} disabled={!value}>{submitLabel}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
