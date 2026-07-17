import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { IconFolderPlus, IconFolderUp, IconPlus, IconSettings, IconUpload } from "@tabler/icons-react"
import { toast } from "sonner"

import { CreateFolderDialog } from "@/components/file-area"
import { useAppState } from "@/lib/app-state"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
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
  const { createFolder, getFolderPathId, requestUpload, requestFolderUpload } = useAppState()
  const [createFolderOpen, setCreateFolderOpen] = useState(false)

  const currentFolderId = useMemo(() => {
    if (!location.pathname.startsWith("/app")) {
      return null
    }

    const folder = new URLSearchParams(location.search).get("folder") ?? ""
    return getFolderPathId(folder)
  }, [getFolderPathId, location.pathname, location.search])

  const openCreateFolderDialog = () => {
    setCreateFolderOpen(true)
  }

  const submitCreateFolder = async (name: string) => {
    const created = await createFolder(currentFolderId, name)
    if (created) {
      toast.success("文件夹创建成功")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-11 shrink-0 items-center gap-3 rounded-lg bg-primary px-4 text-sm text-primary-foreground shadow-[0_10px_20px_rgba(30,167,255,0.18)] transition-colors hover:bg-primary/90">
          <IconPlus size={18} />
          {!isMobile ? "新建" : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 rounded-xl">
          <DropdownMenuItem onClick={openCreateFolderDialog}>
            <IconFolderPlus size={16} />
            新建文件夹
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => requestUpload(currentFolderId)}>
            <IconUpload size={16} />
            上传文件
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => requestFolderUpload(currentFolderId)}>
            <IconFolderUp size={16} />
            上传文件夹
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings/storage")}>
            <IconSettings size={16} />
            存储设置
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        title="新建文件夹"
        description="创建一个新文件夹来整理文件。"
        defaultName="新建文件夹"
        locationLabel="当前文件夹"
        onSubmit={(name) => void submitCreateFolder(name)}
      />
    </>
  )
}
