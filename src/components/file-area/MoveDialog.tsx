import * as React from "react"
import { Check, ChevronRight, FolderInput, Home, LoaderCircle } from "lucide-react"

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

interface MoveDialogProps {
  open: boolean
  folders: MoveFolderOption[]
  items?: FileNode[]
  root?: { id: string; name: string }
  disabledFolderIds?: string[]
  value: string
  onValueChange: (value: string) => void
  onBrowseFolder?: (folderId: string) => Promise<void> | void
  onCancel: () => void
  onSubmit: (targetId: string) => void
  title?: string
  description?: string
  submitLabel?: string
}

const FLAT_ROOT_ID = "__move-dialog-root__"

export function MoveDialog({
  open,
  folders,
  items = [],
  root,
  disabledFolderIds = [],
  value,
  onValueChange,
  onBrowseFolder,
  onCancel,
  onSubmit,
  title = "移动到",
  description = "浏览文件夹并选择新的存放位置。",
  submitLabel = "移动到这里",
}: MoveDialogProps) {
  const hasHierarchy = Boolean(root)
  const [currentFolderId, setCurrentFolderId] = React.useState(
    hasHierarchy ? value || root?.id || "" : FLAT_ROOT_ID
  )
  const [loadingFolderId, setLoadingFolderId] = React.useState<string | null>(null)
  const disabledIds = React.useMemo(() => new Set(disabledFolderIds), [disabledFolderIds])

  const allFolders = React.useMemo(() => {
    const byId = new Map<string, MoveFolderOption>()
    if (root) byId.set(root.id, { ...root, parentId: null })
    for (const folder of folders) byId.set(folder.id, folder)
    return Array.from(byId.values())
  }, [folders, root])

  const folderById = React.useMemo(
    () => new Map(allFolders.map((folder) => [folder.id, folder])),
    [allFolders]
  )

  React.useEffect(() => {
    if (!open) return
    setCurrentFolderId(hasHierarchy ? value || root?.id || "" : FLAT_ROOT_ID)
  }, [hasHierarchy, open, root?.id, value])

  const visibleFolders = React.useMemo(() => {
    const result = hasHierarchy
      ? allFolders.filter((folder) => folder.id !== root?.id && folder.parentId === currentFolderId)
      : allFolders
    return result.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
  }, [allFolders, currentFolderId, hasHierarchy, root?.id])

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
    if (!hasHierarchy || !root) return []
    const result: Array<{ folder: MoveFolderOption; depth: number }> = []
    const walk = (parentId: string, depth: number, seen: Set<string>) => {
      const children = allFolders
        .filter((folder) => folder.id !== root.id && folder.parentId === parentId)
        .sort((left, right) => left.name.localeCompare(right.name, "zh-CN"))
      for (const folder of children) {
        if (seen.has(folder.id)) continue
        result.push({ folder, depth })
        const nextSeen = new Set(seen)
        nextSeen.add(folder.id)
        walk(folder.id, depth + 1, nextSeen)
      }
    }
    walk(root.id, 1, new Set([root.id]))
    return result
  }, [allFolders, hasHierarchy, root])

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

        <div className="grid min-h-0 md:grid-cols-[15rem_minmax(0,1fr)]">
          {hasHierarchy && root ? (
            <aside className="hidden min-h-0 bg-muted/25 md:flex md:flex-col">
              <div className="px-4 py-3 text-xs font-medium text-muted-foreground">文件夹</div>
              <ScrollArea className="min-h-0 flex-1 px-2 pb-3">
                <Button
                  type="button"
                  variant={currentFolderId === root.id ? "secondary" : "ghost"}
                  size="sm"
                  className="mb-1 w-full justify-start"
                  disabled={disabledIds.has(root.id)}
                  onClick={() => void browseFolder(root.id)}
                >
                  <Home data-icon="inline-start" />
                  <span className="truncate">{root.name}</span>
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
              <div className="flex min-h-12 items-center gap-1 overflow-x-auto px-4 py-2 sm:px-5">
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
                      {folder.name}
                    </Button>
                  </React.Fragment>
                ))}
                {loadingFolderId ? <LoaderCircle className="ml-auto size-4 shrink-0 animate-spin text-muted-foreground" aria-label="正在加载目录" /> : null}
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
                    <EmptyState title="此文件夹为空" description="可以将所选项目移动到这里" />
                  </div>
                ) : null}
              </div>
            </ScrollArea>
          </main>
        </div>

        <Separator />
        <DialogFooter className="items-center justify-between px-5 py-4 sm:px-6">
          <p className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
            移动到：<span className="font-medium text-foreground">{hasHierarchy ? currentFolder?.name ?? root?.name : selectedFolder?.name ?? "尚未选择"}</span>
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
