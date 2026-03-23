import * as React from "react"
import {
  IconMaximize,
  IconMinimize,
  IconSettings,
  IconX,
} from "@tabler/icons-react"

import { type FileNode } from "@/lib/mock-data"
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

interface DocumentPreviewModalProps {
  open: boolean
  file: FileNode | null
  onClose: () => void
}

/** Mock text content for text file preview */
const MOCK_TEXT_LINES = [
  "# Cloudrave 项目说明",
  "",
  "这是一个云存储管理平台的前端项目。",
  "支持多种存储后端，包括腾讯云 COS、阿里云 OSS 等。",
  "",
  "## 功能特性",
  "- 文件上传与下载",
  "- 文件夹管理",
  "- 文件分享",
  "- 离线下载",
]

export function DocumentPreviewModal({
  open,
  file,
  onClose,
}: DocumentPreviewModalProps) {
  const isMobile = useIsMobile()
  const [fullscreen, setFullscreen] = React.useState(isMobile)

  React.useEffect(() => {
    setFullscreen(isMobile)
  }, [isMobile, open])

  if (!file) return null

  const isText = ["txt", "md", "json", "log", "csv", "xml", "yaml", "yml", "ini", "conf"].includes(
    file.ext?.toLowerCase() ?? ""
  )
  const isCode = file.mediaType === "code" || ["ts", "tsx", "js", "jsx", "py", "go", "rs", "java", "c", "cpp", "h", "css", "html", "sql", "sh"].includes(
    file.ext?.toLowerCase() ?? ""
  )
  const isPdf = file.ext?.toLowerCase() === "pdf"

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
            <Button variant="secondary" size="sm" className="gap-1.5 text-xs">
              保存
            </Button>
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
        <div className="flex-1 overflow-auto bg-background p-0">
          {(isText || isCode) ? (
            <div className="font-mono text-sm leading-relaxed">
              {MOCK_TEXT_LINES.map((line, i) => (
                <div key={i} className="flex hover:bg-muted/50">
                  <span className="inline-block w-12 shrink-0 select-none px-3 text-right text-muted-foreground/50">
                    {i + 1}
                  </span>
                  <span className="flex-1 whitespace-pre-wrap px-2 text-foreground">
                    {line || "\u00A0"}
                  </span>
                </div>
              ))}
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
