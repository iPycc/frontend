import * as React from "react"
import { Check, ChevronRight, FolderInput, Home, LoaderCircle } from "lucide-react"

import { ProviderIcon } from "@/components/sidebar/BucketSwitcher"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { EmptyState } from "@/components/ui/empty-state"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { FileNode } from "@/lib/models"
import { cn } from "@/lib/utils"
import { FileGlyph } from "./FileGlyph"

interface MoveFolderOption {
  id: string
  name: string
  parentId?: string | null
}

interface MoveRootOption {
  id: string
  name: string
  description?: string
  provider?: string
}

interface MoveDialogProps {
  open: boolean
  folders: MoveFolderOption[]
  items?: FileNode[]
  root?: { id: string; name: string }
  roots?: MoveRootOption[]
  disabledFolderIds?: string[]
  value: string
  onValueChange: (value: string) => void
  onBrowseFolder?: (folderId: string) => Promise<void> | void
  onCancel: () => void
  onSubmit: (targetId: string) => void
  title?: string
  description?: string
  submitLabel?: string
  destinationLabel?: string
  emptyDescription?: string
}

const FLAT_ROOT_ID = "__move-dialog-root__"

export function MoveDialog({
  open,
  folders,
  items = [],
  root,
  roots,
  disabledFolderIds = [],
  value,
  onValueChange,
  onBrowseFolder,
  onCancel,
  onSubmit,
  title = "移动到",
  description = "浏览文件夹并选择新的存放位置。",
  submitLabel = "移动到这里",
  destinationLabel = "移动到",
  emptyDescription = "可以将所选项目移动到这里",
}: MoveDialogProps) {
  const hierarchyRoots = React.useMemo<MoveRootOption[]>(
    () => roots?.length ? roots : root ? [root] : [],
    [root, roots]
  )
  const hasHierarchy = hierarchyRoots.length > 0
  const defaultRootId = hierarchyRoots[0]?.id ?? ""
  const [currentFolderId, setCurrentFolderId] = React.useState(
    hasHierarchy ? value || defaultRootId : FLAT_ROOT_ID
  )
  const [loadingFolderId, setLoadingFolderId] = React.useState<string | null>(null)
  const disabledIds = React.useMemo(() => new Set(disabledFolderIds), [disabledFolderIds])

  const allFolders = React.useMemo(() => {
    const byId = new Map<string, MoveFolderOption>()
    for (const hierarchyRoot of hierarchyRoots) {
      byId.set(hierarchyRoot.id, { ...hierarchyRoot, parentId: null })
    }
    for (const folder of folders) byId.set(folder.id, folder)
    return Array.from(byId.values())
  }, [folders, hierarchyRoots])

  const folderById = React.useMemo(
    () => new Map(allFolders.map((folder) => [folder.id, folder])),
    [allFolders]
  )

  React.useEffect(() => {
    if (!open) return
    setCurrentFolderId(hasHierarchy ? value || defaultRootId : FLAT_ROOT_ID)
  }, [defaultRootId, hasHierarchy, open, value])

  const activeRoot = React.useMemo(() => {
    if (!hasHierarchy) return undefined
    const rootIds = new Set(hierarchyRoots.map((item) => item.id))
    const seen = new Set<string>()
    let cursor = folderById.get(currentFolderId)
    while (cursor && !seen.has(cursor.id)) {
      if (rootIds.has(cursor.id)) {
        return hierarchyRoots.find((item) => item.id === cursor?.id)
      }
      seen.add(cursor.id)
      cursor = cursor.parentId ? folderById.get(cursor.parentId) : undefined
    }
    return hierarchyRoots[0]
  }, [currentFolderId, folderById, hasHierarchy, hierarchyRoots])

  const visibleFolders = React.useMemo(() => {
    const result = hasHierarchy
      ? allFolders.filter((folder) => folder.parentId === currentFolderId)
      : allFolders
    return result.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
  }, [allFolders, currentFolderId, hasHierarchy])

  const visibleFiles = React.useMemo(
    () => hasHierarchy
      ? items
          .filter((item) => item.kind === "file" && !item.deletedAt && item.parentId === currentFolderId)
          .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
      : [],
    [currentFolderId, hasHierarchy, items]
  )

  const breadcrumb = React.useMemo(() => {
    if (!hasHierarchy) return []
    const chain: MoveFolderOption[] = []
    const seen = new Set<string>()
    let cursor = folderById.get(currentFolderId)
    while (cursor && !seen.has(cursor.id)) {
      chain.unshift(cursor)
      seen.add(cursor.id)
      cursor = cursor.parentId ? folderById.get(cursor.parentId) : undefined
    }
    return chain
  }, [currentFolderId, folderById, hasHierarchy])

  const treeRows = React.useMemo(() => {
    if (!hasHierarchy || !activeRoot) return []
    const result: Array<{ folder: MoveFolderOption; depth: number }> = []
    const walk = (parentId: string, depth: number, seen: Set<string>) => {
      const children = allFolders
        .filter((folder) => folder.parentId === parentId)
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
      for (const folder of children) {
        if (seen.has(folder.id)) continue
        result.push({ folder, depth })
        const nextSeen = new Set(seen)
        nextSeen.add(folder.id)
        walk(folder.id, depth + 1, nextSeen)
      }
    }
    walk(activeRoot.id, 1, new Set([activeRoot.id]))
    return result
  }, [activeRoot, allFolders, hasHierarchy])

  const browseFolder = async (folderId: string) => {
    if (disabledIds.has(folderId)) return
    if (!hasHierarchy) {
      onValueChange(folderId)
      return
    }

    setCurrentFolderId(folderId)
    onValueChange(folderId)
    if (!onBrowseFolder) return
    setLoadingFolderId(folderId)
    try {
      await onBrowseFolder(folderId)
    } finally {
      setLoadingFolderId((current) => current === folderId ? null : current)
    }
  }

  const selectedFolder = folderById.get(value)
  const currentFolder = folderById.get(currentFolderId)
  const currentDestination = React.useMemo(() => {
    if (!hasHierarchy) return selectedFolder?.name ?? "尚未选择"
    if (hierarchyRoots.length === 1) return currentFolder?.name ?? activeRoot?.name ?? "尚未选择"
    if (breadcrumb.length <= 1) return activeRoot ? `${activeRoot.name} / 根目录` : "尚未选择"
    return breadcrumb.map((folder) => folder.name).join(" / ")
  }, [activeRoot, breadcrumb, currentFolder?.name, hasHierarchy, hierarchyRoots.length, selectedFolder?.name])

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onCancel()}>
      <DialogContent className="grid h-[min(88dvh,50rem)] w-[min(96vw,78rem)] max-w-none grid-rows-[auto_auto_minmax(0,1fr)_auto_auto] gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="px-5 py-4 pr-14 sm:px-6 sm:py-5">
          <div className="flex items-center gap-2">
            <FolderInput className="text-primary" aria-hidden="true" />
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <Separator />

        <div className="grid min-h-0 md:grid-cols-[17rem_minmax(0,1fr)]">
          {hasHierarchy && activeRoot ? (
            <aside className="hidden min-h-0 bg-muted/25 md:flex md:flex-col">
              {hierarchyRoots.length > 1 ? (
                <>
                  <div className="px-4 pb-2 pt-3 text-xs font-medium text-muted-foreground">存储桶</div>
                  <div className="space-y-1 px-2 pb-3">
                    {hierarchyRoots.map((hierarchyRoot) => (
                      <Button
                        key={hierarchyRoot.id}
                        type="button"
                        variant={activeRoot.id === hierarchyRoot.id ? "secondary" : "ghost"}
                        className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left"
                        disabled={disabledIds.has(hierarchyRoot.id)}
                        onClick={() => void browseFolder(hierarchyRoot.id)}
                      >
                        <span className="shrink-0">
                          <ProviderIcon provider={hierarchyRoot.provider ?? hierarchyRoot.description ?? hierarchyRoot.name} size="menu" />
                        </span>
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-normal">{hierarchyRoot.name}</span>
                          {hierarchyRoot.description ? (
                            <span className="truncate text-xs font-normal text-muted-foreground">{hierarchyRoot.description}</span>
                          ) : null}
                        </span>
                        {activeRoot.id === hierarchyRoot.id ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                      </Button>
                    ))}
                  </div>
                  <Separator />
                </>
              ) : null}
              <div className="px-4 py-3 text-xs font-medium text-muted-foreground">文件夹</div>
              <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
                <Button
                  type="button"
                  variant={currentFolderId === activeRoot.id ? "secondary" : "ghost"}
                  size="sm"
                  className="mb-1 w-full justify-start"
                  disabled={disabledIds.has(activeRoot.id)}
                  onClick={() => void browseFolder(activeRoot.id)}
                >
                  <Home data-icon="inline-start" />
                  <span className="truncate">{hierarchyRoots.length > 1 ? "根目录" : activeRoot.name}</span>
                </Button>
                {treeRows.map(({ folder, depth }) => (
                  <Button
                    key={folder.id}
                    type="button"
                    variant={currentFolderId === folder.id ? "secondary" : "ghost"}
                    size="sm"
                    className="mb-1 w-full justify-start"
                    style={{ paddingLeft: `${Math.min(depth, 5) * 0.75 + 0.5}rem` }}
                    disabled={disabledIds.has(folder.id)}
                    onClick={() => void browseFolder(folder.id)}
                  >
                    <FileGlyph item={{ kind: "folder", name: folder.name }} />
                    <span className="truncate">{folder.name}</span>
                  </Button>
                ))}
              </ScrollArea>
            </aside>
          ) : null}

          <main className="flex min-h-0 min-w-0 flex-col">
            {hasHierarchy ? (
              <div className="flex min-h-12 items-center gap-2 px-4 py-2 sm:px-5">
                {hierarchyRoots.length > 1 ? (
                  <select
                    aria-label="选择存储桶"
                    className="h-9 max-w-44 rounded-md border border-input bg-background px-2 text-sm md:hidden"
                    value={activeRoot?.id ?? defaultRootId}
                    onChange={(event) => void browseFolder(event.target.value)}
                  >
                    {hierarchyRoots.map((hierarchyRoot) => (
                      <option key={hierarchyRoot.id} value={hierarchyRoot.id}>{hierarchyRoot.name}</option>
                    ))}
                  </select>
                ) : null}
                <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
                  {breadcrumb.map((folder, index) => (
                    <React.Fragment key={folder.id}>
                      {index > 0 ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                      <Button
                        type="button"
                        variant={index === breadcrumb.length - 1 ? "secondary" : "ghost"}
                        size="sm"
                        className="shrink-0"
                        disabled={disabledIds.has(folder.id)}
                        onClick={() => void browseFolder(folder.id)}
                      >
                        {index === 0 ? <Home data-icon="inline-start" /> : null}
                        {hierarchyRoots.length > 1 && index === 0 ? "根目录" : folder.name}
                      </Button>
                    </React.Fragment>
                  ))}
                </div>
                {loadingFolderId ? <LoaderCircle className="size-4 shrink-0 animate-spin text-muted-foreground" aria-label="正在加载目录" /> : null}
              </div>
            ) : (
              <div className="flex min-h-12 items-center px-5 text-sm font-medium">选择保存位置</div>
            )}
            <Separator />

            <ScrollArea className="min-h-0 flex-1">
              <div className="flex min-h-full flex-col gap-6 p-4 sm:p-5">
                {visibleFolders.length > 0 ? (
                  <section>
                    <h3 className="mb-3 text-sm font-medium">文件夹</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleFolders.map((folder) => {
                        const disabled = disabledIds.has(folder.id)
                        const selected = !hasHierarchy && value === folder.id
                        return (
                          <button
                            key={folder.id}
                            type="button"
                            disabled={disabled}
                            className={cn(
                              "flex min-h-14 min-w-0 items-center gap-3 rounded-lg border bg-card px-3 text-left transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45",
                              selected && "border-primary ring-1 ring-primary/20"
                            )}
                            onClick={() => void browseFolder(folder.id)}
                          >
                            <FileGlyph item={{ kind: "folder", name: folder.name }} size={24} />
                            <span className="min-w-0 flex-1 truncate text-sm font-medium" title={folder.name}>{folder.name}</span>
                            {selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}
                            {hasHierarchy ? <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /> : null}
                          </button>
                        )
                      })}
                    </div>
                  </section>
                ) : null}

                {visibleFiles.length > 0 ? (
                  <section>
                    <h3 className="mb-3 text-sm font-medium">文件</h3>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                      {visibleFiles.map((file) => (
                        <div key={file.id} className="flex min-h-14 min-w-0 items-center gap-3 rounded-lg border bg-muted/25 px-3">
                          <FileGlyph item={file} size={24} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm" title={file.name}>{file.name}</p>
                            <p className="text-xs text-muted-foreground">{formatMoveFileSize(file.size)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                ) : null}

                {visibleFolders.length === 0 && visibleFiles.length === 0 ? (
                  <div className="flex min-h-56 flex-1 items-center justify-center">
                    <EmptyState title="此文件夹为空" description={emptyDescription} />
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </main>
        </div>

        <Separator />
        <DialogFooter className="items-center justify-between px-5 py-4 sm:px-6">
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            {destinationLabel}：<span className="font-medium text-foreground">{currentDestination}</span>
          </p>
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="outline" onClick={onCancel}>取消</Button>
            <Button type="button" disabled={!value || disabledIds.has(value)} onClick={() => onSubmit(value)}>
              <FolderInput data-icon="inline-start" />
              {submitLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function formatMoveFileSize(size: number) {
  if (!size) return "—"
  const units = ["B", "KB", "MB", "GB", "TB"]
  let value = size
  let index = 0
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024
    index += 1
  }
  return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`
}
