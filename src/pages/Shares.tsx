import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent } from "react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"
import { motion, AnimatePresence } from "motion/react"
import {
  IconCopy,
  IconEdit,
  IconExternalLink,
  IconEye,
  IconFolderOff,
  IconRefresh,
  IconShare,
  IconTrash,
  IconChevronDown,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

type SortOption = "newest" | "oldest" | "views"

function formatRelativeTime(value?: string) {
  if (!value) return "-"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / (1000 * 60))
  if (minutes < 1) return "刚刚"
  if (minutes < 60) return `${minutes} 分钟前`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} 小时前`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days} 天前`
  return date.toLocaleDateString("zh-CN")
}

export function Shares() {
  usePageTitle("我的分享")
  const navigate = useNavigate()
  const { getShareRecords, deleteShares, loadShares, sharesLoading, isAuthenticated } = useAppState()
  const shares = getShareRecords()
  const [sortBy, setSortBy] = useState<SortOption>("newest")
  const [sortOpen, setSortOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const sortRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isAuthenticated) {
      void loadShares().catch((error: unknown) => {
        toast.error(error instanceof Error ? error.message : "分享加载失败")
      })
    }
  }, [isAuthenticated, loadShares])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
      if (sortRef.current && !sortRef.current.contains(e.target as Node)) {
        setSortOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const sortedShares = [...shares].sort((a, b) => {
    if (sortBy === "newest") {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    if (sortBy === "oldest") {
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    }
    return (b.views || 0) - (a.views || 0)
  })

  const handleCopy = async (slug: string) => {
    const url = `${window.location.origin}/share/${slug}`
    try {
      await navigator.clipboard.writeText(url)
      toast.success("分享链接已复制到剪贴板")
    } catch {
      toast.error("复制失败")
    }
    setContextMenu(null)
  }

  const handleOpen = (slug: string) => {
    window.open(`/share/${slug}`, "_blank", "noopener,noreferrer")
    setContextMenu(null)
  }

  const handleDelete = async (id: string) => {
    await deleteShares([id])
    toast.success("分享链接已删除")
    setContextMenu(null)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await loadShares()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "分享加载失败")
    } finally {
      setRefreshing(false)
    }
  }

  const handleContextMenu = (e: ReactMouseEvent, id: string) => {
    e.preventDefault()
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setContextMenu({ id, x: rect.left, y: rect.bottom + 4 })
  }

  const sortLabels: Record<SortOption, string> = {
    newest: "最新",
    oldest: "最早",
    views: "访问最多",
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
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">我的分享</h1>
          <button
            type="button"
            onClick={handleRefresh}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            title="刷新"
          >
            <IconRefresh size={22} className={cn(refreshing && "animate-spin")} />
          </button>
        </div>

        <div ref={sortRef} className="relative">
          <button
            type="button"
            onClick={() => setSortOpen((v) => !v)}
            className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-card px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50"
          >
            {sortLabels[sortBy]}
            <IconChevronDown size={16} className={cn("transition-transform", sortOpen && "rotate-180")} />
          </button>
          <AnimatePresence>
            {sortOpen ? (
              <motion.div
                initial={{ opacity: 0, y: -4, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-full z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-border/60 bg-popover shadow-lg"
              >
                {(Object.keys(sortLabels) as SortOption[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setSortBy(key)
                      setSortOpen(false)
                    }}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-sm transition-colors hover:bg-muted",
                      sortBy === key ? "text-primary font-medium" : "text-foreground"
                    )}
                  >
                    {sortLabels[key]}
                  </button>
                ))}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {sharesLoading && sortedShares.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="正在加载分享">
          {Array.from({ length: 8 }, (_, index) => (
            <Skeleton key={index} className="h-[74px] w-full rounded-xl" />
          ))}
        </div>
      ) : sortedShares.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {sortedShares.map((item, index) => {
            const node = item.node
            const expired = item.expiresAt ? new Date(item.expiresAt) <= new Date() : false
            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.03, duration: 0.2 }}
                onContextMenu={(e) => handleContextMenu(e, item.id)}
                className={cn(
                  "group relative flex cursor-pointer items-center gap-3 rounded-2xl border border-border/60 bg-card px-4 py-3.5 shadow-sm transition-all hover:border-border hover:shadow-md",
                  expired && "opacity-60"
                )}
                onClick={() => handleOpen(item.id)}
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center">
                  {node ? <FileGlyph item={node} size={28} /> : <IconShare size={24} className="text-muted-foreground" />}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-medium" title={node?.name || "已删除文件"}>
                    {node?.name || "已删除文件"}
                  </h3>
                  <p className="mt-0.5 truncate text-sm text-muted-foreground">
                    {formatRelativeTime(item.createdAt)}
                    {item.maxDownloads ? ` · ${item.downloads || 0}/${item.maxDownloads} 次` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                  <IconEye size={16} />
                  <span>{item.views || 0}</span>
                </div>

                {expired ? (
                  <div className="absolute -top-2 right-2 rounded-full bg-destructive px-2 py-0.5 text-[10px] font-medium text-destructive-foreground">
                    已过期
                  </div>
                ) : null}
              </motion.div>
            )
          })}
        </div>
      )}

      <AnimatePresence>
        {contextMenu ? (
          <motion.div
            ref={menuRef}
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.12 }}
            style={{ left: contextMenu.x, top: contextMenu.y }}
            className="fixed z-50 min-w-[180px] overflow-hidden rounded-xl border border-border/60 bg-popover py-1 shadow-xl"
          >
            <button
              type="button"
              onClick={() => handleOpen(contextMenu.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <IconExternalLink size={16} className="text-muted-foreground" />
              打开
            </button>
            <button
              type="button"
              onClick={() => handleCopy(contextMenu.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <IconCopy size={16} className="text-muted-foreground" />
              复制链接到剪贴板
            </button>
            <button
              type="button"
              onClick={() => setContextMenu(null)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm transition-colors hover:bg-muted"
            >
              <IconEdit size={16} className="text-muted-foreground" />
              编辑
            </button>
            <div className="my-1 h-px bg-border/60" />
            <button
              type="button"
              onClick={() => handleDelete(contextMenu.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-destructive transition-colors hover:bg-destructive/10"
            >
              <IconTrash size={16} />
              删除
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
