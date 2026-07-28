import { useEffect, useMemo, useState, type ReactNode } from "react"
import { useNavigate, useParams, useSearchParams } from "react-router-dom"
import { toast } from "sonner"
import {
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconClock,
  IconCopy,
  IconDownload,
  IconEye,
  IconFolderPlus,
  IconHome,
  IconLock,
} from "@tabler/icons-react"

import { ApiError } from "@/api/client"
import type { PreviewManifest } from "@/api/files"
import {
  buildSharedCoverUrl,
  buildSharedDownloadUrl,
  buildSharedSelectionDownloadUrl,
  buildSharedPreviewUrl,
  getSharedPreviewManifest,
  getShareInfo,
  listSharedNodes,
  recordSharedDirectoryDownload,
  verifySharePassword,
  type SharedNode,
  type ShareNodeInfo,
} from "@/api/share"
import { listShared, mountShared } from "@/api/shared"
import { PreviewRenderer } from "@/components/file-area/preview/PreviewRenderer"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { getSiteUrl } from "@/components/shared/useWebsiteSettings"
import { DownloadMethodDialog } from "@/components/download/DownloadMethodDialog"
import { TransferManager } from "@/components/transfer"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { usePageTitle } from "@/hooks/use-page-title"
import { useFileDownload } from "@/hooks/use-file-download"
import { useAppState } from "@/state/app"
import {
  buildSharedPreviewManifest,
  sharedAudioExtensions,
  sharedExtensionOf,
} from "@/lib/shared-preview"
import { cn } from "@/lib/utils"
import { ShareNotFound } from "./ShareNotFound"

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
  const navigate = useNavigate()
  const { auth, formatBytes, isAuthenticated, recordShareDownload } = useAppState()
  const fileDownload = useFileDownload()
  const [password, setPassword] = useState("")
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [info, setInfo] = useState<ShareNodeInfo | null>(null)
  const [nodes, setNodes] = useState<SharedNode[]>([])
  const [breadcrumbs, setBreadcrumbs] = useState<SharedNode[]>([])
  const [selected, setSelected] = useState<SharedNode | null>(null)
  const [checkedIds, setCheckedIds] = useState<number[]>([])
  const [downloadDialogNodes, setDownloadDialogNodes] = useState<SharedNode[]>([])
  const [loading, setLoading] = useState(true)
  const [folderLoading, setFolderLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [verifyingPassword, setVerifyingPassword] = useState(false)
  const [mounting, setMounting] = useState(false)
  const [mountedId, setMountedId] = useState<number | null>(null)
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
    setCheckedIds([])
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

  useEffect(() => {
    if (!isAuthenticated || !slug) {
      setMountedId(null)
      return
    }
    let cancelled = false
    void listShared()
      .then((items) => {
        if (!cancelled) setMountedId(items.find((item) => item.share_id === slug)?.id ?? null)
      })
      .catch(() => undefined)
    return () => { cancelled = true }
  }, [isAuthenticated, slug])

  const requiresPassword = info?.access === "password"
  const expired = Boolean(info?.expires_at && new Date(info.expires_at) <= new Date())
  const reachedDownloadLimit = Boolean(info?.max_downloads !== null && info && info.download_count >= (info.max_downloads ?? Infinity))
  const canAccess = Boolean(info && !expired && !reachedDownloadLimit && (!requiresPassword || accessToken))
  const isOwnShare = Boolean(info && auth.session?.user.id === info.owner_uid)
  const previewSource = slug && selected ? buildSharedPreviewUrl(slug, accessToken, selected.id) : ""
  const coverSource = slug && selected && selected.type === "file" && sharedAudioExtensions.has(sharedExtensionOf(selected.name))
    ? buildSharedCoverUrl(slug, accessToken, selected.id)
    : undefined
  const fallbackManifest = useMemo(
    () => info && selected?.type === "file" && canAccess
      ? buildSharedPreviewManifest({
          node: selected,
          source: previewSource,
          version: `share-${info.share_id}-${selected.id}`,
          cover: coverSource,
        })
      : null,
    [canAccess, coverSource, info, previewSource, selected]
  )
  const previewManifestKey = slug && selected
    ? `${slug}:${selected.id}:${accessToken ?? "public"}`
    : null
  const [serverPreview, setServerPreview] = useState<{
    key: string
    manifest: PreviewManifest
  } | null>(null)

  useEffect(() => {
    if (!slug || !selected || selected.type !== "file" || !canAccess) {
      setServerPreview(null)
      return
    }
    const controller = new AbortController()
    const requestKey = `${slug}:${selected.id}:${accessToken ?? "public"}`
    void getSharedPreviewManifest(slug, accessToken, selected.id, controller.signal)
      .then((nextManifest) => {
        if (!controller.signal.aborted) {
          setServerPreview({ key: requestKey, manifest: nextManifest })
        }
      })
      .catch(() => {
        // The source-only manifest keeps common formats usable on older servers.
      })
    return () => controller.abort()
  }, [accessToken, canAccess, selected, slug])

  const manifest = serverPreview?.key === previewManifestKey
    ? serverPreview.manifest
    : fallbackManifest

  useEffect(() => {
    setMediaDimensions(null)
    if (!manifest || (manifest.kind !== "image" && manifest.kind !== "video")) return
    const metadataWidth = typeof manifest.metadata.width === "number" ? manifest.metadata.width : 0
    const metadataHeight = typeof manifest.metadata.height === "number" ? manifest.metadata.height : 0
    if (metadataWidth > 0 && metadataHeight > 0) {
      setMediaDimensions({ width: metadataWidth, height: metadataHeight })
      return
    }
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
      setCheckedIds([])
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
      setCheckedIds([])
    } finally {
      setFolderLoading(false)
    }
  }

  const copyLink = async () => {
    if (!slug) return
    try {
      await navigator.clipboard.writeText(`${getSiteUrl()}/share/${slug}`)
      setCopied(true)
      toast.success("分享链接已复制")
      window.setTimeout(() => setCopied(false), 1600)
    } catch { toast.error("复制失败") }
  }

  const mountCurrentShare = async () => {
    if (!slug || !canAccess || mounting) return
    if (mountedId !== null) {
      navigate("/app/shared-with-me")
      return
    }
    setMounting(true)
    try {
      const mounted = await mountShared({ share_id: slug, access_token: accessToken })
      setMountedId(mounted.id)
      toast.success("已挂载到与我共享")
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 409) {
        setMountedId(-1)
        toast.info("这个分享已经挂载")
      } else {
        toast.error(reason instanceof Error ? reason.message : "挂载失败")
      }
    } finally {
      setMounting(false)
    }
  }

  const downloadNodes = async (downloadNodes: SharedNode[]) => {
    if (!slug || !canAccess || !downloadNodes.length) return
    const onlyNode = downloadNodes.length === 1 ? downloadNodes[0] : null
    if (!onlyNode || onlyNode.type === "folder") {
      setDownloadDialogNodes(downloadNodes)
      return
    }
    try {
      const completed = await fileDownload.download(buildSharedDownloadUrl(slug, accessToken, onlyNode.id), onlyNode.name)
      if (completed) {
        recordShareDownload(slug)
        toast.success("下载已保存")
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "下载失败")
    }
  }

  const downloadShareAsArchive = async () => {
    if (!slug || !downloadDialogNodes.length) return
    const nodesToDownload = downloadDialogNodes
    const onlyNode = nodesToDownload.length === 1 ? nodesToDownload[0] : null
    const url = onlyNode
      ? buildSharedDownloadUrl(slug, accessToken, onlyNode.id)
      : buildSharedSelectionDownloadUrl(slug, accessToken, nodesToDownload.map((node) => node.id))
    const name = onlyNode ? `${onlyNode.name}.zip` : `Cloudrave-分享-${nodesToDownload.length}项.zip`
    try {
      const completed = await fileDownload.download(url, name)
      if (completed) {
        recordShareDownload(slug)
        toast.success("ZIP 下载已保存")
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "下载失败")
    } finally {
      setDownloadDialogNodes([])
    }
  }

  const downloadShareAsDirectory = async () => {
    if (!slug || !downloadDialogNodes.length) return
    const nodesToDownload = downloadDialogNodes
    try {
      const completed = await fileDownload.downloadToDirectory(nodesToDownload, {
        prepare: () => recordSharedDirectoryDownload(slug, accessToken).then(() => undefined),
        getChildren: (folder) => listSharedNodes(slug, folder.id, accessToken),
        buildFileUrl: (file) => buildSharedPreviewUrl(slug, accessToken, file.id),
      })
      if (completed) {
        recordShareDownload(slug)
        toast.success("原始文件已保存")
      }
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "文件夹下载失败")
    } finally {
      setDownloadDialogNodes([])
    }
  }

  const checkedNodes = nodes.filter((node) => checkedIds.includes(node.id))
  const allVisibleChecked = nodes.length > 0 && checkedIds.length === nodes.length

  const toggleChecked = (nodeId: number) => {
    setCheckedIds((current) => current.includes(nodeId)
      ? current.filter((id) => id !== nodeId)
      : [...current, nodeId])
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
            <div className="flex items-center gap-2">
              {isAuthenticated && !isOwnShare ? (
                <Button variant={mountedId === null ? "default" : "outline"} size="sm" disabled={mounting} onClick={() => void mountCurrentShare()}>
                  <IconFolderPlus size={16} className="mr-1.5" />
                  {mounting ? "挂载中…" : mountedId === null ? "挂载到与我共享" : "查看已挂载内容"}
                </Button>
              ) : null}
              <Button variant="outline" size="sm" onClick={() => void copyLink()}><IconCopy size={16} className="mr-1.5" />{copied ? "已复制" : "复制链接"}</Button>
            </div>
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
                <p className="mt-1 text-sm text-muted-foreground">{sharedExtensionOf(selected.name).toUpperCase() || "文件"} · {formatBytes(selected.size)}</p>
                <Button className="mt-5 w-full" onClick={() => void downloadNodes([selected])}><IconDownload size={17} className="mr-1.5" />下载</Button>
                <ShareFacts info={info} requiresPassword={requiresPassword} />
              </aside>
            </div>
          ) : (
            <section className="overflow-hidden rounded-xl border border-border bg-card" aria-label="分享文件列表">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setCheckedIds(allVisibleChecked ? [] : nodes.map((node) => node.id))}
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded-[5px] border transition-colors",
                      allVisibleChecked ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-transparent hover:border-primary"
                    )}
                    aria-label={allVisibleChecked ? "取消全选" : "全选当前目录"}
                    aria-pressed={allVisibleChecked}
                  >
                    <IconCheck size={13} stroke={2.4} />
                  </button>
                  <div>
                    <h2 className="text-sm font-medium">{breadcrumbs.at(-1)?.name ?? "给您分享的文件"}</h2>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {checkedIds.length ? `已选择 ${checkedIds.length} 项` : `${nodes.length} 项内容`}
                    </p>
                  </div>
                </div>
                <Button
                  variant={checkedIds.length ? "default" : "outline"}
                  size="sm"
                  disabled={!nodes.length}
                  onClick={() => void downloadNodes(checkedIds.length ? checkedNodes : nodes)}
                >
                  <IconDownload size={16} className="mr-1.5" />
                  {checkedIds.length ? `下载所选 (${checkedIds.length})` : "全部下载"}
                </Button>
              </div>
              {folderLoading ? <div className="px-4 py-12 text-center text-sm text-muted-foreground">正在读取文件夹…</div> : nodes.length ? (
                <ul className="divide-y divide-border">
                  {nodes.map((node) => {
                    const checked = checkedIds.includes(node.id)
                    return (
                      <li key={node.id} className={cn("flex items-center transition-colors", checked ? "bg-primary/[0.06] dark:bg-primary/10" : "hover:bg-muted/60")}>
                        <button
                          type="button"
                          className={cn(
                            "group/icon relative ml-4 flex size-9 shrink-0 items-center justify-center rounded-lg outline-none transition-colors focus-visible:ring-2 focus-visible:ring-primary/50",
                            checked ? "bg-transparent" : "bg-muted group-hover/icon:bg-transparent"
                          )}
                          onClick={() => toggleChecked(node.id)}
                          aria-label={checked ? `取消选择 ${node.name}` : `选择 ${node.name}`}
                          aria-pressed={checked}
                        >
                          <span className={cn("transition-opacity", checked ? "opacity-0" : "opacity-100 group-hover/icon:opacity-0")}>
                            <FileGlyph item={{ kind: node.type, name: node.name }} />
                          </span>
                          <span className={cn(
                            "absolute inset-0 m-auto flex size-5 items-center justify-center rounded-full border-2 transition-opacity",
                            checked ? "border-primary bg-primary text-primary-foreground opacity-100" : "border-muted-foreground/55 bg-background text-transparent opacity-0 group-hover/icon:opacity-100"
                          )}>
                            <IconCheck size={12} stroke={2.5} />
                          </span>
                        </button>
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3 text-left"
                          onClick={() => node.type === "folder" ? void openFolder(node) : setSelected(node)}
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{node.name}</span>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{node.type === "folder" ? "文件夹" : formatBytes(node.size)}</span>
                          </span>
                          <IconChevronRight size={18} className="text-muted-foreground" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              ) : <div className="px-4 py-12 text-center text-sm text-muted-foreground">这个文件夹是空的</div>}
            </section>
          )}
        </>
      ) : requiresPassword && !accessToken ? null : <ShareNotFound />}
      <TransferManager
        downloadTask={fileDownload.task}
        onCancelDownload={fileDownload.cancel}
        onDismissDownload={fileDownload.dismiss}
        canUpload={false}
        placement="floating"
      />
      <DownloadMethodDialog
        open={downloadDialogNodes.length > 0}
        itemCount={downloadDialogNodes.length}
        supportsDirectoryDownload={fileDownload.supportsDirectoryDownload}
        onOpenChange={(open) => !open && setDownloadDialogNodes([])}
        onDirectoryDownload={() => void downloadShareAsDirectory()}
        onArchiveDownload={() => void downloadShareAsArchive()}
      />
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
