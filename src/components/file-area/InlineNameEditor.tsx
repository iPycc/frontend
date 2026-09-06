import * as React from "react"

import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { InlineNameEdit } from "./types"

interface InlineNameEditorProps {
  edit: InlineNameEdit
  originalName?: string
  className?: string
}

export function InlineNameEditor({ edit, originalName, className }: InlineNameEditorProps) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const finishedRef = React.useRef(false)

  React.useEffect(() => {
    const input = inputRef.current
    if (!input) return

    input.focus()
    const name = originalName ?? edit.value
    input.setSelectionRange(name.length, name.length)
  }, [edit.mode, edit.itemId])

  React.useEffect(() => {
    if (!edit.pending) finishedRef.current = false
  }, [edit.error, edit.pending, edit.value])

  const submit = () => {
    if (finishedRef.current || edit.pending) return
    finishedRef.current = true
    edit.onSubmit()
  }

  return (
    <div className={cn("min-w-0 flex-1 overflow-hidden", className)} onClick={(event) => event.stopPropagation()}>
      <Input
        ref={inputRef}
        value={edit.value}
        disabled={edit.pending}
        aria-label={edit.mode === "create" ? "新文件夹名称" : "新名称"}
        aria-invalid={Boolean(edit.error)}
        className="h-8 w-full min-w-0 max-w-full border-transparent px-1 text-sm focus:border-transparent focus-visible:border-transparent"
        onChange={(event) => edit.onValueChange(event.target.value)}
        onBlur={() => {
          if (edit.value.trim()) submit()
          else edit.onCancel()
        }}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault()
            finishedRef.current = true
            edit.onCancel()
            return
          }
          if (event.key === "Enter" && !event.nativeEvent.isComposing) {
            event.preventDefault()
            submit()
          }
        }}
      />
      {edit.error ? (
        <p className="mt-1 truncate text-xs text-destructive" title={edit.error}>{edit.error}</p>
      ) : null}
    </div>
  )
}
