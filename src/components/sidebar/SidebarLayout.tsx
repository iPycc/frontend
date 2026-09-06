import { useCallback, useEffect, useMemo, useState } from "react"
import { Link, NavLink, useLocation } from "react-router-dom"
import {
  IconActivity,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCloudDownload,
  IconFileText,
  IconHome,
  IconLink,
  IconMusic,
  IconPhoto,
  IconShare,
  IconTrash,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import { useAppState } from "@/state/app"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { Logo } from "@/components/ui/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar"

import { BucketSwitcher } from "./BucketSwitcher"
import { SidebarFolderTree, buildTree } from "./SidebarFolderTree"
import { SidebarNavItem } from "./SidebarNavItem"
import { SidebarQuota } from "./SidebarQuota"
import { SidebarFooterContent } from "@/components/shared/SidebarFooterContent"
import { useSharedOwners } from "@/hooks/use-shared-owners"

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

export function SidebarLayout() {
  const {
    activeBucket,
    formatBytes,
    getFoldersForBucket,
    settings,
    loadDirectoryFolders,
    getFolderTreePageState,
    currentUser,
  } = useAppState()
  const isGuest = currentUser?.role === "guest"
  const { open, toggleSidebar } = useSidebar()
  const location = useLocation()
  const [isTreeOpen, setIsTreeOpen] = useState(false)
  const [sharedOwnersOpen, setSharedOwnersOpen] = useState(true)
  const { owners: sharedOwners, loading: sharedOwnersLoading, error: sharedOwnersError, retry: retrySharedOwners } =
    useSharedOwners(!isGuest && currentUser ? currentUser.id : null)

  const rootFolders = useMemo(
    () => buildTree(getFoldersForBucket, activeBucket.rootNodeId),
    [activeBucket.rootNodeId, getFoldersForBucket]
  )

  const searchParams = new URLSearchParams(location.search)
  const category = searchParams.get("type")
  const folderParam = searchParams.get("folder")
  const sharedOwnerId = searchParams.get("owner")
  const isExplorerRoute =
    location.pathname === "/app" &&
    !utilityPaths.some((path) => location.pathname.startsWith(path))
  const isRootExplorer = location.pathname === "/app" && !category && !folderParam
  const isInFolder = location.pathname === "/app" && folderParam && !category
  const isMyFilesActive = isRootExplorer || isInFolder
  const quotaRatio = activeBucket.quota
    ? Math.min(activeBucket.quota.used / activeBucket.quota.total, 1)
    : 0

  const handleExpandFolder = useCallback(
    async (folderId: string) => {
      try {
        await loadDirectoryFolders(folderId, activeBucket.id)
      } catch {
        // Keep the cached tree visible when a lazy request fails.
      }
    },
    [activeBucket.id, loadDirectoryFolders]
  )

  useEffect(() => {
    if (isInFolder) {
      setIsTreeOpen(true)
    }
  }, [isInFolder, folderParam])

  useEffect(() => {
    if (!isTreeOpen || !activeBucket.id) return
    void handleExpandFolder(activeBucket.rootNodeId)
  }, [activeBucket.id, activeBucket.rootNodeId, handleExpandFolder, isTreeOpen])

  return (
    <Sidebar className="border-none bg-transparent">
      <SidebarHeader className="px-2 pl-3 pt-3">
        <div className="group/logo relative flex h-12 items-center pl-5">
          <Logo showText className="gap-2 text-foreground" />
          <button
            type="button"
            onClick={toggleSidebar}
            className="pointer-events-none absolute right-0 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground opacity-0 transition-all group-hover/logo:pointer-events-auto group-hover/logo:opacity-100 hover:bg-nav-hover-bg hover:text-foreground md:flex"
            aria-label={open ? "收起侧边栏" : "展开侧边栏"}
          >
            {open ? <IconChevronLeft size={16} /> : <IconChevronRight size={16} />}
          </button>
        </div>
        <BucketSwitcher />
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar px-4">
        <div className="flex flex-col gap-5 pt-3">
          <section aria-label="文件">
            <h2 className="px-8 pb-2 text-xs font-medium text-muted-foreground">文件</h2>
            <div
              className={cn(
                "flex h-9 items-center rounded-full pr-3 text-sm transition-colors",
                isRootExplorer
                  ? "bg-nav-active-bg text-nav-active-fg hover:bg-nav-active-bg hover:text-nav-active-fg"
                  : "text-foreground hover:bg-nav-hover-bg hover:text-foreground"
              )}
            >
              <button
                type="button"
                onClick={() => setIsTreeOpen((current) => !current)}
                className="flex h-full w-8 shrink-0 items-center justify-center text-muted-foreground transition-colors"
                aria-label={isTreeOpen ? "收起目录树" : "展开目录树"}
                aria-expanded={isTreeOpen}
                aria-controls="sidebar-folder-tree"
              >
                {isTreeOpen ? (
                  <IconChevronDown size={12} />
                ) : (
                  <IconChevronRight size={12} />
                )}
              </button>
              <NavLink to="/app" className="flex min-w-0 flex-1 items-center gap-3">
                <IconHome
                  size={17}
                  className={cn(
                    "shrink-0",
                    isMyFilesActive ? "text-nav-active-fg" : "text-muted-foreground"
                  )}
                />
                <span>我的文件</span>
              </NavLink>
            </div>

            <AnimatePresence initial={false}>
              {isTreeOpen ? (
                <motion.div
                  initial={{ height: 0, opacity: 0, y: -6 }}
                  animate={{ height: "auto", opacity: 1, y: 0 }}
                  exit={{ height: 0, opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: "easeInOut" }}
                  className="mt-1 overflow-hidden"
                >
                  <div id="sidebar-folder-tree" role="region" aria-label="文件夹目录" tabIndex={0} className="custom-scrollbar max-h-[30dvh] overflow-y-auto overscroll-contain">
                  <SidebarFolderTree
                    items={rootFolders}
                    level={1}
                    followTree={settings.showSidebarTree}
                    onExpand={handleExpandFolder}
                    getLoadState={(folderId) => getFolderTreePageState(folderId, activeBucket.id)}
                  />
                  </div>
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
          </section>

          {!isGuest ? <>
          <section aria-label="共享" className="flex flex-col gap-1">
            <h2 className="px-8 pb-1 text-xs font-medium text-muted-foreground">共享</h2>
            <div className="relative">
            <SidebarNavItem
              to="/app/shared-with-me"
              active={location.pathname === "/app/shared-with-me" && !sharedOwnerId}
            >
              <IconUsers size={17} />
              <span>与我共享</span>
            </SidebarNavItem>
            <button type="button" onClick={() => setSharedOwnersOpen((value) => !value)}
              aria-label={sharedOwnersOpen ? "收起共享用户" : "展开共享用户"}
              aria-expanded={sharedOwnersOpen} aria-controls="sidebar-shared-owners"
              className="absolute inset-y-0 left-0 flex w-8 items-center justify-center rounded-full text-muted-foreground focus-visible:outline-2 focus-visible:outline-ring">
              {sharedOwnersOpen ? <IconChevronDown size={12} /> : <IconChevronRight size={12} />}
            </button>
            </div>
            <div id="sidebar-shared-owners" hidden={!sharedOwnersOpen}>
            {sharedOwners.length ? (
              <div className="space-y-0.5 pb-1 pl-7">
                {sharedOwners.map((owner) => (
                  <Link
                    key={owner.id}
                    to={`/app/shared-with-me?owner=${encodeURIComponent(String(owner.id))}`}
                    aria-current={
                      location.pathname === "/app/shared-with-me" && sharedOwnerId === String(owner.id)
                        ? "page"
                        : undefined
                    }
                    className={cn(
                      "flex h-9 items-center gap-2 rounded-full px-3 text-[13px] text-muted-foreground transition-colors hover:bg-nav-hover-bg hover:text-foreground",
                      location.pathname === "/app/shared-with-me" &&
                        sharedOwnerId === String(owner.id) &&
                        "bg-nav-active-bg text-nav-active-fg"
                    )}
                  >
                    <Avatar size="sm" className="size-5">
                      {owner.avatar ? <AvatarImage src={owner.avatar} alt={`${owner.name}的头像`} /> : null}
                      <AvatarFallback className="text-[10px]">
                        {owner.name.trim().slice(0, 1).toUpperCase() || "用"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">{owner.name}</span>
                    <span className="tabular-nums" title={`${owner.share_count} 个共享`} aria-label={`${owner.share_count} 个共享`}>{owner.share_count}</span>
                  </Link>
                ))}
              </div>
            ) : sharedOwnersLoading ? (
              <div className="space-y-0.5 pb-1 pl-7" aria-label="正在加载共享用户">
                {Array.from({ length: 2 }, (_, index) => (
                  <div key={index} className="flex h-8 items-center gap-2 rounded-full px-3" aria-hidden="true">
                    <Skeleton className="size-5 shrink-0 rounded-full" />
                    <Skeleton className="h-3 min-w-0 flex-1" />
                    <Skeleton className="h-3 w-4" />
                  </div>
                ))}
              </div>
            ) : null}
            {sharedOwnersError ? (
              <button type="button" onClick={retrySharedOwners} disabled={sharedOwnersLoading}
                className="px-8 py-1 text-left text-xs text-muted-foreground underline underline-offset-4 disabled:opacity-50">
                共享列表刷新失败，点击重试
              </button>
            ) : null}
            </div>
            <SidebarNavItem
              to="/share"
              active={location.pathname === "/share"}
            >
              <IconShare size={17} />
              <span>我的分享</span>
            </SidebarNavItem>
          </section>
          <section aria-label="工具" className="flex flex-col gap-1">
            <h2 className="px-8 pb-1 text-xs font-medium text-muted-foreground">工具</h2>
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
          </section>
          </> : null}
        </div>
      </SidebarContent>

      <SidebarFooter className="px-4 pb-4 pt-3">
        {activeBucket.quota ? (
          <SidebarQuota
            used={activeBucket.quota.used}
            total={activeBucket.quota.total}
            quotaRatio={quotaRatio}
            formatBytes={formatBytes}
            showDetails={!isGuest}
          />
        ) : null}
        <SidebarFooterContent className="mt-3" />
      </SidebarFooter>
    </Sidebar>
  )
}
