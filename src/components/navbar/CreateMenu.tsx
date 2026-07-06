import { useMemo, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { IconFolderPlus, IconPlus, IconSettings, IconUpload } from "@tabler/icons-react"
import { toast } from "sonner"

import { useAppState } from "@/lib/app-state"
import { useIsMobile } from "@/hooks/use-mobile"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
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
  const { createFolder, getFolderPathId, requestUpload } = useAppState()
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [folderName, setFolderName] = useState("")

  const currentFolderId = useMemo(() => {
    if (!location.pathname.startsWith("/app")) {
      return null
    }

    const folder = new URLSearchParams(location.search).get("folder") ?? ""
    return getFolderPathId(folder)
  }, [getFolderPathId, location.pathname, location.search])

  const openCreateFolderDialog = () => {
    setFolderName("")
    setCreateFolderOpen(true)
  }

  const submitCreateFolder = async () => {
    const name = folderName.trim()
    if (!name) {
      toast.error("Please enter a folder name")
      return
    }

    const created = await createFolder(currentFolderId, name)
    if (created) {
      setCreateFolderOpen(false)
      setFolderName("")
      toast.success("Folder created")
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex h-11 shrink-0 items-center gap-3 rounded-lg bg-primary px-4 text-sm text-primary-foreground shadow-[0_10px_20px_rgba(30,167,255,0.18)] transition-colors hover:bg-primary/90">
          <IconPlus size={18} />
          {!isMobile ? "New" : null}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-52 rounded-xl">
          <DropdownMenuItem onClick={openCreateFolderDialog}>
            <IconFolderPlus size={16} />
            New Folder
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => requestUpload(currentFolderId)}>
            <IconUpload size={16} />
            Upload File
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => navigate("/settings/storage")}>
            <IconSettings size={16} />
            Storage Settings
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New Folder</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={(event) => {
              event.preventDefault()
              void submitCreateFolder()
            }}
          >
            <Input
              value={folderName}
              onChange={(event) => setFolderName(event.target.value)}
              placeholder="Enter folder name"
              autoFocus
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateFolderOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
