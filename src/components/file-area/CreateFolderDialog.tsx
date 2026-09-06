import * as React from "react"
import { FolderPlus, MapPin } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

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
      <DialogContent className="sm:max-w-[30rem]">
        <form onSubmit={handleSubmit} className="contents">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <FolderPlus className="text-primary" aria-hidden="true" />
              <DialogTitle>{title}</DialogTitle>
            </div>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>

          <FieldGroup>
            {locationLabel ? (
              <div className="flex items-center gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                <MapPin className="shrink-0" aria-hidden="true" />
                <span className="min-w-0 truncate" title={locationLabel}>{locationLabel}</span>
              </div>
            ) : null}

            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="folder-name">文件夹名称</FieldLabel>
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
                aria-invalid={Boolean(error)}
                disabled={isSubmitting}
              />
              {error ? <FieldError>{error}</FieldError> : (
                <FieldDescription>名称最多 255 个字符，不能包含路径分隔符。</FieldDescription>
              )}
            </Field>
          </FieldGroup>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              取消
            </Button>
            <Button type="submit" disabled={isSubmitting || !name.trim()}>
              {isSubmitting ? <Spinner data-icon="inline-start" /> : <FolderPlus data-icon="inline-start" />}
              {isSubmitting ? "创建中…" : "创建文件夹"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
