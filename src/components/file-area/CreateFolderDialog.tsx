import * as React from "react"
import { IconFolderPlus } from "@tabler/icons-react"

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
      <DialogContent className="overflow-hidden p-0 sm:max-w-[32rem]">
        <div className="grid sm:grid-cols-[1.1fr_1.4fr]">
          <div className="relative flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/90 to-primary p-8 text-primary-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
              <IconFolderPlus size={40} stroke={1.5} />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">{title}</p>
              {locationLabel ? (
                <p className="mt-1 line-clamp-2 text-sm text-primary-foreground/80">{locationLabel}</p>
              ) : null}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-6">
            <DialogHeader className="text-left">
              <DialogTitle>{title}</DialogTitle>
              <DialogDescription>{description}</DialogDescription>
            </DialogHeader>

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

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
                取消
              </Button>
              <Button type="submit" disabled={isSubmitting || !name.trim()}>
                {isSubmitting ? "创建中..." : "创建"}
              </Button>
            </DialogFooter>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
