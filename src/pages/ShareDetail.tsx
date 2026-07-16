import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { toast } from "sonner"
import { motion } from "motion/react"
import {
  IconClock,
  IconCopy,
  IconDownload,
  IconEye,
  IconFile,
  IconLock,
  IconShare,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { buildDownloadUrl } from "@/api/files"
import { requestResponse } from "@/api/client"
import { cn } from "@/lib/utils"
import { type FileNode } from "@/lib/models"
import { ShareNotFound } from "./ShareNotFound"

function formatDate(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function formatExpiry(value?: string) {
  if (!value) return "永久有效"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diff = date.getTime() - Date.now()
  if (diff < 0) return "已过期"
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24))
  if (days <= 1) return "今天过期"
  return `${days} 天后过期`
}

export function ShareDetail() {
  const { slug } = useParams<{ slug: string }>()
  const { shares, getNodeById, formatBytes, recordShareView, recordShareDownload } = useAppState()
  const [password, setPassword] = useState("")
  const [passwordVerified, setPasswordVerified] = useState(false)
  const [copied, setCopied] = useState(false)

  const share = useMemo(() => shares.find((record) => record.id === slug), [shares, slug])

  const node: FileNode | undefined = useMemo(() => {
    if (!share) return undefined
    const realNode = getNodeById(share.nodeId)
    if (realNode) return realNode
    if (!share.nodeName) return undefined
    return {
      id: share.nodeId,
      bucketId: "",
      kind: share.nodeKind ?? "file",
      name: share.nodeName,
      ext: share.nodeExt,
      size: share.nodeSize,
      mediaType: share.nodeMediaType,
      preview: share.nodePreview,
      updatedAt: share.createdAt,
    } as FileNode
  }, [share, getNodeById])

  usePageTitle(share?.nodeName || "分享详情")

  useEffect(() => {
    if (share && !share.expiresAt) {
      recordShareView(share.id)
    } else if (share && new Date(share.expiresAt) > new Date()) {
      recordShareView(share.id)
    }
  }, [share, recordShareView])

  const requiresPassword = share?.access === "密码访问"
  const expired = share?.expiresAt ? new Date(share.expiresAt) <= new Date() : false
  const canAccess = !expired && (!requiresPassword || passwordVerified)

  const handleVerifyPassword = () => {
    if (!password.trim()) {
      toast.error("请输入访问密码")
      return
    }
    setPasswordVerified(true)
    toast.success("密码验证通过")
  }

  const handleCopyLink = async () => {
    if (!share) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${share.id}`)
      setCopied(true)
      toast.success("链接已复制")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("复制失败")
    }
  }

  const handleDownload = async () => {
    if (!share || !node) return
    const backendId = node.backendId
    if (!backendId) {
      toast.info("源文件已被删除或暂无可下载内容")
      return
    }

    try {
      const response = await requestResponse(buildDownloadUrl(backendId), {
        headers: { Accept: "application/octet-stream" },
      })
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = node.name
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
      recordShareDownload(share.id)
      toast.success("开始下载")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载失败")
    }
  }

  if (!share) {
    return <ShareNotFound />
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm"
      >
        <div className="relative flex aspect-[16/7] items-center justify-center bg-gradient-to-br from-primary/10 via-background to-muted sm:aspect-[16/6]">
          {canAccess && node?.preview && node.mediaType === "image" ? (
            <img
              src={node.preview}
              alt={node.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-card shadow-sm sm:h-28 sm:w-28">
              {node ? (
                <FileGlyph item={node} size={48} />
              ) : (
                <IconFile size={48} className="text-muted-foreground" />
              )}
            </div>
          )}
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
                {node?.name || share.nodeName || "未知文件"}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <IconEye size={15} />
                  {share.views || 0} 次访问
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <IconDownload size={15} />
                  {share.downloads || 0} 次下载
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <IconFile size={15} /> : <IconCopy size={15} />}
                <span className="ml-1.5">{copied ? "已复制" : "复制链接"}</span>
              </Button>
              <Button size="sm" onClick={handleDownload} disabled={!canAccess}>
                <IconDownload size={16} className="mr-1.5" />
                下载
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                share.access === "公开访问"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              {share.access}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                expired
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              )}
            >
              {formatExpiry(share.expiresAt)}
            </span>
            {node?.size ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatBytes(node.size)}
              </span>
            ) : null}
            {node?.kind === "folder" ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                文件夹
              </span>
            ) : node?.ext ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {node.ext.toUpperCase()}
              </span>
            ) : null}
          </div>

          {requiresPassword && !passwordVerified ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="mt-6 overflow-hidden rounded-xl border border-border/60 bg-muted/40 p-4"
            >
              <div className="flex items-center gap-2 text-sm font-medium">
                <IconLock size={16} />
                此分享需要密码访问
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Input
                  type="password"
                  placeholder="输入访问密码"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") handleVerifyPassword()
                  }}
                  className="sm:flex-1"
                />
                <Button onClick={handleVerifyPassword}>验证密码</Button>
              </div>
            </motion.div>
          ) : null}

          {expired ? (
            <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              该分享链接已过期，请联系分享者获取新的链接。
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 border-t border-border/40 pt-6 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <IconClock size={15} />
              <span>创建于 {formatDate(share.createdAt)}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconClock size={15} />
              <span>有效期至 {share.expiresAt ? formatDate(share.expiresAt) : "永久"}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconShare size={15} />
              <span>短链接 /share/{share.id}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconEye size={15} />
              <span>访问权限：{share.access}</span>
            </div>
          </div>
        </div>
      </motion.div>

      <p className="text-center text-xs text-muted-foreground">
        此页面由 Cloudrave 分享服务提供。若内容涉及侵权或违规，请联系我们处理。
      </p>
    </div>
  )
}
