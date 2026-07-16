import * as React from "react"
import { IconCheck, IconCopy, IconLink, IconShare3 } from "@tabler/icons-react"
import { motion, AnimatePresence } from "motion/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { cn } from "@/lib/utils"
import { type ShareRecord } from "@/lib/models"

interface ShareDialogProps {
  open: boolean
  records: ShareRecord[]
  onOpenChange: (open: boolean) => void
}

function getShareUrl(record: ShareRecord) {
  const origin = typeof window !== "undefined" ? window.location.origin : ""
  return `${origin}/share/${record.id}`
}

function getAccessBadgeClass(access: string) {
  return access.includes("密码")
    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
}

export function ShareDialog({ open, records, onOpenChange }: ShareDialogProps) {
  const [copiedId, setCopiedId] = React.useState<string | null>(null)

  const handleCopy = async (record: ShareRecord) => {
    try {
      await navigator.clipboard.writeText(getShareUrl(record))
      setCopiedId(record.id)
      window.setTimeout(() => setCopiedId(null), 1500)
    } catch {
      // ignore
    }
  }

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(records.map(getShareUrl).join("\n"))
    } catch {
      // ignore
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[34rem]">
        <div className="grid sm:grid-cols-[1.1fr_1.6fr]">
          <div className="relative flex flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/90 to-primary p-8 text-primary-foreground">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/20 shadow-lg backdrop-blur-sm">
              <IconShare3 size={40} stroke={1.5} />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold">分享链接</p>
              <p className="mt-1 text-sm text-primary-foreground/80">
                已生成 {records.length} 条分享链接
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-4 p-6">
            <DialogHeader className="text-left">
              <DialogTitle>复制分享链接</DialogTitle>
              <DialogDescription>
                链接有效期 7 天，可随时在“我的分享”中管理或撤销。
              </DialogDescription>
            </DialogHeader>

            <div className="max-h-[320px] space-y-3 overflow-y-auto pr-1">
              <AnimatePresence initial={false}>
                {records.map((record, index) => (
                  <motion.div
                    key={record.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ delay: index * 0.05, duration: 0.2 }}
                    className="rounded-xl border border-border/60 bg-muted/30 p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-background">
                        <FileGlyph
                          item={{
                            id: record.id,
                            name: record.nodeName ?? "分享文件",
                            kind: record.nodeKind ?? "file",
                            ext: record.nodeExt,
                            mediaType: record.nodeMediaType,
                            preview: record.nodePreview,
                            size: record.nodeSize,
                            updatedAt: record.createdAt,
                            createdAt: record.createdAt,
                            bucketId: "",
                            parentId: null,
                          }}
                          size={20}
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {record.nodeName ?? "分享文件"}
                        </p>
                        <div className="mt-0.5 flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded px-1.5 py-0.5 text-[10px] font-medium",
                              getAccessBadgeClass(record.access)
                            )}
                          >
                            {record.access}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            /share/{record.id}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center gap-2">
                      <div className="flex flex-1 items-center gap-2 overflow-hidden rounded-lg border border-border/60 bg-background px-3 py-2">
                        <IconLink size={14} className="shrink-0 text-muted-foreground" />
                        <span className="truncate text-xs text-muted-foreground">
                          {getShareUrl(record)}
                        </span>
                      </div>
                      <Button
                        size="icon-sm"
                        variant="outline"
                        className="shrink-0"
                        onClick={() => handleCopy(record)}
                      >
                        {copiedId === record.id ? (
                          <IconCheck size={16} className="text-emerald-600" />
                        ) : (
                          <IconCopy size={16} />
                        )}
                        <span className="sr-only">复制链接</span>
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                关闭
              </Button>
              {records.length > 1 ? (
                <Button type="button" onClick={() => void handleCopyAll()}>
                  复制全部
                </Button>
              ) : null}
            </DialogFooter>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
