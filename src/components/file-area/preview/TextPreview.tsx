import * as React from "react"
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker"
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker"
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import TypeScriptWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"
import { IconCode, IconDeviceFloppy, IconEye, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"

import type { PreviewManifest } from "@/api/files"
import { saveTextPreview } from "@/api/files"
import { requestResponse } from "@/api/client"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useIsMobile } from "@/hooks/use-mobile"
import { MarkdownPreview } from "./MarkdownPreview"

type MonacoApi = typeof import("monaco-editor")

type MonacoWorkerEnvironment = {
  getWorker(_: string, label: string): Worker
}

function configureWorkers() {
  const scope = self as typeof self & { MonacoEnvironment?: MonacoWorkerEnvironment }
  scope.MonacoEnvironment = {
    getWorker: (_moduleId, label) => {
      if (label === "json") return new JsonWorker()
      if (label === "css" || label === "scss" || label === "less") return new CssWorker()
      if (label === "html" || label === "handlebars" || label === "razor") return new HtmlWorker()
      if (label === "typescript" || label === "javascript") return new TypeScriptWorker()
      return new EditorWorker()
    },
  }
}

const languageByExtension: Record<string, string> = {
  c: "c",
  cpp: "cpp",
  cs: "csharp",
  css: "css",
  go: "go",
  h: "cpp",
  html: "html",
  ini: "ini",
  java: "java",
  js: "javascript",
  json: "json",
  jsx: "javascript",
  md: "markdown",
  php: "php",
  py: "python",
  rb: "ruby",
  rs: "rust",
  sh: "shell",
  sql: "sql",
  ts: "typescript",
  tsx: "typescript",
  xml: "xml",
  yaml: "yaml",
  yml: "yaml",
}

function inferLanguage(name: string) {
  const extension = name.split(".").pop()?.toLowerCase() ?? ""
  return languageByExtension[extension] ?? "plaintext"
}

export function TextPreview({ manifest }: { manifest: PreviewManifest }) {
  const isMobile = useIsMobile()
  const isMarkdown = ["md", "markdown"].includes(manifest.name.split(".").pop()?.toLowerCase() ?? "")
  const hostRef = React.useRef<HTMLDivElement>(null)
  const editorRef = React.useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = React.useRef<MonacoApi | null>(null)
  const saveHandlerRef = React.useRef<() => void>(() => undefined)
  const draftRef = React.useRef("")
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
    const value = editorRef.current?.getValue() ?? draftRef.current
    setSaving(true)
    try {
      const result = await saveTextPreview(manifest.node_id, value, version)
      setVersion(result.version)
      setContent(value)
      draftRef.current = value
      setDirty(false)
      toast.success("文件已保存")
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "保存失败，请刷新后重试")
    } finally {
      setSaving(false)
    }
  }, [dirty, editable, manifest.node_id, saving, version])
  saveHandlerRef.current = () => void save()

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setDirty(false)
    setVersion(manifest.version)
    setView(isMarkdown ? "preview" : "source")
    void requestResponse(manifest.assets.source.url, {
      signal: controller.signal,
      cache: "no-store",
      headers: truncated ? { Range: `bytes=0-${maxBytes - 1}` } : undefined,
    })
      .then((response) => response.arrayBuffer())
      .then((value) => {
        const decoded = new TextDecoder(textEncoding).decode(value)
        setContent(decoded)
        draftRef.current = decoded
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "文本加载失败")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [isMarkdown, manifest.assets.source.url, manifest.node_id, manifest.version, maxBytes, textEncoding, truncated])

  React.useEffect(() => {
    if (loading || error || isMobile || view !== "source" || !hostRef.current) return
    let disposed = false
    configureWorkers()
    void import("monaco-editor").then((monaco) => {
      if (disposed || !hostRef.current) return
      monacoRef.current = monaco
      const dark = document.documentElement.classList.contains("dark")
      const editor = monaco.editor.create(hostRef.current, {
        value: content,
        language: inferLanguage(manifest.name),
        theme: dark ? "vs-dark" : "vs",
        readOnly: !editable,
        automaticLayout: true,
        minimap: { enabled: window.innerWidth >= 1200 },
        fontSize: 14,
        lineHeight: 22,
        scrollBeyondLastLine: false,
        smoothScrolling: true,
        wordWrap: "off",
        padding: { top: 12, bottom: 12 },
      })
      editorRef.current = editor
      editor.onDidChangeModelContent(() => {
        draftRef.current = editor.getValue()
        setDirty(true)
      })
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => saveHandlerRef.current())
    })

    const themeObserver = new MutationObserver(() => {
      const monaco = monacoRef.current
      if (!monaco) return
      monaco.editor.setTheme(document.documentElement.classList.contains("dark") ? "vs-dark" : "vs")
    })
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] })

    return () => {
      disposed = true
      themeObserver.disconnect()
      editorRef.current?.dispose()
      editorRef.current = null
      monacoRef.current = null
    }
  }, [content, editable, error, isMobile, loading, manifest.name, view])

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><IconLoader2 size={20} className="mr-2 animate-spin" />正在加载文本</div>
  }

  if (error) {
    return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">{error}</div>
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-border px-3">
        <span className="truncate text-xs text-muted-foreground">
          {inferLanguage(manifest.name)} · {textEncoding.toUpperCase()}{truncated ? ` · 仅显示前 ${Math.round(maxBytes / 1024 / 1024)} MB` : ""}{dirty ? " · 未保存" : ""}
        </span>
        <div className="flex items-center gap-2">
          {isMarkdown ? (
            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(value) => {
                if (value !== "preview" && value !== "source") return
                if (value === "preview") setContent(editorRef.current?.getValue() ?? draftRef.current)
                setView(value)
              }}
              variant="outline"
              size="sm"
              spacing={0}
              aria-label="Markdown 查看模式"
            >
              <ToggleGroupItem value="preview" aria-label="预览 Markdown"><IconEye data-icon="inline-start" />预览</ToggleGroupItem>
              <ToggleGroupItem value="source" aria-label="查看 Markdown 源码"><IconCode data-icon="inline-start" />源码</ToggleGroupItem>
            </ToggleGroup>
          ) : null}
          {editable && !isMobile ? (
            <Button size="sm" variant="outline" disabled={!dirty || saving} onClick={() => void save()}>
              {saving ? <IconLoader2 data-icon="inline-start" className="animate-spin" /> : <IconDeviceFloppy data-icon="inline-start" />}
              保存
            </Button>
          ) : null}
        </div>
      </div>
      {isMarkdown && view === "preview" ? (
        <div className="min-h-0 flex-1"><MarkdownPreview content={content} /></div>
      ) : isMobile ? (
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre p-4 font-mono text-[13px] leading-5 text-foreground">{content}</pre>
      ) : (
        <div ref={hostRef} className="min-h-0 flex-1" />
      )}
    </div>
  )
}
