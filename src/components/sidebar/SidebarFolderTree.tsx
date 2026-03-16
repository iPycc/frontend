import { useEffect, useState, type MouseEvent } from "react"
import { useLocation } from "react-router-dom"
import { IconChevronDown, IconChevronRight, IconFolderFilled } from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import { useAppState } from "@/lib/app-state"
import { type FileNode } from "@/lib/mock-data"
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
  basePath = "/app",
  level = 0,
}: {
  items: FolderTreeNode[]
  basePath?: string
  level?: number
}) {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})
  const location = useLocation()

  useEffect(() => {
    setOpenStates((current) => {
      let changed = false
      const next = { ...current }

      for (const folder of items) {
        const currentPath = `${basePath}/${encodeURIComponent(folder.name)}`
        const isInCurrentBranch =
          location.pathname === currentPath ||
          location.pathname.startsWith(`${currentPath}/`)

        if (isInCurrentBranch && next[folder.id] !== true) {
          next[folder.id] = true
          changed = true
        }
      }

      return changed ? next : current
    })
  }, [basePath, items, location.pathname])

  const toggle = (id: string, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setOpenStates((current) => ({ ...current, [id]: !current[id] }))
  }

  return (
    <div className="space-y-0.5">
      {items.map((folder) => {
        const currentPath = `${basePath}/${encodeURIComponent(folder.name)}`
        const hasChildren = folder.children.length > 0
        const isCurrent = location.pathname === currentPath
        const isInCurrentBranch =
          isCurrent || location.pathname.startsWith(`${currentPath}/`)
        const isOpen = openStates[folder.id] ?? isInCurrentBranch

        return (
          <div key={folder.id} className="space-y-0.5">
            <div
              style={{
                paddingLeft: `${level * 16}px`,
              }}
            >
              <SidebarTreeItem
                to={currentPath}
                active={isCurrent}
                className="min-w-0 w-full"
                toggle={
                  hasChildren ? (
                    <button
                      type="button"
                      onClick={(event) => toggle(folder.id, event)}
                      className="flex h-5 w-5 items-center justify-center rounded-full text-[#4f4f4f] transition-colors dark:text-[#9a9a9a]"
                    >
                      {isOpen ? (
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
                    "shrink-0 text-[#8b8b8b] dark:text-[#8f8f8f]",
                    isCurrent ? "text-[#2d6f9a] dark:text-[#80c8ff]" : ""
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
                    basePath={currentPath}
                    level={level + 1}
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
