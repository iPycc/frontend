import * as React from "react"
import {
  IconDeviceFloppy,
  IconDownload,
  IconMaximize,
  IconMinimize,
  IconSettings,
  IconX,
} from "@tabler/icons-react"

import { buildDownloadUrl } from "@/api/files"
import { requestResponse } from "@/api/client"
import { type FileNode } from "@/lib/models"
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
  const { updateFileContent } = useAppState()
  const [fullscreen, setFullscreen] = React.useState(isMobile)
  const [content, setContent] = React.useState("")
  const [isDirty, setIsDirty] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)
  const lineNumbersRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    setFullscreen(isMobile)
  }, [isMobile, open])

  // Load real content from backend when an editable file is opened
  React.useEffect(() => {
    if (!file || !open) return

    const isText = ["txt", "md", "json", "log", "csv", "xml", "yaml", "yml", "ini", "conf"].includes(
      file.ext?.toLowerCase() ?? ""
    )
    const isCode = file.mediaType === "code" || ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "c", "cpp", "h", "css", "html", "sql", "sh"].includes(
      file.ext?.toLowerCase() ?? ""
    )
    const isEditable = isText || isCode

    if (!isEditable || !file.backendId) {
      setContent("")
      setIsDirty(false)
      return
    }

    setLoading(true)
    requestResponse(buildDownloadUrl(file.backendId))
      .then(async (response) => {
        const text = await response.text()
        setContent(text)
        setIsDirty(false)
      })
      .catch(() => {
        toast.error("文件内容加载失败")
        setContent("")
      })
      .finally(() => setLoading(false))
  }, [file?.id, file?.backendId, open])

  if (!file) return null

  const isText = ["txt", "md", "json", "log", "csv", "xml", "yaml", "yml", "ini", "conf"].includes(
    file.ext?.toLowerCase() ?? ""
  )
  const isCode = file.mediaType === "code" || ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "c", "cpp", "h", "css", "html", "sql", "sh"].includes(
    file.ext?.toLowerCase() ?? ""
  )
  const isPdf = file.ext?.toLowerCase() === "pdf"
  const isEditable = isText || isCode
  const canDownload = Boolean(file.backendId)
  const downloadUrl = file.backendId ? buildDownloadUrl(file.backendId) : ""

  const handleSave = () => {
    if (!file) return
    updateFileContent(file.id, content)
    setIsDirty(false)
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

  const handleDownload = async () => {
    if (!file || !file.backendId) return
    try {
      const response = await requestResponse(buildDownloadUrl(file.backendId), {
        headers: { Accept: "application/octet-stream" },
      })
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = file.name
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
    } catch {
      toast.error("下载失败")
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
            {!isEditable && canDownload && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs"
                onClick={() => void handleDownload()}
              >
                <IconDownload size={14} />
                下载
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
            loading ? (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                正在加载文件内容…
              </div>
            ) : (
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
            )
          ) : isPdf && canDownload ? (
            <iframe
              src={downloadUrl}
              title={file.name}
              className="h-full w-full border-0"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
              <div className="flex flex-col items-center gap-3">
                <FileGlyph item={file} />
                <span className="text-sm">暂不支持该格式在线预览</span>
                <span className="text-xs text-muted-foreground/60">{file.name}</span>
              </div>
              {canDownload && (
                <Button variant="outline" size="sm" onClick={() => void handleDownload()}>
                  <IconDownload size={14} className="mr-1.5" />
                  下载文件
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

