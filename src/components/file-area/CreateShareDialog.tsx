import * as React from "react"
import {
  IconArrowLeft,
  IconCheck,
  IconClock,
  IconCopy,
  IconDownload,
  IconExternalLink,
  IconEye,
  IconX,
} from "@tabler/icons-react"
import { motion, AnimatePresence } from "motion/react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { cn } from "@/lib/utils"
import { type FileNode, type ShareRecord } from "@/lib/models"

export type ShareOptions = {
  access: "public" | "password"
  password: string
  expiresInHours: number | null
  maxDownloads: number | null
}

interface CreateShareDialogProps {
  open: boolean
  nodes: FileNode[]
  onOpenChange: (open: boolean) => void
  onCreate: (nodeIds: string[], options: ShareOptions) => Promise<ShareRecord[]>
}

function generatePassword() {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

export function CreateShareDialog({ open, nodes, onOpenChange, onCreate }: CreateShareDialogProps) {
  const [step, setStep] = React.useState<"configure" | "result">("configure")
  const [usePassword, setUsePassword] = React.useState(false)
  const [customPassword, setCustomPassword] = React.useState(false)
  const [password, setPassword] = React.useState("")
  const [useExpiry, setUseExpiry] = React.useState(false)
  const [expiryValue, setExpiryValue] = React.useState(1)
  const [expiryUnit, setExpiryUnit] = React.useState<"hours" | "days">("days")
  const [useDownloadLimit, setUseDownloadLimit] = React.useState(false)
  const [downloadLimit, setDownloadLimit] = React.useState(1)
  const [records, setRecords] = React.useState<ShareRecord[]>([])
  const [creating, setCreating] = React.useState(false)
  const [copiedLink, setCopiedLink] = React.useState(false)
  const [copiedPassword, setCopiedPassword] = React.useState(false)

  React.useEffect(() => {
    if (open) {
      setStep("configure")
      setUsePassword(false)
      setCustomPassword(false)
      setPassword(generatePassword())
      setUseExpiry(false)
      setExpiryValue(1)
      setExpiryUnit("days")
      setUseDownloadLimit(false)
      setDownloadLimit(1)
      setRecords([])
      setCopiedLink(false)
      setCopiedPassword(false)
    }
  }, [open])

  const expiresInHours = React.useMemo(() => {
    if (!useExpiry) return null
    return expiryUnit === "days" ? expiryValue * 24 : expiryValue
  }, [useExpiry, expiryValue, expiryUnit])

  const maxDownloads = useDownloadLimit ? downloadLimit : null

  const access: "public" | "password" = usePassword ? "password" : "public"

  const handleCreate = async () => {
    if (nodes.length === 0 || creating) return
    setCreating(true)
    try {
      const result = await onCreate(
        nodes.map((node) => node.id),
        {
          access,
          password: usePassword ? password : "",
          expiresInHours,
          maxDownloads,
        }
      )
      setRecords(result)
      setStep("result")
    } finally {
      setCreating(false)
    }
  }

  const primaryRecord = records[0]
  const shareUrl = primaryRecord ? `${window.location.origin}/share/${primaryRecord.id}` : ""

  const handleCopyLink = async () => {
    if (!shareUrl) return
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 1500)
    } catch {
      // ignore
    }
  }

  const handleCopyPassword = async () => {
    if (!password) return
    try {
      await navigator.clipboard.writeText(password)
      setCopiedPassword(true)
      window.setTimeout(() => setCopiedPassword(false), 1500)
    } catch {
      // ignore
    }
  }

  const handleOpenLink = () => {
    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-[28rem] [&>button]:hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <h2 className="text-lg font-semibold">创建分享链接</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <IconX size={20} />
            <span className="sr-only">关闭</span>
          </button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
          <AnimatePresence mode="wait">
            {step === "configure" ? (
              <motion.div
                key="configure"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-2"
              >
                <OptionRow
                  icon={<IconEye size={20} />}
                  title="使用密码保护链接"
                  description="勾选后，需要使用密码访问分享链接。"
                  checked={usePassword}
                  onToggle={() => {
                    setUsePassword((v) => !v)
                    if (!usePassword && !password) {
                      setPassword(generatePassword())
                    }
                  }}
                />
                <AnimatePresence>
                  {usePassword ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="rounded-xl bg-muted/40 p-3">
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={customPassword}
                            onChange={(e) => {
                              setCustomPassword(e.target.checked)
                              if (!e.target.checked) {
                                setPassword(generatePassword())
                              }
                            }}
                            className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                          />
                          <span>自定义分享密码</span>
                        </label>
                        <AnimatePresence>
                          {customPassword ? (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              exit={{ opacity: 0, height: 0 }}
                              transition={{ duration: 0.15 }}
                              className="mt-2 overflow-hidden"
                            >
                              <div className="flex items-center gap-2">
                                <span className="shrink-0 text-sm font-medium">分享密码 *</span>
                                <Input
                                  type="text"
                                  value={password}
                                  onChange={(e) => setPassword(e.target.value)}
                                  placeholder="请输入分享密码"
                                  maxLength={32}
                                  className="flex-1"
                                />
                              </div>
                            </motion.div>
                          ) : null}
                        </AnimatePresence>
                        {!customPassword ? (
                          <p className="mt-2 text-xs text-muted-foreground">
                            已自动生成密码：<span className="font-mono font-medium text-foreground">{password}</span>
                          </p>
                        ) : null}
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <OptionRow
                  icon={<IconClock size={20} />}
                  title="超时自动过期"
                  description="设置分享链接的有效期限。"
                  checked={useExpiry}
                  onToggle={() => setUseExpiry((v) => !v)}
                />
                <AnimatePresence>
                  {useExpiry ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3">
                        <Input
                          type="number"
                          min={1}
                          value={expiryValue}
                          onChange={(e) => setExpiryValue(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 text-center"
                        />
                        <select
                          value={expiryUnit}
                          onChange={(e) => setExpiryUnit(e.target.value as "hours" | "days")}
                          className="h-9 rounded-md border border-input bg-background px-2 text-sm outline-none focus:ring-2 focus:ring-primary"
                        >
                          <option value="hours">小时</option>
                          <option value="days">天</option>
                        </select>
                        <span className="text-sm text-muted-foreground">后过期</span>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>

                <OptionRow
                  icon={<IconDownload size={20} />}
                  title="下载后自动过期"
                  description="达到指定下载次数后，链接自动失效。"
                  checked={useDownloadLimit}
                  onToggle={() => setUseDownloadLimit((v) => !v)}
                />
                <AnimatePresence>
                  {useDownloadLimit ? (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="flex items-center gap-2 rounded-xl bg-muted/40 p-3">
                        <Input
                          type="number"
                          min={1}
                          value={downloadLimit}
                          onChange={(e) => setDownloadLimit(Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-24 text-center"
                        />
                        <span className="text-sm text-muted-foreground">次下载</span>
                        <span className="ml-auto text-sm text-muted-foreground">后过期</span>
                      </div>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
                className="space-y-3"
              >
                {records.length === 1 && primaryRecord ? (
                  <>
                    <div className="rounded-2xl bg-muted/50 px-4 py-3.5">
                      <div className="text-xs font-medium text-muted-foreground">分享链接</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-lg font-medium">{shareUrl}</span>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                          title="复制链接"
                        >
                          {copiedLink ? <IconCheck size={22} className="text-emerald-500" /> : <IconCopy size={22} />}
                        </button>
                      </div>
                    </div>

                    {usePassword && password ? (
                      <div className="rounded-2xl bg-muted/50 px-4 py-3.5">
                        <div className="text-xs font-medium text-muted-foreground">分享密码</div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="min-w-0 flex-1 truncate text-lg font-mono font-medium">{password}</span>
                          <button
                            type="button"
                            onClick={handleCopyPassword}
                            className="shrink-0 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                            title="复制密码"
                          >
                            {copiedPassword ? <IconCheck size={22} className="text-emerald-500" /> : <IconCopy size={22} />}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="space-y-2">
                    {records.map((record) => {
                      const node = nodes.find((n) => n.id === String(record.nodeId ?? record.node_id))
                      const url = `${window.location.origin}/share/${record.id}`
                      return (
                        <div key={record.id} className="rounded-2xl bg-muted/50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-background">
                              <FileGlyph
                                item={
                                  node ?? {
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
                                  }
                                }
                                size={18}
                              />
                            </div>
                            <span className="min-w-0 flex-1 truncate text-sm font-medium">
                              {record.nodeName ?? "分享文件"}
                            </span>
                            <button
                              type="button"
                              onClick={() => navigator.clipboard.writeText(url).catch(() => {})}
                              className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-background hover:text-foreground"
                              title="复制链接"
                            >
                              <IconCopy size={18} />
                            </button>
                          </div>
                          <div className="mt-1 truncate text-sm text-muted-foreground">{url}</div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-between border-t border-border/60 px-5 py-3">
          {step === "configure" ? (
            <>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="返回"
              >
                <IconArrowLeft size={20} />
                <span className="sr-only">返回</span>
              </button>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  取消
                </Button>
                <Button
                  type="button"
                  onClick={() => void handleCreate()}
                  disabled={
                    creating ||
                    (usePassword && customPassword && !password.trim())
                  }
                >
                  {creating ? "创建中..." : "确定"}
                </Button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleOpenLink}
                className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                title="在新标签页打开"
              >
                <IconExternalLink size={20} />
                <span className="sr-only">打开链接</span>
              </button>
              <Button type="button" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function OptionRow({
  icon,
  title,
  description,
  checked,
  onToggle,
}: {
  icon: React.ReactNode
  title: string
  description: string
  checked: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-colors",
        checked
          ? "border-primary/40 bg-primary/5"
          : "border-border/60 bg-muted/20 hover:bg-muted/40"
      )}
    >
      <div
        className={cn(
          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors",
          checked ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        {icon}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{title}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>
      </div>
      <div
        className={cn(
          "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-border bg-background"
        )}
      >
        {checked ? <IconCheck size={14} strokeWidth={3} /> : null}
      </div>
    </button>
  )
}
