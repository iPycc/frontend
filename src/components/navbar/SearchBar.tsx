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
import { searchNodes, type ExplorerNodeSearchResult } from "@/api/files"

export function SearchBar() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<ExplorerNodeSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const navigate = useNavigate()
  const { authSession, activeBucket } = useAppState()

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

  React.useEffect(() => {
    const token = authSession?.tokens.accessToken
    const mountId = activeBucket.backendId
    const normalizedQuery = query.trim()
    if (!open || !token || !mountId || !normalizedQuery) {
      setResults([])
      setLoading(false)
      return
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => {
      setLoading(true)
      searchNodes(token, mountId, normalizedQuery, controller.signal)
        .then(setResults)
        .catch((error: unknown) => {
          if (!(error instanceof DOMException && error.name === "AbortError")) {
            setResults([])
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeBucket.backendId, authSession?.tokens.accessToken, open, query])

  const handleSelect = (result: ExplorerNodeSearchResult) => {
    const { node, parent_path: parentPath } = result
    setOpen(false)
    setQuery("")

    if (node.type === "folder") {
      const folderPath = `${parentPath}/${node.name}`
      navigate(`/app?folder=${encodeURIComponent(folderPath)}`)
    } else {
      navigate(parentPath ? `/app?folder=${encodeURIComponent(parentPath)}` : "/app")
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
            <CommandEmpty>{loading ? "正在搜索..." : "未找到匹配的文件或文件夹"}</CommandEmpty>
          )}
          {!query.trim() && (
            <CommandEmpty>输入关键词开始搜索</CommandEmpty>
          )}
          {results.length > 0 && (
            <CommandGroup heading="搜索结果">
              {results.map((result) => {
                const node = result.node
                const extension = node.name.includes(".") ? node.name.split(".").pop()?.toUpperCase() : undefined
                return (
                <CommandItem
                  key={node.id}
                  value={`${node.name}-${node.id}`}
                  onSelect={() => handleSelect(result)}
                >
                  {node.type === "folder" ? (
                    <IconFolder className="text-muted-foreground" />
                  ) : (
                    <IconFile className="text-muted-foreground" />
                  )}
                  <span>{node.name}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {node.type === "folder" ? "文件夹" : extension || "文件"}
                  </span>
                </CommandItem>
                )
              })}
            </CommandGroup>
          )}
        </CommandList>
      </CommandDialog>
    </>
  )
}
