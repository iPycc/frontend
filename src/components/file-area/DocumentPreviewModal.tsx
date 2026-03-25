import * as React from "react"
import {
  IconMaximize,
  IconMinimize,
  IconSettings,
  IconX,
  IconDeviceFloppy,
} from "@tabler/icons-react"

import { type FileNode } from "@/lib/mock-data"
import { useAppState } from "@/lib/app-state"
import { useIsMobile } from "@/hooks/use-mobile"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { FileGlyph } from "./FileGlyph"
import { toast } from "sonner"

interface DocumentPreviewModalProps {
  open: boolean
  file: FileNode | null
  onClose: () => void
}

export function DocumentPreviewModal({
  open,
  file,
  onClose,
}: DocumentPreviewModalProps) {
  const isMobile = useIsMobile()
  const { getFileContent, updateFileContent } = useAppState()
  const [fullscreen, setFullscreen] = React.useState(isMobile)
  const [content, setContent] = React.useState("")
  const [isDirty, setIsDirty] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setFullscreen(isMobile)
  }, [isMobile, open])

  // Load content when file changes
  React.useEffect(() => {
    if (file) {
      setContent(getFileContent(file.id))
      setIsDirty(false)
    }
  }, [file?.id, open])

  if (!file) return null

  const isText = ["txt", "md", "json", "log", "csv", "xml", "yaml", "yml", "ini", "conf"].includes(
    file.ext?.toLowerCase() ?? ""
  )
  const isCode = file.mediaType === "code" || ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "c", "cpp", "h", "css", "html", "sql", "sh"].includes(
    file.ext?.toLowerCase() ?? ""
  )
  const isPdf = file.ext?.toLowerCase() === "pdf"
  const isEditable = isText || isCode

  const handleSave = () => {
    if (!file) return
    updateFileContent(file.id, content)
    setIsDirty(false)
    toast.success("已保存")
  }

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value)
    setIsDirty(true)
  }

  const handleScroll = () => {
    if (lineNumbersRef.current && textareaRef.current) {
      lineNumbersRef.current.scrollTop = textareaRef.current.scrollTop
    }
  }

  // Ctrl+S / Cmd+S to save
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault()
      handleSave()
    }
  }

  const lineCount = (content || "").split("\n").length

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        showCloseButton={false}
        className={
          fullscreen
            ? "flex h-[100dvh] w-[100dvw] max-w-none flex-col gap-0 rounded-none border-none bg-background p-0"
            : "flex h-[80dvh] w-[min(95vw,56rem)] max-w-none flex-col gap-0 rounded-xl p-0"
        }
      >
        {/* Toolbar */}
        <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
          <div className="flex items-center gap-2">
            {isEditable && (
              <Button
                variant="secondary"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={handleSave}
                disabled={!isDirty}
              >
                <IconDeviceFloppy size={14} />
                {isDirty ? "保存*" : "已保存"}
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm">
                  <IconSettings size={16} />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>编码</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>UTF-8</DropdownMenuItem>
                    <DropdownMenuItem>GBK</DropdownMenuItem>
                    <DropdownMenuItem>ISO-8859-1</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>文本类型</DropdownMenuSubTrigger>
                  <DropdownMenuSubContent>
                    <DropdownMenuItem>纯文本</DropdownMenuItem>
                    <DropdownMenuItem>Markdown</DropdownMenuItem>
                    <DropdownMenuItem>JSON</DropdownMenuItem>
                  </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuItem>自动换行</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5">
              <FileGlyph item={file} />
              <span className="text-sm text-foreground">{file.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setFullscreen((v) => !v)}
            >
              {fullscreen ? <IconMinimize size={16} /> : <IconMaximize size={16} />}
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <IconX size={16} />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden bg-background">
          {isEditable ? (
            <div className="flex h-full">
              {/* Line numbers */}
              <div
                ref={lineNumbersRef}
                className="select-none shrink-0 w-12 overflow-hidden bg-muted/30 border-r border-border text-right"
                style={{ overflowY: "hidden" }}
              >
                <div className="font-mono text-sm pt-0">
                  {Array.from({ length: lineCount }, (_, i) => (
                    <div key={i} className="px-3 text-muted-foreground/50" style={{ lineHeight: "1.625rem" }}>
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
              {/* Editor */}
              <textarea
                ref={textareaRef}
                value={content}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                onScroll={handleScroll}
                spellCheck={false}
                className="flex-1 resize-none bg-background font-mono text-sm text-foreground outline-none p-0 px-2 overflow-auto"
                placeholder="空文件，开始输入..."
                style={{ lineHeight: "1.625rem" }}
              />
            </div>
          ) : isPdf ? (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <FileGlyph item={file} />
                <span className="text-sm">PDF 预览（模拟）</span>
                <span className="text-xs text-muted-foreground/60">{file.name}</span>
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <FileGlyph item={file} />
                <span className="text-sm">文档预览（模拟）</span>
                <span className="text-xs text-muted-foreground/60">{file.name}</span>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
