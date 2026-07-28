import { useEffect, useState, type MouseEvent } from "react"
import { useLocation } from "react-router-dom"
import { IconChevronDown, IconChevronRight, IconFolderFilled, IconLoader2 } from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import { useAppState } from "@/state/app"
import { type FileNode } from "@/lib/models"
import { cn } from "@/lib/utils"
import { SidebarTreeItem } from "./SidebarTreeItem"

export type FolderTreeNode = FileNode & {
  children: FolderTreeNode[]
}

export function buildTree(
  items: ReturnType<typeof useAppState>["getFoldersForBucket"],
  parentId: string
): FolderTreeNode[] {
  return items()
    .filter((node) => node.parentId === parentId)
    .map((node) => ({
      ...node,
      children: buildTree(items, node.id),
    }))
}

export function SidebarFolderTree({
  items,
  parentFolderPath = "",
  level = 0,
  followTree = true,
  onExpand,
  getLoadState,
}: {
  items: FolderTreeNode[]
  parentFolderPath?: string
  level?: number
  followTree?: boolean
  onExpand: (folderId: string) => Promise<void>
  getLoadState: (folderId: string) => { loading: boolean; loaded: boolean }
}) {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})
  const location = useLocation()
  const currentFolderParam = new URLSearchParams(location.search).get("folder") ?? ""

  useEffect(() => {
    if (!followTree) return

    setOpenStates((current) => {
      let changed = false
      const next = { ...current }

      for (const folder of items) {
        const folderPath = parentFolderPath
          ? `${parentFolderPath}/${folder.name}`
          : `/${folder.name}`
        const isInCurrentBranch =
          currentFolderParam === folderPath ||
          currentFolderParam.startsWith(`${folderPath}/`)

        // Auto-open when entering a branch
        if (isInCurrentBranch && next[folder.id] !== true) {
          next[folder.id] = true
          changed = true
        }

        // Auto-close when leaving a branch (user navigated out)
        if (!isInCurrentBranch && next[folder.id] === true) {
          const stillInside = currentFolderParam.startsWith(`${folderPath}/`)
          if (!stillInside && currentFolderParam !== folderPath) {
            next[folder.id] = false
            changed = true
          }
        }
      }

      return changed ? next : current
    })
  }, [parentFolderPath, items, currentFolderParam, followTree])

  useEffect(() => {
    if (!followTree) return
    for (const folder of items) {
      const folderPath = parentFolderPath ? `${parentFolderPath}/${folder.name}` : `/${folder.name}`
      const isInCurrentBranch =
        currentFolderParam === folderPath || currentFolderParam.startsWith(`${folderPath}/`)
      const state = getLoadState(folder.id)
      if (isInCurrentBranch && !state.loaded && !state.loading) {
        void onExpand(folder.id)
      }
    }
  }, [currentFolderParam, followTree, getLoadState, items, onExpand, parentFolderPath])

  const toggle = (id: string, opening: boolean, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setOpenStates((current) => {
      const state = getLoadState(id)
      if (opening && !state.loaded && !state.loading) {
        void onExpand(id)
      }
      return { ...current, [id]: opening }
    })
  }

  return (
    <div className="space-y-0.5">
      {items.map((folder) => {
        const folderPath = parentFolderPath
          ? `${parentFolderPath}/${folder.name}`
          : `/${folder.name}`
        const linkTo = `/app?folder=${encodeURIComponent(folderPath)}`
        const childState = getLoadState(folder.id)
        const hasChildren = folder.children.length > 0 || !childState.loaded
        const isCurrent = currentFolderParam === folderPath
        const isInCurrentBranch =
          isCurrent || currentFolderParam.startsWith(`${folderPath}/`)
        // When followTree is on, open state is driven by location; when off, use manual state
        const isOpen = followTree
          ? (openStates[folder.id] ?? isInCurrentBranch)
          : (openStates[folder.id] ?? false)

        return (
          <div key={folder.id} className="space-y-0.5">
            <div
              style={{
                paddingLeft: `${level * 16}px`,
              }}
            >
              <SidebarTreeItem
                to={linkTo}
                active={isCurrent}
                className="min-w-0 w-full"
                toggle={
                  hasChildren ? (
                    <button
                      type="button"
                      onClick={(event) => toggle(folder.id, !isOpen, event)}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors"
                    >
                      {childState.loading ? (
                        <IconLoader2 size={12} className="animate-spin" />
                      ) : isOpen ? (
                        <IconChevronDown size={12} />
                      ) : (
                        <IconChevronRight size={12} />
                      )}
                    </button>
                  ) : null
                }
              >
                <IconFolderFilled
                  size={17}
                  className={cn(
                    "shrink-0 text-muted-foreground",
                    isCurrent ? "text-primary" : ""
                  )}
                />
                <span className="truncate">{folder.name}</span>
              </SidebarTreeItem>
            </div>
            <AnimatePresence initial={false}>
              {isOpen && hasChildren ? (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -4 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -4 }}
                  transition={{ duration: 0.18, ease: "easeInOut" }}
                  className="overflow-hidden"
                >
                  <SidebarFolderTree
                    items={folder.children}
                    parentFolderPath={folderPath}
                    level={level + 1}
                    followTree={followTree}
                    onExpand={onExpand}
                    getLoadState={getLoadState}
                  />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        )
      })}
    </div>
  )
}

