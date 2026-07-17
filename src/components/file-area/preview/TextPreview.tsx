import * as React from "react"
import EditorWorker from "monaco-editor/esm/vs/editor/editor.worker?worker"
import CssWorker from "monaco-editor/esm/vs/language/css/css.worker?worker"
import HtmlWorker from "monaco-editor/esm/vs/language/html/html.worker?worker"
import JsonWorker from "monaco-editor/esm/vs/language/json/json.worker?worker"
import TypeScriptWorker from "monaco-editor/esm/vs/language/typescript/ts.worker?worker"
import { IconDeviceFloppy, IconLoader2 } from "@tabler/icons-react"
import { toast } from "sonner"

import type { PreviewManifest } from "@/api/files"
import { saveTextPreview } from "@/api/files"
import { requestResponse } from "@/api/client"
import { Button } from "@/components/ui/button"
import { useIsMobile } from "@/hooks/use-mobile"

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
  const hostRef = React.useRef<HTMLDivElement>(null)
  const editorRef = React.useRef<import("monaco-editor").editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = React.useRef<MonacoApi | null>(null)
  const saveHandlerRef = React.useRef<() => void>(() => undefined)
  const [content, setContent] = React.useState("")
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
    const value = editorRef.current?.getValue() ?? content
    setSaving(true)
    try {
      const result = await saveTextPreview(manifest.node_id, value, version)
      setVersion(result.version)
      setContent(value)
      setDirty(false)
      toast.success("文件已保存")
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "保存失败，请刷新后重试")
    } finally {
      setSaving(false)
    }
  }, [content, dirty, editable, manifest.node_id, saving, version])
  saveHandlerRef.current = () => void save()

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    setDirty(false)
    setVersion(manifest.version)
    void requestResponse(manifest.assets.source.url, {
      signal: controller.signal,
      cache: "no-store",
      headers: truncated ? { Range: `bytes=0-${maxBytes - 1}` } : undefined,
    })
      .then((response) => response.arrayBuffer())
      .then((value) => setContent(new TextDecoder(textEncoding).decode(value)))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : "文本加载失败")
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [manifest.assets.source.url, manifest.node_id, manifest.version, maxBytes, textEncoding, truncated])

  React.useEffect(() => {
    if (loading || error || isMobile || !hostRef.current) return
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
      editor.onDidChangeModelContent(() => setDirty(true))
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
  }, [content, editable, error, isMobile, loading, manifest.name])

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
        {editable && !isMobile ? (
          <Button size="sm" variant="outline" className="h-8" disabled={!dirty || saving} onClick={() => void save()}>
            {saving ? <IconLoader2 size={15} className="mr-1.5 animate-spin" /> : <IconDeviceFloppy size={15} className="mr-1.5" />}
            保存
          </Button>
        ) : null}
      </div>
      {isMobile ? (
        <pre className="min-h-0 flex-1 overflow-auto whitespace-pre p-4 font-mono text-[13px] leading-5 text-foreground">{content}</pre>
      ) : (
        <div ref={hostRef} className="min-h-0 flex-1" />
      )}
    </div>
  )
}
