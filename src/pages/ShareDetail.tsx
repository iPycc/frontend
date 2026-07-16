import { useEffect, useMemo, useState } from "react"
import { useParams, useSearchParams } from "react-router-dom"
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
import { requestResponse } from "@/api/client"
import {
  buildSharedDownloadUrl,
  getShareInfo,
  verifySharePassword,
  type ShareNodeInfo,
} from "@/api/share"
import { cn } from "@/lib/utils"
import { ShareNotFound } from "./ShareNotFound"

function formatDate(value?: string | null) {
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

function formatExpiry(value?: string | null) {
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
  const [searchParams] = useSearchParams()
  const { shares, formatBytes, recordShareDownload } = useAppState()
  const [password, setPassword] = useState("")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [info, setInfo] = useState<ShareNodeInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [verifyingPassword, setVerifyingPassword] = useState(false)

  const localShare = useMemo(
    () => shares.find((record) => record.id === slug),
    [shares, slug]
  )

  usePageTitle(info?.node_name || localShare?.nodeName || "分享详情")

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setAccessToken(null)
    setPassword("")
    getShareInfo(slug)
      .then((data) => {
        if (cancelled) return
        setInfo(data)
        const urlPwd = searchParams.get("pwd")
        if (urlPwd && data.access === "password") {
          setPassword(urlPwd)
          verifySharePassword(slug, { password: urlPwd })
            .then((result) => {
              if (cancelled) return
              setAccessToken(result.access_token)
            })
            .catch(() => {
              // ignore auto-verify failure
            })
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof Error ? err.message : "分享不存在或已过期")
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [slug, searchParams])

  const requiresPassword = info ? info.access === "password" : localShare?.access === "密码访问"
  const expired = info
    ? info.expires_at !== null && new Date(info.expires_at) <= new Date()
    : localShare?.expiresAt
      ? new Date(localShare.expiresAt) <= new Date()
      : false
  const reachedDownloadLimit = info
    ? info.max_downloads !== null && info.download_count >= info.max_downloads
    : false
  const canAccess = !expired && !reachedDownloadLimit && (!requiresPassword || Boolean(accessToken))

  const displayName = info?.node_name || localShare?.nodeName || "未知文件"
  const displayKind: "folder" | "file" = info
    ? (info.node_type as "folder" | "file")
    : localShare?.nodeKind
      ? localShare.nodeKind
      : "file"
  const displaySize = localShare?.nodeSize
  const displayExt = localShare?.nodeExt
  const displayPreview = localShare?.nodePreview?.trim() || null
  const displayMediaType = localShare?.nodeMediaType
  const hasPreview = Boolean(displayPreview) && displayPreview.startsWith("/")

  const handleVerifyPassword = async () => {
    if (!slug || !password.trim() || verifyingPassword) {
      if (!password.trim()) toast.error("请输入访问密码")
      return
    }
    setVerifyingPassword(true)
    try {
      const result = await verifySharePassword(slug, { password })
      setAccessToken(result.access_token)
      toast.success("密码验证通过")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "密码验证失败")
    } finally {
      setVerifyingPassword(false)
    }
  }

  const handleCopyLink = async () => {
    if (!slug) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${slug}`)
      setCopied(true)
      toast.success("链接已复制")
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error("复制失败")
    }
  }

  const handleDownload = async () => {
    if (!slug || !canAccess || displayKind === "folder") return
    try {
      const response = await requestResponse(buildSharedDownloadUrl(slug, accessToken), {
        headers: { Accept: "application/octet-stream" },
      })
      const blob = await response.blob()
      const objectUrl = window.URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      anchor.href = objectUrl
      anchor.download = displayName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.URL.revokeObjectURL(objectUrl)
      recordShareDownload(slug)
      toast.success("开始下载")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "下载失败")
    }
  }

  if (loading) {
    return (
      <div className="mx-auto flex max-w-3xl flex-col items-center justify-center gap-4 py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">加载分享信息...</p>
      </div>
    )
  }

  if (error || !info) {
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
          {canAccess && hasPreview && displayMediaType === "image" ? (
            <img
              src={displayPreview!}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-3xl bg-card shadow-sm sm:h-28 sm:w-28">
              <FileGlyph
                item={{
                  id: info.share_id,
                  name: displayName,
                  kind: displayKind,
                  ext: displayExt,
                  mediaType: displayMediaType,
                  preview: displayPreview,
                  size: displaySize,
                  updatedAt: info.expires_at ?? "",
                  createdAt: "",
                  bucketId: "",
                  parentId: null,
                }}
                size={48}
              />
            </div>
          )}
        </div>

        <div className="p-5 sm:p-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="break-words text-xl font-semibold tracking-tight sm:text-2xl">
                {displayName}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <IconEye size={15} />
                  {info.view_count} 次访问
                </span>
                <span>·</span>
                <span className="flex items-center gap-1">
                  <IconDownload size={15} />
                  {info.download_count} 次下载
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleCopyLink}>
                {copied ? <IconFile size={15} /> : <IconCopy size={15} />}
                <span className="ml-1.5">{copied ? "已复制" : "复制链接"}</span>
              </Button>
              <Button
                size="sm"
                onClick={() => void handleDownload()}
                disabled={!canAccess || displayKind === "folder"}
                title={displayKind === "folder" ? "暂不支持文件夹下载" : ""}
              >
                <IconDownload size={16} className="mr-1.5" />
                下载
              </Button>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                info.access === "public"
                  ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                  : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
              )}
            >
              {info.access === "public" ? "公开访问" : "密码访问"}
            </span>
            <span
              className={cn(
                "rounded-full px-3 py-1 text-xs font-medium",
                expired
                  ? "bg-destructive/10 text-destructive"
                  : "bg-primary/10 text-primary"
              )}
            >
              {formatExpiry(info.expires_at)}
            </span>
            {displaySize ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {formatBytes(displaySize)}
              </span>
            ) : null}
            {displayKind === "folder" ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                文件夹
              </span>
            ) : displayExt ? (
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {displayExt.toUpperCase()}
              </span>
            ) : null}
          </div>

          {requiresPassword && !accessToken ? (
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
                    if (event.key === "Enter") void handleVerifyPassword()
                  }}
                  className="sm:flex-1"
                  autoFocus
                />
                <Button onClick={() => void handleVerifyPassword()} disabled={verifyingPassword}>
                  {verifyingPassword ? "验证中..." : "验证密码"}
                </Button>
              </div>
            </motion.div>
          ) : null}

          {expired ? (
            <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              该分享链接已过期，请联系分享者获取新的链接。
            </div>
          ) : null}

          {reachedDownloadLimit ? (
            <div className="mt-6 rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
              该分享链接已达到下载次数上限。
            </div>
          ) : null}

          <div className="mt-6 grid gap-3 border-t border-border/40 pt-6 text-sm text-muted-foreground sm:grid-cols-2">
            <div className="flex items-center gap-2">
              <IconClock size={15} />
              <span>有效期至 {info.expires_at ? formatDate(info.expires_at) : "永久"}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconShare size={15} />
              <span>短链接 /share/{info.share_id}</span>
            </div>
            <div className="flex items-center gap-2">
              <IconEye size={15} />
              <span>访问权限：{info.access === "public" ? "公开访问" : "密码访问"}</span>
            </div>
            {info.max_downloads ? (
              <div className="flex items-center gap-2">
                <IconDownload size={15} />
                <span>下载限制：{info.download_count}/{info.max_downloads} 次</span>
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>

      <p className="text-center text-xs text-muted-foreground">
        此页面由 Cloudrave 分享服务提供。若内容涉及侵权或违规，请联系我们处理。
      </p>
    </div>
  )
}
