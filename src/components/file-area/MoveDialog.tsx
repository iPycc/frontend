import * as React from "react"
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
  folderOptions: Array<{ id: string; name: string }>
  defaultTargetId: string
  onClose: () => void
  onSubmit: (targetId: string) => void
}

export function MoveDialog({ open, folderOptions, defaultTargetId, onClose, onSubmit }: MoveDialogProps) {
  const [targetId, setTargetId] = React.useState(defaultTargetId)

  React.useEffect(() => {
    setTargetId(defaultTargetId)
  }, [defaultTargetId, open])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>移动到</DialogTitle>
          <DialogDescription>从当前 bucket 中选择新的目标文件夹。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>目标目录</Label>
          <select
            className="flex h-9 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:border-[color:var(--focus-border)] focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-[color:var(--focus-border)] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none"
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
          >
            {folderOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>{opt.name}</option>
            ))}
          </select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => onSubmit(targetId)}>移动</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
