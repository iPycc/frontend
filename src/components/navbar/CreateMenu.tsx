import { useMemo } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  IconFolderPlus,
  IconPlus,
  IconSettings,
  IconUpload,
} from "@tabler/icons-react"

import { useAppState } from "@/lib/app-state"
import { useIsMobile } from "@/hooks/use-mobile"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function CreateMenu() {
  const navigate = useNavigate()
  const location = useLocation()
  const isMobile = useIsMobile()
  const { addOfflineTask, createFolder, createSampleFile, getFolderPathId } =
    useAppState()

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
  )
}
