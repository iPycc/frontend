import * as React from "react"
import { useNavigate } from "react-router-dom"
import { IconSearch, IconFolder, IconFile, IconShare, IconUpload } from "@tabler/icons-react"
import { useAppState } from "@/state/app"
import { Button } from "@/components/ui/button"
import {
  CommandDialog,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { searchNodes, type ExplorerNodeSearchResult } from "@/api/files"
import { useUploadState } from "@/lib/upload/provider"

export function SearchBar() {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<ExplorerNodeSearchResult[]>([])
  const [loading, setLoading] = React.useState(false)
  const [searchFailed, setSearchFailed] = React.useState(false)
  const [retry, setRetry] = React.useState(0)
  const searchInput = React.useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const { authSession, activeBucket } = useAppState()
  const { requestUpload } = useUploadState()

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((o) => !o)
      } else if (e.key === "/" && !e.altKey && !e.ctrlKey && !e.metaKey &&
        !(e.target instanceof HTMLElement && (e.target.isContentEditable || e.target.closest("input, textarea, [role='dialog']")))) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  React.useEffect(() => {
    const token = authSession?.tokens.accessToken
    const mountId = activeBucket.backendId
    const normalizedQuery = query.trim()
    setResults([])
    setSearchFailed(false)
    if (!open || !token || !mountId || !normalizedQuery) {
      setLoading(false)
      return
    }

    const controller = new AbortController()
    setLoading(true)
    const timeoutId = window.setTimeout(() => {
      searchNodes(token, mountId, normalizedQuery, controller.signal)
        .then((matches) => {
          if (!controller.signal.aborted) setResults(matches)
        })
        .catch(() => {
          if (!controller.signal.aborted) setSearchFailed(true)
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false)
        })
    }, 250)

    return () => {
      window.clearTimeout(timeoutId)
      controller.abort()
    }
  }, [activeBucket.backendId, authSession?.tokens.accessToken, open, query, retry])

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
          搜索文件或文件夹
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="搜索文件"
        className="flex size-10 shrink-0 items-center justify-center rounded-lg text-foreground md:hidden"
      >
        <IconSearch size={20} />
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
          ref={searchInput}
          placeholder="搜索文件或文件夹..."
          value={query}
          onValueChange={setQuery}
        />
        <CommandList className="max-h-[360px]">
          {!query.trim() ? (
            <CommandGroup heading="操作">
              <CommandItem onSelect={() => { setOpen(false); navigate("/app") }}><IconFolder />我的文件</CommandItem>
              <CommandItem onSelect={() => { setOpen(false); navigate("/share") }}><IconShare />我的分享</CommandItem>
              <CommandItem onSelect={() => { setOpen(false); navigate("/app/mounts") }}><IconFolder />存储桶</CommandItem>
              <CommandItem onSelect={() => { setOpen(false); requestUpload() }}><IconUpload />上传文件</CommandItem>
            </CommandGroup>
          ) : null}
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
        {query.trim() && results.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-6 text-sm">
            <p role="status">{loading ? "正在搜索…" : searchFailed ? "搜索失败" : "未找到匹配的文件或文件夹"}</p>
            {!loading ? (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onKeyDown={(event) => {
                  // cmdk prevents the default Enter action even with an empty list.
                  if (event.key === "Enter") event.stopPropagation()
                }}
                onClick={() => {
                  searchInput.current?.focus()
                  if (searchFailed) setRetry((value) => value + 1)
                  else setQuery("")
                }}
              >
                {searchFailed ? "重试" : "清除关键词"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </CommandDialog>
    </>
  )
}
