import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  IconFolderPlus,
  IconMoon,
  IconPlus,
  IconSearch,
  IconSettings,
  IconSun,
  IconUpload,
} from "@tabler/icons-react"

import { useAppState } from "@/lib/app-state"
import { SidebarTrigger } from "./ui/sidebar"
import { Input } from "./ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { useIsMobile } from "@/hooks/use-mobile"

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const {
    profile,
    effectiveTheme,
    setThemeMode,
    addOfflineTask,
    createFolder,
    createSampleFile,
    getFolderPathId,
  } = useAppState()

  const currentFolderId = useMemo(() => {
    if (!location.pathname.startsWith("/app")) {
      return null
    }

    const path = location.pathname === "/app" ? "" : decodeURIComponent(location.pathname.replace("/app", ""))
    return getFolderPathId(path)
  }, [getFolderPathId, location.pathname])

  return (
    <header className="flex h-[65px] shrink-0 items-center justify-between px-4">
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90">
            <IconPlus size={18} />
            {!isMobile ? "新建" : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuItem onClick={() => createFolder(currentFolderId, "新建文件夹")}>
              <IconFolderPlus size={16} />
              新建文件夹
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => createSampleFile(currentFolderId)}>
              <IconUpload size={16} />
              上传模拟文件
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => addOfflineTask("https://download.example.com/demo-package.zip")}>
              <IconUpload size={16} />
              新建离线下载
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings/buckets")}>
              <IconSettings size={16} />
              存储桶设置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="relative hidden md:block md:w-[400px]">
          <IconSearch className="absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" size={18} />
          <Input
            type="text"
            placeholder="搜文件、文件夹或功能..."
            className="h-10 w-full rounded-full bg-muted/50 pl-10 pr-4 text-sm focus-visible:bg-background"
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          className="md:hidden rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="search"
        >
          <IconSearch size={20} />
        </button>
        <button
          onClick={() => setThemeMode(effectiveTheme === "dark" ? "light" : "dark")}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="toggle-theme"
        >
          {effectiveTheme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
        </button>
        <button
          onClick={() => navigate("/settings/profile")}
          className="rounded-full p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="open-settings"
        >
          <IconSettings size={20} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 h-9 w-9 overflow-hidden rounded-full border border-border/70 bg-muted focus:outline-none">
              <img src={profile.avatar} alt={profile.username} className="h-full w-full object-cover" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <div className="flex items-center justify-start gap-2 p-2 relative">
               <div className="flex flex-col space-y-1 leading-none w-full">
                {profile.username && <p className="font-medium text-sm flex justify-between items-center w-full"><span>{profile.username}</span><span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">管理</span></p>}
                {profile.email && <p className="w-[180px] truncate leading-none text-xs text-muted-foreground mt-1">{profile.email}</p>}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
              个人主页
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-red-600 focus:text-red-600">
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
