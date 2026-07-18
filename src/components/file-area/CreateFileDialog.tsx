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
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

export type NewTextFileType = "txt" | "markdown"

const fileTypeDetails = {
  txt: {
    title: "新建文本文档",
    description: "创建一个 UTF-8 编码的纯文本文档。",
    defaultName: "新建文本文档.txt",
    extension: ".txt",
  },
  markdown: {
    title: "新建 Markdown 文档",
    description: "创建后可在 Cloudrave 中预览或编辑 Markdown 源码。",
    defaultName: "新建 Markdown 文档.md",
    extension: ".md",
  },
} as const

function ensureExtension(name: string, extension: string) {
  const trimmed = name.trim()
  if (trimmed.toLowerCase().endsWith(extension)) return trimmed
  return trimmed.replace(/\.(?:txt|md|markdown)$/i, "") + extension
}

export function CreateFileDialog({
  open,
  fileType,
  onOpenChange,
  onSubmit,
}: {
  open: boolean
  fileType: NewTextFileType
  onOpenChange: (open: boolean) => void
  onSubmit: (name: string) => Promise<boolean>
}) {
  const details = fileTypeDetails[fileType]
  const [name, setName] = React.useState<string>(details.defaultName)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (!open) return
    setName(details.defaultName)
    setSubmitting(false)
    setError(null)
  }, [details.defaultName, open])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const normalizedName = ensureExtension(name, details.extension)
    if (!normalizedName || /[\\/]/.test(normalizedName)) {
      setError("请输入有效的文件名，且不要包含 / 或 \\")
      return
    }

    setSubmitting(true)
    setError(null)
    const created = await onSubmit(normalizedName)
    setSubmitting(false)
    if (created) onOpenChange(false)
    else setError("创建失败，请重试")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" initialFocus={inputRef}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <DialogHeader>
            <DialogTitle>{details.title}</DialogTitle>
            <DialogDescription>{details.description}</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field data-invalid={Boolean(error)}>
              <FieldLabel htmlFor="new-text-file-name">文件名</FieldLabel>
              <Input
                id="new-text-file-name"
                ref={inputRef}
                value={name}
                onChange={(event) => {
                  setName(event.target.value)
                  if (error) setError(null)
                }}
                aria-invalid={Boolean(error)}
                disabled={submitting}
              />
              <FieldDescription>缺少扩展名时会自动补全为 {details.extension}</FieldDescription>
              <FieldError>{error}</FieldError>
            </Field>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
              取消
            </Button>
            <Button type="submit" disabled={submitting || !name.trim()}>
              {submitting ? "创建中..." : "创建"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
