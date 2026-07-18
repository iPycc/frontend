import * as React from "react"
import { IconEdit } from "@tabler/icons-react"

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
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) return
    const timer = window.setTimeout(() => {
      inputRef.current?.focus()
      const dot = value.lastIndexOf(".")
      inputRef.current?.setSelectionRange(0, dot > 0 ? dot : value.length)
    }, 0)
    return () => window.clearTimeout(timer)
  }, [open, value])

  const submit = (event?: React.FormEvent) => {
    event?.preventDefault()
    const trimmed = value.trim()
    if (trimmed) onSubmit(trimmed)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="p-0 sm:max-w-[28rem]">
        <form className="space-y-5 p-6" onSubmit={submit}>
          <DialogHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <IconEdit size={20} stroke={1.8} />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
            <DialogDescription>输入新名称；文件扩展名会保留在当前选择之外。</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="rename-target">名称</Label>
            <Input
              ref={inputRef}
              id="rename-target"
              value={value}
              onChange={(event) => onValueChange(event.target.value)}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
            <Button type="submit" disabled={!value.trim()}>保存</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
