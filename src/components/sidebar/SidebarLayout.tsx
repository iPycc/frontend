import { useEffect, useMemo, useState } from "react"
import { NavLink, useLocation } from "react-router-dom"
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

import { useAppState } from "@/lib/app-state"
import { cn } from "@/lib/utils"
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
  const { activeBucket, formatBytes, getFoldersForBucket, settings } = useAppState()
  const { open, toggleSidebar } = useSidebar()
  const location = useLocation()
  const [isTreeOpen, setIsTreeOpen] = useState(false)

  const rootFolders = useMemo(
    () => buildTree(getFoldersForBucket, activeBucket.rootNodeId),
    [activeBucket.rootNodeId, getFoldersForBucket]
  )

  const searchParams = new URLSearchParams(location.search)
  const category = searchParams.get("type")
  const folderParam = searchParams.get("folder")
  const isExplorerRoute =
    location.pathname === "/app" &&
    !utilityPaths.some((path) => location.pathname.startsWith(path))
  const isRootExplorer = location.pathname === "/app" && !category && !folderParam
  const isInFolder = location.pathname === "/app" && folderParam && !category
  const isMyFilesActive = isRootExplorer || isInFolder
  const quotaRatio = activeBucket.quota
    ? Math.min(activeBucket.quota.used / activeBucket.quota.total, 1)
    : 0

  useEffect(() => {
    if (isInFolder) {
      setIsTreeOpen(true)
    }
  }, [isInFolder, folderParam])

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
        <div className="space-y-6 pt-3">
          <div>
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
              >
                {isTreeOpen ? (
                  <IconChevronDown size={12} />
                ) : (
                  <IconChevronRight size={12} />
                )}
              </button>
              <NavLink to="/app" className="flex min-w-0 flex-1 items-center gap-3">
                <IconHome size={17} className="shrink-0 text-muted-foreground" />
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
                  <SidebarFolderTree items={rootFolders} level={1} followTree={settings.showSidebarTree} />
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
              to="/share"
              active={location.pathname === "/share"}
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
          <SidebarQuota
            used={activeBucket.quota.used}
            total={activeBucket.quota.total}
            quotaRatio={quotaRatio}
            formatBytes={formatBytes}
          />
        ) : null}
        <SidebarFooterContent className="mt-3" />
      </SidebarFooter>
    </Sidebar>
  )
}
