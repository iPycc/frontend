import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconCopy,
  IconDownload,
  IconEye,
  IconFile,
  IconFolder,
  IconHome,
  IconLock,
} from "@tabler/icons-react"

import type { PreviewManifest } from "@/api/files"
import {
  buildSharedCoverUrl,
  buildSharedDownloadUrl,
  buildSharedPreviewUrl,
  getShareInfo,
  listSharedNodes,
  verifySharePassword,
  type SharedNode,
  type ShareNodeInfo,
} from "@/api/share"
import { PreviewRenderer } from "@/components/file-area/preview/PreviewRenderer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { cn } from "@/lib/utils"
import { ShareNotFound } from "./ShareNotFound"

const imageExtensions = new Set(["apng", "avif", "bmp", "gif", "heic", "jpeg", "jpg", "png", "svg", "tif", "tiff", "webp"])
const videoExtensions = new Set(["avi", "m4v", "mkv", "mov", "mp4", "webm"])
const audioExtensions = new Set(["aac", "flac", "m4a", "mp3", "ogg", "opus", "wav"])
const officeExtensions = new Set(["doc", "docx", "ppt", "pptx", "xls", "xlsx"])
const textExtensions = new Set(["c", "conf", "cpp", "cs", "css", "go", "h", "html", "ini", "java", "js", "json", "jsx", "log", "md", "php", "py", "rb", "rs", "sh", "sql", "ts", "tsx", "txt", "xml", "yaml", "yml"])

function extensionOf(name: string) {
  return name.includes(".") ? name.split(".").pop()?.toLowerCase() ?? "" : ""
}

function previewKind(extension: string): PreviewManifest["kind"] {
  if (imageExtensions.has(extension)) return "image"
  if (videoExtensions.has(extension)) return "video"
  if (audioExtensions.has(extension)) return "audio"
  if (extension === "pdf") return "pdf"
  if (officeExtensions.has(extension)) return "office"
  if (textExtensions.has(extension)) return "text"
  return "unsupported"
}

function mimeType(kind: PreviewManifest["kind"], extension: string) {
  if (kind === "image") return `image/${extension === "jpg" ? "jpeg" : extension}`
  if (kind === "video") return `video/${extension === "m4v" ? "mp4" : extension}`
  if (kind === "audio") return `audio/${extension}`
  if (kind === "pdf") return "application/pdf"
  if (kind === "text") return "text/plain; charset=utf-8"
  return "application/octet-stream"
}

function buildShareManifest(
  info: ShareNodeInfo,
  node: SharedNode,
  source: string,
  cover?: string
): PreviewManifest {
  const extension = extensionOf(node.name)
  const kind = previewKind(extension)
  const absoluteSource = new URL(source, window.location.origin).href
  const publicSourceReady = window.location.protocol === "https:" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
  const assets: PreviewManifest["assets"] = {
    source: { url: source, mime_type: mimeType(kind, extension), size: node.size, supports_range: true },
  }
  if (kind === "audio" && cover) {
    assets.cover = { url: cover, mime_type: "image/webp", supports_range: true }
  }
  if (kind === "office") {
    assets.office_source = { url: absoluteSource, mime_type: "application/octet-stream", size: node.size, supports_range: true }
    assets.office_viewer = {
      url: `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(absoluteSource)}`,
      mime_type: "text/html",
      supports_range: false,
    }
  }
  return {
    node_id: node.id,
    name: node.name,
    version: `share-${info.share_id}-${node.id}`,
    kind,
    status: kind === "unsupported" ? "unsupported" : "ready",
    mime_type: mimeType(kind, extension),
    size: node.size,
    metadata: {
      extension,
      external_service: kind === "office" ? "Microsoft Office Web Viewer" : undefined,
      public_source_ready: kind === "office" ? publicSourceReady : undefined,
      max_bytes: 5 * 1024 * 1024,
    },
    assets,
    capabilities: kind === "text" ? ["syntax"] : [],
    requires_preparation: false,
    preparation_available: false,
    error: null,
  }
}

function formatExpiry(value?: string | null) {
  if (!value) return "永久有效"
  const diff = new Date(value).getTime() - Date.now()
  if (diff < 0) return "已过期"
  const days = Math.ceil(diff / 86_400_000)
  return days <= 1 ? "今天过期" : `${days} 天后过期`
}

