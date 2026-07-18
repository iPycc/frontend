import * as React from "react"
import { IconFolderPlus, IconMapPin } from "@tabler/icons-react"

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
import { cn } from "@/lib/utils"

interface CreateFolderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  defaultName?: string
  locationLabel?: string
  onSubmit: (name: string) => Promise<void> | void
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  title = "新建文件夹",
  description = "在当前位置创建一个新的文件夹，用于整理文件。",
  defaultName = "新建文件夹",
  locationLabel,
  onSubmit,
}: CreateFolderDialogProps) {
  const [name, setName] = React.useState(defaultName)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (open) {
      setName(defaultName)
      setError(null)
      setIsSubmitting(false)
    }
  }, [open, defaultName])

  React.useEffect(() => {
    if (open && inputRef.current) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus()
        inputRef.current?.select()
      }, 0)
      return () => window.clearTimeout(timer)
    }
  }, [open])

  const handleSubmit = async (event?: React.FormEvent) => {
    event?.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) {
      setError("请输入文件夹名称")
      return
    }
    setError(null)
    setIsSubmitting(true)
    try {
      await onSubmit(trimmed)
      onOpenChange(false)
    } catch {
      setError("创建失败，请重试")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 sm:max-w-[28rem]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-5 p-6">
            <DialogHeader className="text-left">
              <div className="mb-1 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <IconFolderPlus size={21} stroke={1.7} />
              </div>
              <DialogTitle className="text-lg">{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

            {locationLabel ? (
              <div className="flex items-start gap-2 rounded-lg bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                <IconMapPin size={15} className="mt-0.5 shrink-0" />
                <span className="line-clamp-2">{locationLabel}</span>
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="folder-name">文件夹名称</Label>
              <Input
                id="folder-name"
                ref={inputRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (error) setError(null)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault()
                    void handleSubmit()
                  }
                }}
                placeholder="例如：工作文档"
                className={cn(error && "border-destructive focus-visible:ring-destructive")}
                disabled={isSubmitting}
              />
              {error ? <p className="text-xs text-destructive">{error}</p> : null}
            </div>

            <DialogFooter className="pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  )
}
