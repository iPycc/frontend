import * as React from "react"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import type { PDFDocumentLoadingTask } from "pdfjs-dist"

import { getPreviewManifest } from "@/api/files"
import { Skeleton } from "@/components/ui/skeleton"
import { isSameOriginPreviewUrl, previewSourceUrls } from "@/lib/preview-assets"

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null

function loadPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      return pdfjs
    })
  }
  return pdfjsPromise
}

export function PdfCardPreview({
  nodeId,
  version,
  fallback,
}: {
  nodeId: number
  version?: string
  fallback: React.ReactNode
}) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const renderTaskRef = React.useRef<{ cancel: () => void } | null>(null)
  const [visible, setVisible] = React.useState(false)
  const [loading, setLoading] = React.useState(true)
  const [failed, setFailed] = React.useState(false)

  React.useEffect(() => {
    const host = hostRef.current
    if (!host) return
    if (!("IntersectionObserver" in window)) {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: "240px" }
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [])

  React.useEffect(() => {
    if (!visible || !canvasRef.current || !hostRef.current) return
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    setLoading(true)
    setFailed(false)

    const render = async () => {
      const [pdfjs, manifest] = await Promise.all([
        loadPdfjs(),
        getPreviewManifest(nodeId),
      ])
      let lastError: unknown
      for (const source of previewSourceUrls(manifest)) {
        if (cancelled) return
        try {
          loadingTask = pdfjs.getDocument({
            url: source,
            withCredentials: isSameOriginPreviewUrl(source),
            disableAutoFetch: true,
            disableStream: true,
            rangeChunkSize: 64 * 1024,
          })
          const document = await loadingTask.promise
          if (cancelled || !canvasRef.current || !hostRef.current) return
          const page = await document.getPage(1)
          if (cancelled || !canvasRef.current || !hostRef.current) return
          const original = page.getViewport({ scale: 1 })
          const cssWidth = Math.max(hostRef.current.clientWidth - 24, 160)
          const scale = cssWidth / original.width
          const viewport = page.getViewport({ scale })
          const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
          const canvas = canvasRef.current
          canvas.width = Math.ceil(viewport.width * pixelRatio)
          canvas.height = Math.ceil(viewport.height * pixelRatio)
          canvas.style.width = `${Math.ceil(viewport.width)}px`
          canvas.style.height = `${Math.ceil(viewport.height)}px`
          const context = canvas.getContext("2d", { alpha: false })
          if (!context) throw new Error("Canvas is unavailable")
          const renderTask = page.render({
            canvas,
            canvasContext: context,
            viewport,
            background: "#ffffff",
            transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
          })
          renderTaskRef.current = renderTask
          await renderTask.promise
          page.cleanup()
          await loadingTask.destroy()
          loadingTask = null
          return
        } catch (reason) {
          lastError = reason
          await loadingTask?.destroy()
          loadingTask = null
        }
      }
      throw lastError ?? new Error("PDF preview source is unavailable")
    }

    void render()
      .catch((reason: unknown) => {
        if (!cancelled && (reason as { name?: string })?.name !== "RenderingCancelledException") {
          setFailed(true)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
      renderTaskRef.current?.cancel()
      renderTaskRef.current = null
      void loadingTask?.destroy()
    }
  }, [nodeId, version, visible])

  if (failed) return fallback

  return (
    <div
      ref={hostRef}
      className="pointer-events-none absolute inset-0 flex items-start justify-center overflow-hidden bg-muted/40 p-3"
      aria-hidden="true"
    >
      {loading ? <Skeleton className="absolute inset-0 size-full rounded-none" /> : null}
      <canvas
        ref={canvasRef}
        className="h-auto max-w-full border border-border bg-background shadow-sm"
      />
    </div>
  )
}
