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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface RenameDialogProps {
  open: boolean
  defaultValue: string
  onClose: () => void
  onSubmit: (name: string) => void
}

export function RenameDialog({ open, defaultValue, onClose, onSubmit }: RenameDialogProps) {
  const [value, setValue] = React.useState(defaultValue)

  React.useEffect(() => {
    setValue(defaultValue)
  }, [defaultValue, open])

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>重命名</DialogTitle>
          <DialogDescription>修改当前文件或文件夹名称。</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>名称</Label>
          <Input value={value} onChange={(e) => setValue(e.target.value)} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>取消</Button>
          <Button onClick={() => { if (value.trim()) onSubmit(value.trim()) }}>保存</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