function formatSharedContentCount(folderCount: number, fileCount: number) {
  const parts: string[] = []
  if (folderCount > 0) parts.push(`${folderCount} 个文件夹`)
  if (fileCount > 0) parts.push(`${fileCount} 个文件`)
  return parts.join("、") || "内容"
}

export function ShareDetail() {
  const { slug } = useParams<{ slug: string }>()
  const [searchParams] = useSearchParams()
  const { formatBytes, recordShareDownload } = useAppState()
  const [password, setPassword] = useState("")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [info, setInfo] = useState<ShareNodeInfo | null>(null)
  const [nodes, setNodes] = useState<SharedNode[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<SharedNode[]>([])
  const [selected, setSelected] = useState<SharedNode | null>(null)
  const [loading, setLoading] = useState(true)
  const [folderLoading, setFolderLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [mediaDimensions, setMediaDimensions] = useState<{ width: number; height: number } | null>(null)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))

  usePageTitle(info ? `${info.owner_name} 的分享` : "分享详情")

  useEffect(() => {
    const updateViewport = () => setViewport({ width: window.innerWidth, height: window.innerHeight })
    window.addEventListener("resize", updateViewport)
    return () => window.removeEventListener("resize", updateViewport)
  }, [])

  const applyInfo = (data: ShareNodeInfo) => {
    setInfo(data)
    setNodes(data.items)
    setBreadcrumbs([])
    setSelected(data.items.length === 1 && data.items[0].type === "file" ? data.items[0] : null)
  }

  useEffect(() => {
    if (!slug) return
    let cancelled = false
    setLoading(true)
    setError(null)
    setAccessToken(null)
    setPassword("")
    void getShareInfo(slug)
      .then(async (data) => {
        if (cancelled) return
        applyInfo(data)
        const urlPassword = searchParams.get("pwd")
        if (urlPassword && data.access === "password") {
          setPassword(urlPassword)
          try {
            const result = await verifySharePassword(slug, { password: urlPassword })
            const revealed = await getShareInfo(slug, result.access_token)
            if (!cancelled) { setAccessToken(result.access_token); applyInfo(revealed) }
          } catch {
            // Keep the inline password form visible.
          }
        }
      })
      .catch((reason: unknown) => !cancelled && setError(reason instanceof Error ? reason.message : "分享不存在或已过期"))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [searchParams, slug])

  const requiresPassword = info?.access === "password"
  const expired = Boolean(info?.expires_at && new Date(info.expires_at) <= new Date())
  const reachedDownloadLimit = Boolean(info?.max_downloads !== null && info && info.download_count >= (info.max_downloads ?? Infinity))
  const canAccess = Boolean(info && !expired && !reachedDownloadLimit && (!requiresPassword || accessToken))
  const previewSource = slug && selected ? buildSharedPreviewUrl(slug, accessToken, selected.id) : ""
  const coverSource = slug && selected && selected.type === "file" && audioExtensions.has(extensionOf(selected.name))
    ? buildSharedCoverUrl(slug, accessToken, selected.id)
    : undefined
  const manifest = useMemo(
    () => info && selected?.type === "file" && canAccess ? buildShareManifest(info, selected, previewSource, coverSource) : null,
    [canAccess, coverSource, info, previewSource, selected]
  )

  useEffect(() => {
    setMediaDimensions(null)
    if (!manifest || (manifest.kind !== "image" && manifest.kind !== "video")) return
    if (manifest.kind === "image") {
      const image = new Image()
      image.onload = () => image.naturalWidth && image.naturalHeight && setMediaDimensions({ width: image.naturalWidth, height: image.naturalHeight })
      image.src = manifest.assets.source.url
      return () => { image.onload = null }
    }
    const video = document.createElement("video")
    video.preload = "metadata"
    video.onloadedmetadata = () => video.videoWidth && video.videoHeight && setMediaDimensions({ width: video.videoWidth, height: video.videoHeight })
    video.src = manifest.assets.source.url
    return () => { video.onloadedmetadata = null; video.removeAttribute("src"); video.load() }
  }, [manifest])

  const adaptiveMedia = manifest?.kind === "image" || manifest?.kind === "video"
  const mediaRatio = mediaDimensions ? mediaDimensions.width / mediaDimensions.height : null
  const shareOuterWidth = Math.max(280, Math.min(1152, viewport.width - 32))
  const shareAsideSpace = viewport.width >= 1024 ? 308 : 0
  const shareAvailableWidth = Math.max(280, shareOuterWidth - shareAsideSpace)
  const shareToolbarHeight = manifest?.kind === "image" ? 48 : 0
  const shareStageMaxHeight = Math.max(240, viewport.height * 0.7 - shareToolbarHeight)
  const shareMediaWidth = mediaDimensions && mediaRatio
    ? Math.min(mediaDimensions.width, shareAvailableWidth, shareStageMaxHeight * mediaRatio)
    : null
  const shareMediaHeight = shareMediaWidth && mediaRatio
    ? shareMediaWidth / mediaRatio + shareToolbarHeight
    : null

  const verifyPassword = async () => {
    if (!slug || !password.trim() || verifyingPassword) {
      if (!password.trim()) toast.error("请输入访问密码")
      return
    }
    setVerifyingPassword(true)
    try {
      const result = await verifySharePassword(slug, { password })
      const revealed = await getShareInfo(slug, result.access_token)
      setAccessToken(result.access_token)
      applyInfo(revealed)
      toast.success("密码验证通过")
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "密码验证失败")
    } finally {
      setVerifyingPassword(false)
    }
  }

  const openFolder = async (folder: SharedNode) => {
    if (!slug || !canAccess) return
    setFolderLoading(true)
    try {
      const children = await listSharedNodes(slug, folder.id, accessToken)
      setBreadcrumbs((current) => [...current, folder])
      setNodes(children)
      setSelected(null)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "文件夹加载失败")
    } finally {
      setFolderLoading(false)
    }
  }

  const navigateTo = async (index: number) => {
    if (!slug) return
    const nextCrumbs = breadcrumbs.slice(0, index + 1)
    const parent = nextCrumbs.at(-1)
    setFolderLoading(true)
    try {
      const nextNodes = parent ? await listSharedNodes(slug, parent.id, accessToken) : info?.items ?? []
      setBreadcrumbs(nextCrumbs)
      setNodes(nextNodes)
      setSelected(null)
    } finally {
      setFolderLoading(false)
    }
  }

  const copyLink = async () => {
    if (!slug) return
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/share/${slug}`)
      setCopied(true)
      toast.success("分享链接已复制")
      window.setTimeout(() => setCopied(false), 1600)
    } catch { toast.error("复制失败") }
  }

  const download = (node: SharedNode) => {
    if (!slug || !canAccess || node.type === "folder") return
    const anchor = document.createElement("a")
    anchor.href = buildSharedDownloadUrl(slug, accessToken, node.id)
    anchor.download = node.name
    anchor.rel = "noopener"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    recordShareDownload(slug)
  }

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">正在加载分享信息…</div>
  if (error || !info) return <ShareNotFound />

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="border-b border-border pb-5">
        <div className="flex items-center gap-3">
          <Avatar size="lg">
            {info.owner_avatar ? <AvatarImage src={info.owner_avatar} alt={`${info.owner_name} 的头像`} /> : null}
            <AvatarFallback>{info.owner_name.trim().slice(0, 1).toUpperCase() || "用"}</AvatarFallback>
          </Avatar>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {info.owner_name} 向您分享了 {formatSharedContentCount(info.folder_count, info.file_count)}
          </h1>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {requiresPassword ? "此分享受密码保护，验证后可以查看内容。" : "您可以在线预览或下载分享内容。"}
        </p>

        {requiresPassword && !accessToken ? (
          <div className="mt-4 flex w-full max-w-md gap-2" aria-label="验证分享密码">
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && void verifyPassword()}
              placeholder="请输入分享密码"
              autoFocus
            />
            <Button onClick={() => void verifyPassword()} disabled={verifyingPassword}>{verifyingPassword ? "验证中…" : "验证"}</Button>
          </div>
        ) : null}
      </header>

      {canAccess ? (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <nav className="flex min-w-0 items-center gap-1 text-sm" aria-label="分享目录路径">
              <button type="button" className="inline-flex items-center gap-1 rounded-md px-2 py-1.5 hover:bg-muted" onClick={() => void navigateTo(-1)}>
                <IconHome size={16} />给您分享的文件
              </button>
              {breadcrumbs.map((crumb, index) => (
                <span key={crumb.id} className="flex min-w-0 items-center gap-1">
                  <IconChevronRight size={15} className="text-muted-foreground" />
                  <button type="button" className="max-w-48 truncate rounded-md px-2 py-1.5 hover:bg-muted" onClick={() => void navigateTo(index)}>{crumb.name}</button>
                </span>
              ))}
            </nav>
            <Button variant="outline" size="sm" onClick={() => void copyLink()}><IconCopy size={16} className="mr-1.5" />{copied ? "已复制" : "复制链接"}</Button>
          </div>

          {selected && manifest ? (
            <div className={cn(
              "items-start gap-5",
              adaptiveMedia ? "flex flex-col lg:flex-row lg:justify-center" : "grid lg:grid-cols-[minmax(0,1fr)_18rem]"
            )}>
              <section
                className={cn("max-w-full", adaptiveMedia ? "shrink-0" : "min-w-0")}
                style={adaptiveMedia ? { width: shareMediaWidth ?? Math.min(288, shareOuterWidth) } : undefined}
              >
                {adaptiveMedia ? shareMediaWidth && shareMediaHeight ? (
                  <div
                    className="overflow-hidden rounded-xl border border-border bg-black"
                    style={{ width: shareMediaWidth, height: shareMediaHeight }}
                  >
                    <PreviewRenderer manifest={manifest} />
                  </div>
                ) : (
                  <div className="flex h-40 w-full items-center justify-center rounded-xl border border-border bg-muted text-sm text-muted-foreground">
                    正在读取媒体尺寸…
                  </div>
                ) : (
                  <div className="h-[clamp(30rem,65dvh,44rem)] overflow-hidden rounded-xl border border-border bg-background"><PreviewRenderer manifest={manifest} /></div>
                )}
              </section>
              <aside className="w-full shrink-0 rounded-xl border border-border bg-card p-5 lg:w-72">
                <button type="button" className="mb-4 inline-flex items-center text-sm text-muted-foreground hover:text-foreground" onClick={() => setSelected(null)}><IconChevronLeft size={17} className="mr-1" />返回文件列表</button>
                <p className="break-words text-base font-semibold">{selected.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{extensionOf(selected.name).toUpperCase() || "文件"} · {formatBytes(selected.size)}</p>
                <Button className="mt-5 w-full" onClick={() => download(selected)}><IconDownload size={17} className="mr-1.5" />下载</Button>
                <ShareFacts info={info} requiresPassword={requiresPassword} />
              </aside>
            </div>
          ) : (
            <section className="overflow-hidden rounded-xl border border-border bg-card" aria-label="分享文件列表">
              <div className="border-b border-border px-4 py-3 text-sm font-medium">{breadcrumbs.at(-1)?.name ?? "给您分享的文件"}</div>
              {folderLoading ? <div className="px-4 py-12 text-center text-sm text-muted-foreground">正在读取文件夹…</div> : nodes.length ? (
                <ul className="divide-y divide-border">
                  {nodes.map((node) => (
                    <li key={node.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/60"
                        onClick={() => node.type === "folder" ? void openFolder(node) : setSelected(node)}
                      >
                        <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted", node.type === "folder" && "text-primary")}>
                          {node.type === "folder" ? <IconFolder size={21} /> : <IconFile size={20} />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{node.name}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{node.type === "folder" ? "文件夹" : formatBytes(node.size)}</span>
                        </span>
                        <IconChevronRight size={18} className="text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <div className="px-4 py-12 text-center text-sm text-muted-foreground">这个文件夹是空的</div>}
            </section>
          )}
        </>
      ) : requiresPassword && !accessToken ? null : <ShareNotFound />}
    </div>
  )
}

function ShareFacts({ info, requiresPassword }: { info: ShareNodeInfo; requiresPassword: boolean }) {
  return (
    <dl className="mt-6 space-y-3 border-t border-border pt-5 text-sm">
      <InfoRow icon={<IconEye size={16} />} label="访问次数" value={`${info.view_count} 次`} />
      <InfoRow icon={<IconDownload size={16} />} label="下载次数" value={`${info.download_count} 次`} />
      <InfoRow icon={<IconClock size={16} />} label="有效期" value={formatExpiry(info.expires_at)} />
      <InfoRow icon={requiresPassword ? <IconLock size={16} /> : <IconEye size={16} />} label="访问权限" value={requiresPassword ? "密码保护" : "公开访问"} />
    </dl>
  )
}

function InfoRow({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return <div className="flex items-center gap-3"><span className="text-muted-foreground">{icon}</span><dt className="text-muted-foreground">{label}</dt><dd className="ml-auto text-right text-foreground">{value}</dd></div>
}
