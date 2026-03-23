import * as React from "react"
import { useNavigate } from "react-router-dom"
import { IconSearch, IconFolder, IconFile } from "@tabler/icons-react"
import { useAppState } from "@/lib/app-state"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"

export function SearchBar() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const navigate = useNavigate()
  const { nodes, activeBucket, getFolderPathId } = useAppState()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  const results = React.useMemo(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()
    return nodes
      .filter(
        (n) =>
          !n.deletedAt &&
          n.bucketId === activeBucket.id &&
          !n.isSystemRoot &&
          n.name.toLowerCase().includes(q)
      )
      .slice(0, 20)
  }, [query, nodes, activeBucket.id])

  const handleSelect = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId)
    if (!node) return
    setOpen(false)
    setQuery("")

    if (node.kind === "folder") {
      // Build path by traversing parents
      const parts: string[] = []
      let current = node
      while (current && !current.isSystemRoot) {
        parts.unshift(current.name)
        current = nodes.find((n) => n.id === current.parentId) as typeof node
      }
      const folderPath = "/" + parts.join("/")
      navigate(`/app?folder=${encodeURIComponent(folderPath)}`)
    } else {
      // Navigate to parent folder
      const parent = nodes.find((n) => n.id === node.parentId)
      if (parent && !parent.isSystemRoot) {
        const parts: string[] = []
        let current = parent
        while (current && !current.isSystemRoot) {
          parts.unshift(current.name)
          current = nodes.find((n) => n.id === current.parentId) as typeof node
        }
        const folderPath = "/" + parts.join("/")
        navigate(`/app?folder=${encodeURIComponent(folderPath)}`)
      } else {
        navigate("/app")
      }
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-11 min-w-0 max-w-[420px] flex-1 items-center rounded-lg border border-border bg-card px-4 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] md:flex dark:shadow-none"
      >
        <IconSearch
          className="shrink-0 text-foreground/60"
          size={20}
        />
        <span className="flex h-full min-w-0 flex-1 items-center justify-start px-3 text-left text-sm text-muted-foreground">
          按下 Ctrl K 进行检索...
        </span>
        <div className="flex shrink-0 items-center gap-1 text-[11px] text-muted-foreground">
          <span className="rounded-md border border-border bg-muted px-1.5 py-0.5">
            Ctrl
          </span>
          <span className="rounded-md border border-border bg-muted px-1.5 py-0.5">
            K
          </span>
        </div>
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(v) => {
          setOpen(v)
          if (!v) setQuery("")
        }}
        title="全局搜索"
        description="搜索文件或文件夹"
        showCloseButton={false}
        className="rounded-xl sm:max-w-[560px]"
      >
        <CommandInput
          placeholder="搜索文件或文件夹..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[360px]">
          {query.trim() && results.length === 0 && (
            <CommandEmpty>未找到匹配的文件或文件夹</CommandEmpty>
          )}
          {!query.trim() && (
            <CommandEmpty>输入关键词开始搜索</CommandEmpty>
          )}
          {results.length > 0 && (
            <CommandGroup heading="搜索结果">
              {results.map((node) => (
                <CommandItem
                  key={node.id}
                  value={`${node.name}-${node.id}`}
                  onSelect={() => handleSelect(node.id)}
                >
                  {node.kind === "folder" ? (
                    <IconFolder size={16} className="text-[#8b8b8b]" />
                  ) : (
                    <IconFile size={16} className="text-[#8b8b8b]" />
                  )}
                  <span>{node.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {node.kind === "folder" ? "文件夹" : node.ext?.toUpperCase() || "文件"}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
