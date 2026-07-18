import { useCallback, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { IconChevronLeft, IconRefresh } from "@tabler/icons-react"
import { toast } from "sonner"

import {
  buildSharedMountDownloadUrl,
  groupSharedOwners,
  listShared,
  listSharedNodes,
  saveShared,
  unmountShared,
  type SharedItem,
  type SharedMount,
  type SharedOwner,
} from "@/api/shared"
import { MoveDialog } from "@/components/file-area"
import { SharedBrowser } from "@/components/share/SharedBrowser"
import {
  SharedList,
  SharedMountList,
  SharedViewToggle,
  type SharedViewMode,
} from "@/components/share/SharedList"
import { SharedPreviewDialog } from "@/components/share/SharedPreviewDialog"
import { PageShell } from "@/components/shared/PageShell"
import { TransferManager } from "@/components/transfer"
import { Button } from "@/components/ui/button"
import { useFileDownload } from "@/hooks/use-file-download"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"

const VIEW_MODE_KEY = "cloudrave.shared-with-me.view"

function initialViewMode(): SharedViewMode {
  return window.localStorage.getItem(VIEW_MODE_KEY) === "list" ? "list" : "grid"
}

export function SharedWithMe() {
  usePageTitle("与我共享")
  const { formatBytes, buckets, getFoldersForBucket, reloadWorkspace } = useAppState()
  const fileDownload = useFileDownload()
  const [searchParams, setSearchParams] = useSearchParams()
  const ownerFilter = Number(searchParams.get("owner")) || null
  const [mounts, setMounts] = useState<SharedMount[]>([])
  const [selectedMount, setSelectedMount] = useState<SharedMount | null>(null)
  const [previewItem, setPreviewItem] = useState<SharedItem | null>(null)
  const [items, setItems] = useState<SharedItem[]>([])
  const [path, setPath] = useState<SharedItem[]>([])
  const [viewMode, setViewModeState] = useState<SharedViewMode>(initialViewMode)
  const [loading, setLoading] = useState(true)
  const [folderLoading, setFolderLoading] = useState(false)
  const [removingId, setRemovingId] = useState<number | null>(null)
  const [saveItem, setSaveItem] = useState<SharedItem | null>(null)
  const [saveTarget, setSaveTarget] = useState("")

  const setViewMode = (value: SharedViewMode) => {
    setViewModeState(value)
    window.localStorage.setItem(VIEW_MODE_KEY, value)
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setMounts(await listShared())
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "共享内容加载失败")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const owners = useMemo(() => groupSharedOwners(mounts), [mounts])
  const activeOwner = useMemo(
    () => owners.find((owner) => owner.id === ownerFilter) ?? null,
    [ownerFilter, owners]
  )
  const ownerMounts = useMemo(() => activeOwner?.mounts ?? [], [activeOwner])

  useEffect(() => {
    setPreviewItem(null)
    setPath([])
    if (!ownerFilter) {
      setSelectedMount(null)
      setItems([])
      return
    }
    if (ownerMounts.length === 1) {
      setSelectedMount(ownerMounts[0])
      setItems(ownerMounts[0].roots)
      return
    }
    setSelectedMount(null)
    setItems([])
  }, [ownerFilter, ownerMounts])

  const openOwner = (owner: SharedOwner) => {
    setSearchParams({ owner: String(owner.id) })
  }

  const openMount = (mount: SharedMount) => {
    setSelectedMount(mount)
    setItems(mount.roots)
    setPath([])
    setPreviewItem(null)
  }

  const openFolder = async (item: SharedItem, nextPath = [...path, item]) => {
    if (!selectedMount || item.type !== "folder") return
    setFolderLoading(true)
    try {
      setItems(await listSharedNodes(selectedMount.id, item.id))
      setPath(nextPath)
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "文件夹加载失败")
    } finally {
      setFolderLoading(false)
    }
  }

  const openItem = (item: SharedItem) => {
    if (item.type === "folder") {
      void openFolder(item)
      return
    }
    setPreviewItem(item)
  }

  const remove = async (mount: SharedMount) => {
    setRemovingId(mount.id)
    try {
      await unmountShared(mount.id)
      setMounts((current) => current.filter((item) => item.id !== mount.id))
      if (selectedMount?.id === mount.id) setSelectedMount(null)
      if (ownerFilter && ownerMounts.length === 1 && ownerMounts[0]?.id === mount.id) {
        setSearchParams({})
      }
      toast.success("已从与我共享中移除，原文件未被删除")
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "移除失败")
    } finally {
      setRemovingId(null)
    }
  }

  const saveOptions = useMemo(
    () => buckets.flatMap((bucket) => {
      if (!bucket.backendId || bucket.readOnly) return []
      const provider = bucket.providerLabel ?? bucket.provider
      return [
        { id: `${bucket.backendId}:`, name: `${bucket.name}（${provider}）/ 根目录` },
        ...getFoldersForBucket(bucket.id, false)
          .filter((folder) => folder.backendId)
          .map((folder) => ({
            id: `${bucket.backendId}:${folder.backendId}`,
            name: `${bucket.name}（${provider}）/ ${folder.name}`,
          })),
      ]
    }),
    [buckets, getFoldersForBucket]
  )

  const beginSave = (item: SharedItem) => {
    if (!saveOptions.length) {
      toast.error("当前没有可写入的存储桶")
      return
    }
    setPreviewItem(null)
    setSaveItem(item)
    setSaveTarget(saveOptions[0]?.id ?? "")
  }

  const submitSave = async (value: string) => {
    if (!selectedMount || !saveItem) return
    const [mountText, parentText] = value.split(":")
    const targetMountId = Number(mountText)
    if (!targetMountId) return
    try {
      await saveShared(selectedMount.id, {
        node_id: saveItem.id,
        target_mount_id: targetMountId,
        target_parent_id: parentText ? Number(parentText) : null,
      })
      toast.success(`“${saveItem.name}”已转存到我的文件`)
      setSaveItem(null)
      await reloadWorkspace()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "转存共享内容失败")
    }
  }

  const downloadItem = async (item: SharedItem) => {
    if (!selectedMount) return
    try {
      const name = item.type === "folder" ? `${item.name}.zip` : item.name
      const completed = await fileDownload.download(
        buildSharedMountDownloadUrl(selectedMount.id, item.id),
        name
      )
      if (completed) toast.success("下载已保存")
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "下载失败")
    }
  }

  const goBack = () => {
    setPreviewItem(null)
    if (selectedMount && ownerMounts.length > 1) {
      setSelectedMount(null)
      setItems([])
      setPath([])
      return
    }
    setSearchParams({})
  }

  const pageTitle = selectedMount
    ? "共享根目录"
    : activeOwner
      ? `${activeOwner.name} 与我共享`
      : "与我共享"
  const pageDescription = selectedMount
    ? "浏览原分享的实时内容；您可以预览、下载，或转存到自己的存储桶。"
    : activeOwner
      ? `${activeOwner.name} 共向您提供 ${activeOwner.shareCount} 个分享。`
      : "这里只展示向您共享内容的用户；您自己的分享不会出现在这里。"

  return (
    <PageShell
      title={pageTitle}
      description={pageDescription}
      action={(
        <div className="flex items-center gap-2">
          {ownerFilter ? (
            <Button variant="outline" onClick={goBack}>
              <IconChevronLeft />
              {selectedMount && ownerMounts.length > 1 ? "返回该用户的分享" : "返回共享用户"}
            </Button>
          ) : (
            <Button variant="outline" onClick={() => void load()} disabled={loading}>
              <IconRefresh className={loading ? "animate-spin" : ""} />
              刷新
            </Button>
          )}
          <SharedViewToggle value={viewMode} onChange={setViewMode} />
        </div>
      )}
    >
      {selectedMount ? (
        <SharedBrowser
          mount={selectedMount}
          items={items}
          path={path}
          loading={folderLoading}
          viewMode={viewMode}
          formatBytes={formatBytes}
          onRoot={() => {
            setItems(selectedMount.roots)
            setPath([])
          }}
          onCrumb={(index) => {
            const item = path[index]
            if (item) void openFolder(item, path.slice(0, index + 1))
          }}
          onOpen={openItem}
          onDownload={(item) => void downloadItem(item)}
          onSave={beginSave}
        />
      ) : activeOwner ? (
        <SharedMountList
          items={ownerMounts}
          viewMode={viewMode}
          removingId={removingId}
          onOpen={openMount}
          onRemove={(mount) => void remove(mount)}
        />
      ) : (
        <SharedList
          items={mounts}
          loading={loading}
          viewMode={viewMode}
          onOpen={openOwner}
        />
      )}

      <SharedPreviewDialog
        key={previewItem?.id ?? "shared-preview-closed"}
        mount={selectedMount}
        item={previewItem}
        formatBytes={formatBytes}
        onClose={() => setPreviewItem(null)}
        onDownload={(item) => void downloadItem(item)}
        onSave={beginSave}
      />

      <MoveDialog
        open={Boolean(saveItem)}
        folders={saveOptions}
        value={saveTarget}
        onValueChange={setSaveTarget}
        onCancel={() => setSaveItem(null)}
        onSubmit={(value) => void submitSave(value)}
        title="转存到我的文件"
        description="选择要保存到的存储桶或其中的文件夹。系统会复制内容，不会修改原分享。"
        submitLabel="转存"
      />

      <TransferManager
        downloadTask={fileDownload.task}
        onCancelDownload={fileDownload.cancel}
        onDismissDownload={fileDownload.dismiss}
        canUpload={false}
        placement="floating"
      />
    </PageShell>
  )
}
