import { useEffect, useMemo, useState, type MouseEvent, type ReactNode } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  IconActivity,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCloudDownload,
  IconFileText,
  IconFolderFilled,
  IconHome,
  IconLink,
  IconMusic,
  IconPhoto,
  IconShare,
  IconTrash,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react"

import { useAppState } from "@/lib/app-state"
import { type FileNode } from "@/lib/mock-data"
import { cn } from "../lib/utils"
import { BucketSwitcher } from "./BucketSwitcher"
import { Logo } from "./ui/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "./ui/sidebar"
import { AnimatePresence, motion } from "motion/react"

const utilityPaths = [
  "/app/shared-with-me",
  "/app/recycle",
  "/app/shares",
  "/app/mounts",
  "/app/tasks",
  "/app/offline",
  "/app/store",
  "/app/discussions",
]

type FolderTreeNode = FileNode & {
  children: FolderTreeNode[]
}

function buildTree(
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

function SidebarFolderTree({
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

export function AppSidebar() {
  const { activeBucket, formatBytes, getFoldersForBucket, settings } = useAppState()
  const { open, toggleSidebar } = useSidebar()
  const location = useLocation()
  const [isTreeOpen, setIsTreeOpen] = useState(false)

  const rootFolders = useMemo(
    () => buildTree(getFoldersForBucket, activeBucket.rootNodeId),
    [activeBucket.rootNodeId, getFoldersForBucket]
  )

  const category = new URLSearchParams(location.search).get("type")
  const isExplorerRoute =
    (location.pathname === "/app" || location.pathname.startsWith("/app/")) &&
    !utilityPaths.some((path) => location.pathname.startsWith(path))
  const isRootExplorer = location.pathname === "/app" && !category
  const quotaRatio = activeBucket.quota
    ? Math.min(activeBucket.quota.used / activeBucket.quota.total, 1)
    : 0

  useEffect(() => {
    if (location.pathname !== "/app" && isExplorerRoute) {
      setIsTreeOpen(true)
    }
  }, [isExplorerRoute, location.pathname])

  return (
    <Sidebar className="border-none bg-transparent">
      <SidebarHeader className="gap-3 px-4 pb-2 pt-3">
        <div className="group/logo relative flex h-12 items-center pl-5">
          <Logo showText className="gap-2.5 text-[#2b2b2b] dark:text-[#f4f4f4]" />
          <button
            type="button"
            onClick={toggleSidebar}
            className="pointer-events-none absolute right-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-[#666666] opacity-0 transition-all group-hover/logo:pointer-events-auto group-hover/logo:opacity-100 hover:bg-[#edf3f8] hover:text-[#2b2b2b] md:flex dark:text-[#b7b7b7] dark:hover:bg-[#23282f] dark:hover:text-[#f1f1f1]"
            aria-label={open ? "收起侧边栏" : "展开侧边栏"}
          >
            {open ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
          </button>
        </div>
        <BucketSwitcher />
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar px-4">
        <div className="space-y-6 pt-3">
          <div>
            <div
              className={cn(
                "flex h-9 items-center rounded-full pr-3 text-[15px] transition-colors",
                isRootExplorer
                  ? "bg-[#cfe7f9] text-[#1d3040] hover:bg-[#c1def4] hover:text-[#1d3040] dark:bg-[#18384d] dark:text-[#eef6ff] dark:hover:bg-[#21455f] dark:hover:text-[#eef6ff]"
                  : "text-[#303030] hover:bg-[#ebf2f8] hover:text-[#1f2c39] dark:text-[#c1c1c1] dark:hover:bg-[#23282f] dark:hover:text-[#f1f1f1]"
              )}
            >
              {settings.showSidebarTree ? (
                <button
                  type="button"
                  onClick={() => setIsTreeOpen((current) => !current)}
                  className="flex h-full w-8 shrink-0 items-center justify-center text-[#7a7a7a] transition-colors dark:text-[#8e8e8e]"
                  aria-label={isTreeOpen ? "收起目录树" : "展开目录树"}
                >
                  {isTreeOpen ? (
                    <IconChevronDown size={12} />
                  ) : (
                    <IconChevronRight size={12} />
                  )}
                </button>
              ) : (
                <span className="w-3 shrink-0" aria-hidden="true" />
              )}
              <NavLink to="/app" className="flex min-w-0 flex-1 items-center gap-3">
                <IconHome size={17} className="shrink-0 text-[#5b6570] dark:text-[#c5d0da]" />
                <span>我的文件</span>
              </NavLink>
            </div>

            <AnimatePresence initial={false}>
              {settings.showSidebarTree && isTreeOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -6 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="mt-1 overflow-hidden"
                >
                  <SidebarFolderTree items={rootFolders} level={1} />
                </motion.div>
              ) : null}
            </AnimatePresence>

            <div className="space-y-0 pt-1">
              <SidebarNavItem to="/app?type=image" active={category === "image"}>
                <IconPhoto size={17} />
                <span>图片</span>
              </SidebarNavItem>
              <SidebarNavItem to="/app?type=video" active={category === "video"}>
                <IconVideo size={17} />
                <span>视频</span>
              </SidebarNavItem>
              <SidebarNavItem to="/app?type=audio" active={category === "audio"}>
                <IconMusic size={17} />
                <span>音乐</span>
              </SidebarNavItem>
              <SidebarNavItem
                to="/app?type=document"
                active={category === "document"}
              >
                <IconFileText size={17} />
                <span>文档</span>
              </SidebarNavItem>
              <SidebarNavItem
                to="/app/recycle"
                active={location.pathname === "/app/recycle"}
              >
                <IconTrash size={17} />
                <span>回收站</span>
              </SidebarNavItem>
            </div>
          </div>

          <div className="space-y-1.5">
            <SidebarNavItem
              to="/app/shared-with-me"
              active={location.pathname === "/app/shared-with-me"}
            >
              <IconUsers size={17} />
              <span>与我共享</span>
            </SidebarNavItem>
            <SidebarNavItem
              to="/app/shares"
              active={location.pathname === "/app/shares"}
            >
              <IconShare size={17} />
              <span>我的分享</span>
            </SidebarNavItem>
            <SidebarNavItem
              to="/app/tasks"
              active={location.pathname === "/app/tasks"}
            >
              <IconActivity size={17} />
              <span>后台任务</span>
            </SidebarNavItem>
            <SidebarNavItem
              to="/app/mounts"
              active={location.pathname === "/app/mounts"}
            >
              <IconLink size={17} />
              <span>存储桶</span>
            </SidebarNavItem>
            <SidebarNavItem
              to="/app/offline"
              active={location.pathname === "/app/offline"}
            >
              <IconCloudDownload size={17} />
              <span>离线下载</span>
            </SidebarNavItem>
          </div>
        </div>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4 pt-3">
        {activeBucket.quota ? (
          <div className="rounded-[18px] border border-[#dadada] bg-white/88 px-4 py-3 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:bg-[#171717] dark:shadow-none">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#252525] dark:text-[#f2f2f2]">存储空间</span>
              <NavLink
                to="/settings/buckets"
                className="text-sm text-[#1976c9] transition-colors hover:text-[#0e5da5] dark:text-[#7dcbff] dark:hover:text-[#a3dcff]"
              >
                详情
              </NavLink>
            </div>
            <div className="mt-3 h-2 rounded-full bg-[#e5e5e5] dark:bg-[#2a2a2a]">
              <div
                className="h-full rounded-full bg-[#6eb9ff] dark:bg-[#4f98d9]"
                style={{
                  width: `${Math.max(quotaRatio * 100, activeBucket.quota.used > 0 ? 8 : 0)}%`,
                }}
              />
            </div>
            <div className="mt-2 text-sm text-[#505050] dark:text-[#c7c7c7]">
              {formatBytes(activeBucket.quota.used)} / {formatBytes(activeBucket.quota.total)}
            </div>
          </div>
        ) : null}
      </SidebarFooter>
    </Sidebar>
  )
}

function SidebarNavItem({
  to,
  active,
  children,
  className,
}: {
  to: string
  active?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <NavLink
      to={to}
      className={cn(
        "flex h-9 items-center gap-3 rounded-full px-8 text-[15px] text-[#303030] transition-colors hover:bg-[#ebf2f8] hover:text-[#1f2c39] dark:text-[#c1c1c1] dark:hover:bg-[#23282f] dark:hover:text-[#f1f1f1]",
        active
          ? "bg-[#cfe7f9] text-[#1d3040] hover:bg-[#c1def4] hover:text-[#1d3040] dark:bg-[#18384d] dark:text-[#eef6ff] dark:hover:bg-[#21455f] dark:hover:text-[#eef6ff]"
          : "",
        className
      )}
    >
      {children}
    </NavLink>
  )
}

function SidebarTreeItem({
  to,
  active,
  children,
  className,
  toggle,
}: {
  to: string
  active?: boolean
  children: ReactNode
  className?: string
  toggle?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex h-8 items-center rounded-full pr-3 text-[15px] transition-colors",
        active
          ? "bg-[#cfe7f9] text-[#1d3040] hover:bg-[#c1def4] hover:text-[#1d3040] dark:bg-[#18384d] dark:text-[#eef6ff] dark:hover:bg-[#21455f] dark:hover:text-[#eef6ff]"
          : "text-[#404040] hover:bg-[#edf3f8] hover:text-[#1f2c39] dark:text-[#b9b9b9] dark:hover:bg-[#23282f] dark:hover:text-[#f1f1f1]",
        className
      )}
    >
      <span
        className="flex h-full w-8 shrink-0 items-center justify-center"
        aria-hidden={toggle ? undefined : true}
      >
        {toggle}
      </span>
      <NavLink to={to} className="flex min-w-0 flex-1 items-center gap-3">
        {children}
      </NavLink>
    </div>
  )
}
