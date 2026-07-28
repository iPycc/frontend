import * as React from "react"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist"
import {
  IconChevronLeft,
  IconChevronRight,
  IconLoader2,
  IconRotateClockwise,
  IconSearch,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react"

import type { PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { isSameOriginPreviewUrl, previewSourceUrls } from "@/lib/preview-assets"

export function PdfPreview({ manifest }: { manifest: PreviewManifest }) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const viewportHostRef = React.useRef<HTMLDivElement>(null)
  const [document, setDocument] = React.useState<PDFDocumentProxy | null>(null)
  const [pageNumber, setPageNumber] = React.useState(1)
  const [scale, setScale] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const renderTaskRef = React.useRef<{ cancel: () => void } | null>(null)
  const sources = previewSourceUrls(manifest)
  const sourceSignature = sources.join("\n")
  const [sourceIndex, setSourceIndex] = React.useState(0)
  const source = sources[sourceIndex] ?? manifest.assets.source.url

  React.useEffect(() => {
    setSourceIndex(0)
  }, [manifest.node_id, manifest.version, sourceSignature])

  React.useEffect(() => {
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    setLoading(true)
    setError(null)
    setPageNumber(1)
    setScale(1)
    setRotation(0)

    void import("pdfjs-dist").then((pdfjs) => {
      if (cancelled) return
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      loadingTask = pdfjs.getDocument({
        url: source,
        withCredentials: isSameOriginPreviewUrl(source),
      })
      return loadingTask.promise.then((pdf) => {
        if (!cancelled) setDocument(pdf)
      })
    }).catch((reason: unknown) => {
      if (!cancelled && sourceIndex + 1 < sources.length) {
        setSourceIndex((value) => value + 1)
        return
      }
      if (!cancelled) setError(reason instanceof Error ? reason.message : "PDF 加载失败")
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      void loadingTask?.destroy()
      setDocument(null)
    }
  }, [manifest.node_id, manifest.version, source, sourceIndex, sources.length])

  React.useEffect(() => {
    if (!document || !canvasRef.current) return
    let cancelled = false
    renderTaskRef.current?.cancel()
    setLoading(true)
    void document.getPage(pageNumber).then((page) => {
      if (cancelled || !canvasRef.current) return
      const viewport = page.getViewport({ scale, rotation })
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = canvasRef.current
      canvas.width = Math.ceil(viewport.width * pixelRatio)
      canvas.height = Math.ceil(viewport.height * pixelRatio)
      canvas.style.width = `${Math.ceil(viewport.width)}px`
      canvas.style.height = `${Math.ceil(viewport.height)}px`
      const context = canvas.getContext("2d")
      if (!context) throw new Error("Canvas is unavailable")
      const renderTask = page.render({
        canvas,
        canvasContext: context,
        viewport,
        transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
      })
      renderTaskRef.current = renderTask
      return renderTask.promise
    }).catch((reason: unknown) => {
      if (!cancelled && (reason as { name?: string })?.name !== "RenderingCancelledException") {
        setError(reason instanceof Error ? reason.message : "PDF 页面渲染失败")
      }
    }).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
    }
  }, [document, pageNumber, rotation, scale])

  const fitWidth = React.useCallback(async () => {
    if (!document || !viewportHostRef.current) return
    const page = await document.getPage(pageNumber)
    const viewport = page.getViewport({ scale: 1, rotation })
    const available = Math.max(viewportHostRef.current.clientWidth - 48, 200)
    setScale(Math.min(Math.max(available / viewport.width, 0.25), 3))
  }, [document, pageNumber, rotation])

  const findText = React.useCallback(async () => {
    const normalized = query.trim().toLowerCase()
    if (!document || !normalized) return
    setSearching(true)
    try {
      for (let pageIndex = 1; pageIndex <= document.numPages; pageIndex += 1) {
        const page = await document.getPage(pageIndex)
        const text = await page.getTextContent()
        const haystack = text.items
          .map((item) => ("str" in item ? item.str : ""))
          .join(" ")
          .toLowerCase()
        if (haystack.includes(normalized)) {
          setPageNumber(pageIndex)
          return
        }
      }
      setError(`未找到“${query.trim()}”`)
    } finally {
      setSearching(false)
    }
  }, [document, query])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-muted/40">
      <div className="flex h-11 shrink-0 items-center gap-2 border-b border-border bg-background px-3">
        <div className="relative min-w-0 max-w-64 flex-1">
          <IconSearch size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void findText()
            }}
            placeholder="在 PDF 中查找"
            className="h-8 pl-8 text-xs"
          />
        </div>
        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => void findText()} disabled={searching || !query.trim()}>
          {searching ? <IconLoader2 size={14} className="mr-1 animate-spin" /> : null}
          查找
        </Button>
      </div>

      <div ref={viewportHostRef} className="relative min-h-0 flex-1 overflow-auto p-6">
        {loading ? (
          <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-muted-foreground">
            <IconLoader2 size={22} className="animate-spin" />
            <span className="ml-2 text-sm">正在渲染 PDF</span>
          </div>
        ) : null}
        {error && !document ? (
          <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">{error}</div>
        ) : (
          <canvas ref={canvasRef} className="mx-auto bg-white shadow-sm" aria-label={`PDF 第 ${pageNumber} 页`} />
        )}
      </div>

      <div className="flex h-12 shrink-0 items-center justify-center gap-1 border-t border-border bg-background px-3">
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={pageNumber <= 1} onClick={() => setPageNumber((value) => value - 1)} aria-label="上一页">
          <IconChevronLeft size={18} />
        </Button>
        <span className="min-w-20 text-center text-xs tabular-nums text-muted-foreground">
          {pageNumber} / {document?.numPages ?? "–"}
        </span>
        <Button variant="ghost" size="icon" className="h-9 w-9" disabled={!document || pageNumber >= document.numPages} onClick={() => setPageNumber((value) => value + 1)} aria-label="下一页">
          <IconChevronRight size={18} />
        </Button>
        <span className="mx-1 h-5 w-px bg-border" />
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setScale((value) => Math.max(value - 0.15, 0.25))} aria-label="缩小">
          <IconZoomOut size={18} />
        </Button>
        <span className="min-w-14 text-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setScale((value) => Math.min(value + 0.15, 4))} aria-label="放大">
          <IconZoomIn size={18} />
        </Button>
        <Button variant="ghost" size="sm" className="h-9 px-2 text-xs" onClick={() => void fitWidth()}>适合宽度</Button>
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setRotation((value) => (value + 90) % 360)} aria-label="旋转">
          <IconRotateClockwise size={18} />
        </Button>
      </div>
    </div>
  )
}
