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
import { Menu } from "lucide-react"

import { useAppState } from "@/lib/app-state"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
import { SidebarTrigger, useSidebar } from "./ui/sidebar"

export function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const { open, toggleSidebar } = useSidebar()
  const {
    profile,
    effectiveTheme,
    setThemeMode,
    logout,
    addOfflineTask,
    createFolder,
    createSampleFile,
    getFolderPathId,
  } = useAppState()

  const currentFolderId = useMemo(() => {
    if (!location.pathname.startsWith("/app")) {
      return null
    }

    const path =
      location.pathname === "/app"
        ? ""
        : decodeURIComponent(location.pathname.replace("/app", ""))
    return getFolderPathId(path)
  }, [getFolderPathId, location.pathname])

  return (
    <header className="flex shrink-0 items-center justify-between gap-4 px-4 p-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTrigger className="text-[#666666] hover:bg-white hover:text-[#2b2b2b] md:hidden" />
        {!isMobile && !open ? (
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#4b4b4b] transition-colors hover:bg-[#edf3f8] hover:text-[#232323] md:flex dark:text-[#d1d1d1] dark:hover:bg-[#23282f] dark:hover:text-[#f5f5f5]"
            aria-label="展开侧边栏"
          >
            <Menu size={20} />
          </button>
        ) : null}

        <DropdownMenu>
          <DropdownMenuTrigger className="inline-flex h-11 shrink-0 items-center gap-3 rounded-[10px] bg-primary px-4 text-sm text-primary-foreground shadow-[0_10px_20px_rgba(30,167,255,0.18)] transition-colors hover:bg-primary/90">
            <IconPlus size={18} />
            {!isMobile ? "新建" : null}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52 rounded-[15px]">
            <DropdownMenuItem
              onClick={() => createFolder(currentFolderId, "新建文件夹")}
            >
              <IconFolderPlus size={16} />
              新建文件夹
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => createSampleFile(currentFolderId)}>
              <IconUpload size={16} />
              上传模拟文件
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                addOfflineTask("https://download.example.com/demo-package.zip")
              }
            >
              <IconUpload size={16} />
              新建离线下载
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings/storage")}>
              <IconSettings size={16} />
              存储桶设置
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="hidden h-11 min-w-0 max-w-[420px] flex-1 items-center rounded-[10px] border border-[#d6d6d6] bg-white px-4 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] md:flex dark:border-white/10 dark:bg-[#171717] dark:shadow-none">
          <IconSearch className="shrink-0 text-[#4b4b4b] dark:text-[#b8b8b8]" size={20} />
          <input
            type="text"
            placeholder="按下 Ctrl K 进行检索..."
            className="h-full min-w-0 flex-1 border-0 bg-transparent px-3 text-sm text-[#333333] outline-none placeholder:text-[#8a8a8a] dark:text-[#efefef] dark:placeholder:text-[#8e8e8e]"
          />
          <div className="flex shrink-0 items-center gap-1 text-[11px] text-[#8a8a8a] dark:text-[#8e8e8e]">
            <span className="rounded-md border border-[#d4d4d4] bg-[#f4f4f4] px-1.5 py-0.5 dark:border-white/10 dark:bg-[#232323]">
              Ctrl
            </span>
            <span className="rounded-md border border-[#d4d4d4] bg-[#f4f4f4] px-1.5 py-0.5 dark:border-white/10 dark:bg-[#232323]">
              K
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button
          className="rounded-full p-2 text-[#666666] transition-colors hover:bg-white hover:text-[#2b2b2b] md:hidden dark:text-[#b7b7b7] dark:hover:bg-[#1d1d1d] dark:hover:text-[#f1f1f1]"
          aria-label="search"
        >
          <IconSearch size={20} />
        </button>
        <button
          onClick={() =>
            setThemeMode(effectiveTheme === "dark" ? "light" : "dark")
          }
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#2b2b2b] dark:text-[#b7b7b7] dark:hover:bg-[#1d1d1d] dark:hover:text-[#f1f1f1]"
          aria-label="toggle-theme"
        >
          {effectiveTheme === "dark" ? (
            <IconSun size={25} />
          ) : (
            <IconMoon size={25} />
          )}
        </button>
        <button
          onClick={() => navigate("/settings/profile")}
          className="flex h-10 w-10 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#2b2b2b] dark:text-[#b7b7b7] dark:hover:bg-[#1d1d1d] dark:hover:text-[#f1f1f1]"
          aria-label="open-settings"
        >
          <IconSettings size={25} />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="ml-1 h-10 w-10 overflow-hidden rounded-full border border-[#d6d6d6] bg-white focus:outline-none dark:border-white/10 dark:bg-[#171717]">
              <img
                src={profile.avatar}
                alt={profile.username}
                className="h-full w-full object-cover"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-[15px]">
            <div className="relative flex items-center justify-start gap-2 p-2">
              <div className="flex w-full flex-col space-y-1 leading-none">
                {profile.username ? (
                  <p className="flex w-full items-center justify-between text-sm">
                    <span>{profile.username}</span>
                    <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                      管理
                    </span>
                  </p>
                ) : null}
                {profile.email ? (
                  <p className="mt-1 w-[180px] truncate text-xs leading-none text-muted-foreground">
                    {profile.email}
                  </p>
                ) : null}
              </div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
              个人主页
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600"
              onClick={() => {
                logout()
                navigate("/login", { replace: true })
              }}
            >
              退出登录
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
