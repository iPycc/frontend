import { useMemo, useState, type MouseEvent, type ReactNode } from "react"
import { NavLink, useLocation } from "react-router-dom"
import {
  IconActivity,
  IconChevronDown,
  IconChevronRight,
  IconDownload,
  IconFileText,
  IconFolderFilled,
  IconLink,
  IconMusic,
  IconPhoto,
  IconShare,
  IconTrash,
  IconUsers,
  IconVideo,
} from "@tabler/icons-react"

import { useAppState } from "@/lib/app-state"
import { cn } from "../lib/utils"
import { BucketSwitcher } from "./BucketSwitcher"
import { Logo } from "./ui/logo"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar"

function buildTree(items: ReturnType<typeof useAppState>["getFoldersForBucket"], parentId: string) {
  return items()
    .filter((node) => node.parentId === parentId)
    .map((node) => ({
      ...node,
      children: buildTree(items, node.id),
    }))
}

function SidebarFolderTree({ items, basePath = "/app" }: { items: Array<any>; basePath?: string }) {
  const [openStates, setOpenStates] = useState<Record<string, boolean>>({})

  const toggle = (id: string, event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    setOpenStates((current) => ({ ...current, [id]: !current[id] }))
  }

  return (
    <div className="space-y-1">
      {items.map((folder) => {
        const isOpen = openStates[folder.id] ?? true
        const currentPath = `${basePath}/${encodeURIComponent(folder.name)}`
        const hasChildren = folder.children.length > 0

        return (
          <div key={folder.id}>
            <div className="group relative flex items-center">
              {hasChildren ? (
                <button
                  onClick={(event) => toggle(folder.id, event)}
                  className="absolute left-[-16px] rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent"
                >
                  {isOpen ? <IconChevronDown size={14} /> : <IconChevronRight size={14} />}
                </button>
              ) : null}
              <SidebarItem
                to={currentPath}
                icon={<IconFolderFilled size={16} className="text-slate-400 transition-colors group-hover:text-primary" />}
                label={folder.name}
              />
            </div>
            {isOpen && hasChildren ? (
              <div className="mt-1 ml-2 border-l border-border/50 pl-4">
                <SidebarFolderTree items={folder.children} basePath={currentPath} />
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function AppSidebar() {
  const { activeBucket, getFoldersForBucket, settings, formatBytes } = useAppState()
  const [isTreeOpen, setIsTreeOpen] = useState(settings.showSidebarTree)

  const rootFolders = useMemo(() => buildTree(getFoldersForBucket, activeBucket.rootNodeId), [activeBucket.rootNodeId, getFoldersForBucket])

  const quota = activeBucket.quota || { used: 0, total: 1 }
  const percent = Math.min(100, Math.round((quota.used / quota.total) * 100))

  return (
    <Sidebar className="border-none bg-transparent">
      <SidebarHeader className="px-4 py-3">
        <div className="mb-2 flex items-center pl-1">
          <Logo showText />
        </div>
        <BucketSwitcher />
      </SidebarHeader>

      <SidebarContent className="custom-scrollbar px-2">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="group relative flex items-center">
                  {settings.showSidebarTree ? (
                    <button
                      onClick={() => setIsTreeOpen((current) => !current)}
                      className="absolute left-[-16px] rounded-md p-0.5 text-muted-foreground transition-colors hover:bg-accent"
                    >
                      {isTreeOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                    </button>
                  ) : null}
                  <SidebarItem
                    to="/app"
                    icon={<IconFolderFilled size={18} className="text-primary" />}
                    label="我的文件"
                    exact
                  />
                </div>

                {settings.showSidebarTree && isTreeOpen ? (
                  <div className="mt-1 pl-6">
                    <SidebarFolderTree items={rootFolders} />
                  </div>
                ) : null}
              </SidebarMenuItem>

              <div className="space-y-1 pt-2">
                <SidebarItem to="/app?type=image" icon={<IconPhoto size={18} />} label="图片" />
                <SidebarItem to="/app?type=video" icon={<IconVideo size={18} />} label="视频" />
                <SidebarItem to="/app?type=audio" icon={<IconMusic size={18} />} label="音乐" />
                <SidebarItem to="/app?type=document" icon={<IconFileText size={18} />} label="文档" />
              </div>

              <div className="space-y-1 pt-4">
                <SidebarItem to="/app/shared-with-me" icon={<IconUsers size={18} />} label="与我共享" />
                <SidebarItem to="/app/recycle" icon={<IconTrash size={18} />} label="回收站" />
              </div>

              <div className="space-y-1 pt-4">
                <SidebarItem to="/app/shares" icon={<IconShare size={18} />} label="我的分享" />
                <SidebarItem to="/app/mounts" icon={<IconLink size={18} />} label="连接与挂载" />
                <SidebarItem to="/app/tasks" icon={<IconActivity size={18} />} label="后台任务" />
                <SidebarItem to="/app/offline" icon={<IconDownload size={18} />} label="离线下载" />
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="rounded-2xl border border-border/60 bg-background p-4 shadow-sm">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{activeBucket.name}使用空间</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${percent}%` }} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">{formatBytes(quota.used)} / {formatBytes(quota.total)}</div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}

function SidebarItem({
  to,
  icon,
  label,
  exact,
}: {
  to: string
  icon: ReactNode
  label: string
  exact?: boolean
}) {
  const location = useLocation()
  const current = `${location.pathname}${location.search}`
  const isActive = exact ? current === to : current.startsWith(to)

  return (
    <SidebarMenuButton
      render={<NavLink to={to} className="flex items-center gap-3" />}
      isActive={isActive}
      className={cn(
        "h-9",
        isActive ? "bg-primary/10 text-primary hover:bg-primary/10 dark:text-white" : ""
      )}
    >
      {icon}
      <span>{label}</span>
    </SidebarMenuButton>
  )
}
