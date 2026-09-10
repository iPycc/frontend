import * as React from "react"
import { IconCode, IconColumns3, IconDeviceFloppy, IconEdit, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"

import type { PreviewManifest } from "@/api/files"
import { saveTextPreview } from "@/api/files"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { previewSourceUrls, requestPreviewAsset } from "@/lib/preview-assets"
import { MarkdownPreview, type MarkdownPreviewHandle } from "./MarkdownPreview"
import { AdaptiveCodeEditor, type AdaptiveCodeEditorHandle, type SourceLineRange } from "./AdaptiveCodeEditor"
import { PreviewSkeleton } from "./PreviewSkeleton"

const MarkdownEditor = React.lazy(() => import("./MarkdownEditor").then((module) => ({ default: module.MarkdownEditor })))

const languageByExtension: Record<string, { id: string; label: string }> = {
  c: { id: "c", label: "C" }, cpp: { id: "cpp", label: "C++" }, cs: { id: "csharp", label: "C#" }, css: { id: "css", label: "CSS" },
  go: { id: "go", label: "Go" }, h: { id: "cpp", label: "C++" }, html: { id: "html", label: "HTML" }, ini: { id: "ini", label: "INI" },
  java: { id: "java", label: "Java" }, js: { id: "javascript", label: "JavaScript" }, json: { id: "json", label: "JSON" },
  jsx: { id: "javascriptreact", label: "JSX" }, md: { id: "markdown", label: "Markdown" }, php: { id: "php", label: "PHP" },
  py: { id: "python", label: "Python" }, rb: { id: "ruby", label: "Ruby" }, rs: { id: "rust", label: "Rust" },
  sh: { id: "shell", label: "Shell" }, sql: { id: "sql", label: "SQL" }, ts: { id: "typescript", label: "TypeScript" },
  tsx: { id: "typescriptreact", label: "TSX" }, xml: { id: "xml", label: "XML" }, yaml: { id: "yaml", label: "YAML" }, yml: { id: "yaml", label: "YAML" },
}

function inferLanguage(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? ""
  return languageByExtension[extension] ?? { id: "plaintext", label: "Text" }
}

function hasExtendedMarkdownSyntax(content: string) {
  return /(^|\n)\s*(import|export)\s|<[A-Z][\w.-]*[\s/>]|(^|\n)\s*\{[^\n{}]+\}\s*($|\n)/m.test(content)
}

export function TextPreview({ manifest }: { manifest: PreviewManifest }) {
  const isMarkdown = ["md", "markdown"].includes(manifest.name.split(".").pop()?.toLowerCase() ?? "")
  const [content, setContent] = React.useState("")
  const [view, setView] = React.useState<"visual" | "source" | "split">(isMarkdown ? "visual" : "source")
  const [version, setVersion] = React.useState(manifest.version)
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [dirty, setDirty] = React.useState(false)
  const [sourceOnly, setSourceOnly] = React.useState(false)
  const [hoveredSourceRange, setHoveredSourceRange] = React.useState<SourceLineRange | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const splitEditorRef = React.useRef<AdaptiveCodeEditorHandle>(null)
  const splitPreviewRef = React.useRef<MarkdownPreviewHandle>(null)
  const editable = manifest.capabilities.includes("edit")
  const maxBytes = typeof manifest.metadata.max_bytes === "number" ? manifest.metadata.max_bytes : 5 * 1024 * 1024
  const textEncoding = typeof manifest.metadata.text_encoding === "string" ? manifest.metadata.text_encoding : "utf-8"
  const truncated = manifest.size > maxBytes

  const syncPreviewScroll = React.useCallback((ratio: number) => {
    splitPreviewRef.current?.setScrollRatio(ratio)
  }, [])

  const syncEditorScroll = React.useCallback((ratio: number) => {
    splitEditorRef.current?.setScrollRatio(ratio)
  }, [])

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
    setView(isMarkdown ? "visual" : "source")
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
          const decoded = new TextDecoder(textEncoding).decode(value)
          setContent(decoded)
          setSourceOnly(isMarkdown && hasExtendedMarkdownSyntax(decoded))
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

  const language = inferLanguage(manifest.name)
  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="truncate text-xs text-muted-foreground">
          {language.label} · {textEncoding.toUpperCase()}{truncated ? ` · 仅显示前 ${Math.round(maxBytes / 1024 / 1024)} MB` : ""}{dirty ? " · 未保存" : ""}{sourceOnly ? " · 检测到扩展语法，使用源码模式" : ""}
        </span>
        <div className="flex items-center gap-2">
          {isMarkdown ? <ToggleGroup type="single" value={sourceOnly ? "source" : view} onValueChange={(value) => { if (!sourceOnly && (value === "visual" || value === "source" || value === "split")) setView(value) }} variant="outline" size="sm" spacing={0} aria-label="Markdown 编辑模式"><ToggleGroupItem value="visual" disabled={sourceOnly} aria-label="所见即所得编辑"><IconEdit data-icon="inline-start" />编辑</ToggleGroupItem><ToggleGroupItem value="source" aria-label="编辑 Markdown 源码"><IconCode data-icon="inline-start" />源码</ToggleGroupItem><ToggleGroupItem value="split" disabled={sourceOnly} aria-label="左侧源码、右侧预览"><IconColumns3 data-icon="inline-start" />分屏</ToggleGroupItem></ToggleGroup> : null}
          {editable ? <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={() => void save()}>{saving ? <IconLoader2 data-icon="inline-start" className="animate-spin" /> : <IconDeviceFloppy data-icon="inline-start" />}保存</Button> : null}
        </div>
      </div>
      {isMarkdown && view === "split" && !sourceOnly ? (
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="min-h-0 min-w-0 flex-1 border-b border-border md:border-b-0 md:border-r">
            <AdaptiveCodeEditor
              ref={splitEditorRef}
              value={content}
              language={language.id}
              readOnly={!editable}
              ariaLabel={`${manifest.name} Markdown 源码编辑器`}
              onChange={(value) => { setContent(value); setDirty(true) }}
              onSave={() => void save()}
              onScrollRatioChange={syncPreviewScroll}
              highlightRange={hoveredSourceRange}
            />
          </div>
          <div className="min-h-0 min-w-0 flex-1">
            <MarkdownPreview
              ref={splitPreviewRef}
              content={content}
              onScrollRatioChange={syncEditorScroll}
              onSourceRangeHover={setHoveredSourceRange}
            />
          </div>
        </div>
      ) : isMarkdown && view === "visual" && !sourceOnly ? (
        <div className="min-h-0 flex-1">
          {editable ? (
            <React.Suspense fallback={<PreviewSkeleton kind="text" />}>
              <MarkdownEditor
                key={`${manifest.node_id}:${version}`}
                initialValue={content}
                readOnly={false}
                onChange={(value) => { setContent(value); setDirty(true) }}
              />
            </React.Suspense>
          ) : <MarkdownPreview content={content} />}
        </div>
      ) : (
        <div className="min-h-0 flex-1">
          <AdaptiveCodeEditor
            value={content}
            language={language.id}
            readOnly={!editable}
            ariaLabel={`${manifest.name} 文本编辑器`}
            onChange={(value) => { setContent(value); setDirty(true) }}
            onSave={() => void save()}
          />
        </div>
      )}
    </div>
  )
}
