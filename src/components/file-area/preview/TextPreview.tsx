import * as React from "react"
import { IconCode, IconDeviceFloppy, IconEye, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"

import type { PreviewManifest } from "@/api/files"
import { saveTextPreview } from "@/api/files"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { previewSourceUrls, requestPreviewAsset } from "@/lib/preview-assets"
import { MarkdownPreview } from "./MarkdownPreview"
import { PreviewSkeleton } from "./PreviewSkeleton"

const languageByExtension: Record<string, string> = {
  c: "C", cpp: "C++", cs: "C#", css: "CSS", go: "Go", h: "C++", html: "HTML",
  ini: "INI", java: "Java", js: "JavaScript", json: "JSON", jsx: "JSX", md: "Markdown",
  php: "PHP", py: "Python", rb: "Ruby", rs: "Rust", sh: "Shell", sql: "SQL",
  ts: "TypeScript", tsx: "TSX", xml: "XML", yaml: "YAML", yml: "YAML",
}

function inferLanguage(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? ""
  return languageByExtension[extension] ?? "Text"
}

export function TextPreview({ manifest }: { manifest: PreviewManifest }) {
  const isMarkdown = ["md", "markdown"].includes(manifest.name.split(".").pop()?.toLowerCase() ?? "")
  const [content, setContent] = React.useState("")
  const [view, setView] = React.useState<"preview" | "source">(isMarkdown ? "preview" : "source")
  const [version, setVersion] = React.useState(manifest.version)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const editable = manifest.capabilities.includes("edit")
  const maxBytes = typeof manifest.metadata.max_bytes === "number" ? manifest.metadata.max_bytes : 5 * 1024 * 1024
  const textEncoding = typeof manifest.metadata.text_encoding === "string" ? manifest.metadata.text_encoding : "utf-8"
  const truncated = manifest.size > maxBytes

  const save = React.useCallback(async () => {
    if (!editable || saving || !dirty) return
    setSaving(true)
    try {
      const result = await saveTextPreview(manifest.node_id, content, version)
      setVersion(result.version)
      setDirty(false)
      toast.success("文件已保存")
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "保存失败，请刷新后重试")
    } finally {
      setSaving(false)
    }
  }, [content, dirty, editable, manifest.node_id, saving, version])

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setDirty(false)
    setVersion(manifest.version)
    setView(isMarkdown ? "preview" : "source")
    const load = async () => {
      let lastError: unknown
      for (const source of previewSourceUrls(manifest)) {
        try {
          const response = await requestPreviewAsset(source, {
            signal: controller.signal,
            cache: "no-store",
            headers: truncated ? { Range: `bytes=0-${maxBytes - 1}` } : undefined,
          })
          const value = await response.arrayBuffer()
          setContent(new TextDecoder(textEncoding).decode(value))
          return
        } catch (reason) {
          if (controller.signal.aborted) return
          lastError = reason
        }
      }
      setError(lastError instanceof Error ? lastError.message : "文本加载失败")
    }
    void load().finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [isMarkdown, manifest, maxBytes, textEncoding, truncated])

  if (loading) return <PreviewSkeleton kind="text" />
  if (error) return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">{error}</div>

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="truncate text-xs text-muted-foreground">
          {inferLanguage(manifest.name)} · {textEncoding.toUpperCase()}{truncated ? ` · 仅显示前 ${Math.round(maxBytes / 1024 / 1024)} MB` : ""}{dirty ? " · 未保存" : ""}
        </span>
        <div className="flex items-center gap-2">
          {isMarkdown ? <ToggleGroup type="single" value={view} onValueChange={(value) => { if (value === "preview" || value === "source") setView(value) }} variant="outline" size="sm" spacing={0} aria-label="Markdown 查看模式"><ToggleGroupItem value="preview" aria-label="预览 Markdown"><IconEye data-icon="inline-start" />预览</ToggleGroupItem><ToggleGroupItem value="source" aria-label="查看 Markdown 源码"><IconCode data-icon="inline-start" />源码</ToggleGroupItem></ToggleGroup> : null}
          {editable ? <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={() => void save()}>{saving ? <IconLoader2 data-icon="inline-start" className="animate-spin" /> : <IconDeviceFloppy data-icon="inline-start" />}保存</Button> : null}
        </div>
      </div>
      {isMarkdown && view === "preview" ? (
        <div className="min-h-0 flex-1"><MarkdownPreview content={content} /></div>
      ) : editable ? (
        <textarea
          value={content}
          onChange={(event) => { setContent(event.target.value); setDirty(true) }}
          onKeyDown={(event) => { if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") { event.preventDefault(); void save() } }}
          spellCheck={false}
          aria-label={`${manifest.name} 文本编辑器`}
          className="min-h-0 flex-1 resize-none bg-background p-4 font-mono text-[13px] leading-5 text-foreground outline-none"
        />
      ) : (
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre p-4 font-mono text-[13px] leading-5 text-foreground">{content}</pre>
      )}
    </div>
  )
}
