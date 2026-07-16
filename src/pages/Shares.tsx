import { useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { motion } from "motion/react"
import {
  IconCopy,
  IconDownload,
  IconEye,
  IconLink,
  IconShare,
  IconTrash,
  IconFolderOff,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { cn } from "@/lib/utils"

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

export function Shares() {
  usePageTitle("我的分享")
  const navigate = useNavigate()
  const { getShareRecords, deleteShares, formatBytes, isAuthenticated } = useAppState()
  const shares = getShareRecords()

  const stats = useMemo(() => {
    const active = shares.filter((item) => !item.expiresAt || new Date(item.expiresAt) > new Date()).length
    const views = shares.reduce((sum, item) => sum + (item.views || 0), 0)
    const downloads = shares.reduce((sum, item) => sum + (item.downloads || 0), 0)
    return { total: shares.length, active, views, downloads }
  }, [shares])

  const handleCopy = async (slug: string) => {
    const url = `${window.location.origin}/share/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("分享链接已复制")
    } catch {
      toast.error("复制失败")
    }
  }

  const handleDelete = (id: string) => {
    deleteShares([id])
    toast.success("分享链接已删除")
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
          <IconShare size={32} className="text-muted-foreground" />
        </div>
        <h2 className="mt-4 text-lg font-semibold">请先登录</h2>
        <p className="mt-1 text-sm text-muted-foreground">登录后即可查看和管理你的分享链接。</p>
        <Button className="mt-5" onClick={() => navigate("/login")}>
          前往登录
        </Button>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="relative overflow-hidden rounded-2xl border border-border/60 bg-card p-6 shadow-sm sm:p-8">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">我的分享</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              管理和追踪你分享给他人的文件链接，随时复制或撤销访问权限。
            </p>
          </div>
          <Button onClick={() => navigate("/app")}>
            <IconShare size={16} className="mr-1.5" />
            去分享文件
          </Button>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "分享总数", value: stats.total },
            { label: "有效链接", value: stats.active },
            { label: "总访问量", value: stats.views },
            { label: "总下载量", value: stats.downloads },
          ].map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05, duration: 0.25 }}
              className="rounded-xl border border-border/50 bg-background/70 p-4"
            >
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="mt-1 text-xl font-semibold">{stat.value.toLocaleString("zh-CN")}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {shares.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border/60 bg-card p-12 text-center shadow-sm">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <IconFolderOff size={36} className="text-muted-foreground" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">还没有分享链接</h2>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            在「我的文件」中选择文件或文件夹，点击分享即可生成短链接。
          </p>
          <Button className="mt-5" onClick={() => navigate("/app")}>
            去创建分享
          </Button>
        </div>
      ) : (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shares.map((item, index) => {
            const node = item.node
            const url = `${window.location.origin}/share/${item.id}`
            const expired = item.expiresAt ? new Date(item.expiresAt) <= new Date() : false

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                className="group flex flex-col rounded-2xl border border-border/60 bg-card p-5 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-muted">
                    {node ? <FileGlyph item={node} size={22} /> : <IconLink size={22} className="text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium" title={node?.name || "已删除文件"}>
                      {node?.name || "已删除文件"}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {node?.kind === "folder" ? "文件夹" : node?.ext?.toUpperCase() || "文件"}
                      {node?.size ? ` · ${formatBytes(node.size)}` : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-lg border border-border/50 bg-muted/40 px-2.5 py-1.5">
                    <IconLink size={14} className="shrink-0 text-muted-foreground" />
                    <span className="min-w-0 truncate text-xs text-muted-foreground">/share/{item.id}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="icon-xs"
                    onClick={() => handleCopy(item.id)}
                    aria-label="复制链接"
                  >
                    <IconCopy size={13} />
                  </Button>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      item.access === "公开访问"
                        ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                        : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {item.access}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-medium",
                      expired
                        ? "bg-destructive/10 text-destructive"
                        : "bg-primary/10 text-primary"
                    )}
                  >
                    {formatExpiry(item.expiresAt)}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <IconEye size={14} />
                      {item.views || 0}
                    </span>
                    <span className="flex items-center gap-1">
                      <IconDownload size={14} />
                      {item.downloads || 0}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon-xs" onClick={() => handleCopy(item.id)} aria-label="复制">
                      <IconCopy size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      aria-label="删除"
                    >
                      <IconTrash size={13} />
                    </Button>
                  </div>
                </div>

                <p className="mt-3 text-[11px] text-muted-foreground">创建于 {formatDate(item.createdAt)}</p>
              </motion.div>
            )
          })}
        </section>
      )}
    </div>
  )
}
