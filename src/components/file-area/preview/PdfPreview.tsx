import * as React from "react"
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from "pdfjs-dist"
import {
  IconArrowBackUp,
  IconChevronLeft,
  IconChevronRight,
  IconHighlight,
  IconLetterT,
  IconLoader2,
  IconPencil,
  IconRotateClockwise,
  IconRefresh,
  IconSearch,
  IconSquare,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react"
import { toast } from "sonner"

import {
  getPdfAnnotations,
  savePdfAnnotations,
  type PdfAnnotation,
  type PdfAnnotationKind,
  type PreviewManifest,
} from "@/api/files"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { isSameOriginPreviewUrl, previewSourceUrls } from "@/lib/preview-assets"
import { cn } from "@/lib/utils"
import { PreviewSkeleton } from "./PreviewSkeleton"

type Point = [number, number]
type CanvasSize = { width: number; height: number }
const DEFAULT_PDF_PAGE_SIZE: CanvasSize = { width: 595, height: 842 }

function scaledPageSize(size: CanvasSize, scale: number, rotation: number): CanvasSize {
  const swapAxes = Math.abs(Math.round(rotation / 90)) % 2 === 1
  return {
    width: Math.ceil((swapAxes ? size.height : size.width) * scale),
    height: Math.ceil((swapAxes ? size.width : size.height) * scale),
  }
}

function rotatePoint(point: Point, delta: number): Point {
  const normalized = ((delta % 360) + 360) % 360
  if (normalized === 90) return [1 - point[1], point[0]]
  if (normalized === 180) return [1 - point[0], 1 - point[1]]
  if (normalized === 270) return [point[1], 1 - point[0]]
  return point
}

function annotationForRotation(annotation: PdfAnnotation, rotation: number): PdfAnnotation {
  const delta = rotation - annotation.rotation
  const points = annotation.points.map((point) => rotatePoint(point, delta))
  const corners = [
    rotatePoint([annotation.x, annotation.y], delta),
    rotatePoint([annotation.x + annotation.width, annotation.y + annotation.height], delta),
  ]
  const x = Math.min(corners[0][0], corners[1][0])
  const y = Math.min(corners[0][1], corners[1][1])
  return {
    ...annotation,
    x,
    y,
    width: Math.abs(corners[1][0] - corners[0][0]),
    height: Math.abs(corners[1][1] - corners[0][1]),
    points,
    rotation,
  }
}

function PdfAnnotationLayer({
  annotations,
  page,
  rotation,
  size,
  tool,
  color,
  text,
  onCommit,
}: {
  annotations: PdfAnnotation[]
  page: number
  rotation: number
  size: CanvasSize
  tool: PdfAnnotationKind | null
  color: string
  text: string
  onCommit: (annotation: PdfAnnotation) => void
}) {
  const [draft, setDraft] = React.useState<PdfAnnotation | null>(null)
  React.useEffect(() => setDraft(null), [page, rotation, tool])
  const visible = annotations.filter((item) => item.page === page).map((item) => annotationForRotation(item, rotation))
  if (draft) visible.push(draft)

  const pointFromEvent = (event: React.PointerEvent<SVGSVGElement>): Point => {
    const bounds = event.currentTarget.getBoundingClientRect()
    return [
      Math.min(1, Math.max(0, (event.clientX - bounds.left) / bounds.width)),
      Math.min(1, Math.max(0, (event.clientY - bounds.top) / bounds.height)),
    ]
  }

  const start = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!tool) return
    const [x, y] = pointFromEvent(event)
    const next: PdfAnnotation = {
      id: crypto.randomUUID(),
      page,
      kind: tool,
      color,
      x,
      y,
      width: tool === "text" ? 0.28 : 0,
      height: tool === "text" ? 0.06 : 0,
      points: tool === "pen" ? [[x, y]] : [],
      text: tool === "text" ? text.trim() || "文本" : null,
      rotation,
    }
    if (tool === "text") {
      onCommit(next)
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDraft(next)
  }

  const move = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!draft) return
    const [x, y] = pointFromEvent(event)
    if (draft.kind === "pen") {
      const last = draft.points.at(-1)
      if (last && Math.hypot(x - last[0], y - last[1]) < 0.002) return
      setDraft({ ...draft, points: [...draft.points, [x, y]] })
      return
    }
    setDraft({ ...draft, width: x - draft.x, height: y - draft.y })
  }

  const finish = () => {
    if (!draft) return
    let next = draft
    if (next.width < 0) next = { ...next, x: next.x + next.width, width: Math.abs(next.width) }
    if (next.height < 0) next = { ...next, y: next.y + next.height, height: Math.abs(next.height) }
    setDraft(null)
    if (next.kind === "pen" ? next.points.length > 1 : next.width > 0.003 && next.height > 0.003) onCommit(next)
  }

  return (
    <svg
      viewBox={`0 0 ${size.width} ${size.height}`}
      className={cn("absolute inset-0 size-full", tool ? "cursor-crosshair touch-none" : "pointer-events-none")}
      aria-label="PDF 私人标注层"
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={finish}
      onPointerCancel={() => setDraft(null)}
    >
      {visible.map((annotation) => {
        const x = annotation.x * size.width
        const y = annotation.y * size.height
        const width = annotation.width * size.width
        const height = annotation.height * size.height
        if (annotation.kind === "pen") {
          return <polyline key={annotation.id} points={annotation.points.map(([px, py]) => `${px * size.width},${py * size.height}`).join(" ")} fill="none" stroke={annotation.color} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        }
        if (annotation.kind === "text") {
          return <text key={annotation.id} x={x} y={y + 16} fill={annotation.color} fontSize={16} fontWeight={600}>{annotation.text}</text>
        }
        return (
          <rect
            key={annotation.id}
            x={x}
            y={y}
            width={width}
            height={height}
            rx={annotation.kind === "highlight" ? 2 : 0}
            fill={annotation.kind === "highlight" ? annotation.color : "transparent"}
            fillOpacity={annotation.kind === "highlight" ? 0.28 : 0}
            stroke={annotation.color}
            strokeOpacity={annotation.kind === "highlight" ? 0.38 : 1}
            strokeWidth={annotation.kind === "highlight" ? 1 : 2}
            vectorEffect="non-scaling-stroke"
          />
        )
      })}
    </svg>
  )
}

function PdfThumbnail({
  document,
  page,
  active,
  onSelect,
  registerHost,
  scrollRoot,
}: {
  document: PDFDocumentProxy
  page: number
  active: boolean
  onSelect: () => void
  registerHost: (page: number, element: HTMLButtonElement | null) => void
  scrollRoot: React.RefObject<HTMLElement | null>
}) {
  const hostRef = React.useRef<HTMLButtonElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [visible, setVisible] = React.useState(page <= 3)

  React.useEffect(() => {
    registerHost(page, hostRef.current)
    return () => registerHost(page, null)
  }, [page, registerHost])

  React.useEffect(() => {
    if (!hostRef.current || !scrollRoot.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { root: scrollRoot.current, rootMargin: "240px" },
    )
    observer.observe(hostRef.current)
    return () => observer.disconnect()
  }, [scrollRoot])

  React.useEffect(() => {
    if (!visible || !canvasRef.current) return
    let cancelled = false
    let task: { cancel: () => void; promise: Promise<void> } | null = null
    void document.getPage(page).then((pdfPage) => {
      if (cancelled || !canvasRef.current) return
      const base = pdfPage.getViewport({ scale: 1 })
      const viewport = pdfPage.getViewport({ scale: 84 / base.width })
      const canvas = canvasRef.current
      canvas.width = Math.ceil(viewport.width)
      canvas.height = Math.ceil(viewport.height)
      const context = canvas.getContext("2d")
      if (!context) return
      task = pdfPage.render({ canvas, canvasContext: context, viewport })
      return task.promise
    }).catch((reason: unknown) => {
      if ((reason as { name?: string })?.name !== "RenderingCancelledException") return
    })
    return () => { cancelled = true; task?.cancel() }
  }, [document, page, visible])

  return (
    <button
      ref={hostRef}
      type="button"
      onClick={onSelect}
      className={cn("w-24 shrink-0 rounded-md border p-1.5 text-center", active ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted")}
      aria-label={`转到第 ${page} 页`}
      aria-current={active ? "page" : undefined}
    >
      <span className="mx-auto flex h-24 w-20 items-center justify-center overflow-hidden bg-white shadow-sm">
        {visible ? <canvas ref={canvasRef} className="max-h-full max-w-full bg-white" /> : null}
      </span>
      <span className="mt-1 block text-[11px] tabular-nums text-muted-foreground">{page}</span>
    </button>
  )
}

function PdfPageView({
  document,
  page,
  scale,
  rotation,
  annotations,
  tool,
  color,
  text,
  onCommit,
  registerHost,
  scrollRoot,
  fallbackSize,
}: {
  document: PDFDocumentProxy
  page: number
  scale: number
  rotation: number
  annotations: PdfAnnotation[]
  tool: PdfAnnotationKind | null
  color: string
  text: string
  onCommit: (annotation: PdfAnnotation) => void
  registerHost: (page: number, element: HTMLDivElement | null) => void
  scrollRoot: React.RefObject<HTMLDivElement | null>
  fallbackSize: CanvasSize
}) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const [pageSize, setPageSize] = React.useState<CanvasSize | null>(page === 1 ? fallbackSize : null)
  const [shouldRender, setShouldRender] = React.useState(page <= 2)
  const renderTaskRef = React.useRef<{ cancel: () => void } | null>(null)
  const size = scaledPageSize(pageSize ?? fallbackSize, scale, rotation)

  React.useEffect(() => {
    const host = hostRef.current
    registerHost(page, host)
    return () => registerHost(page, null)
  }, [page, registerHost])

  React.useEffect(() => {
    if (!hostRef.current || !scrollRoot.current) return
    const observer = new IntersectionObserver(
      ([entry]) => setShouldRender(entry.isIntersecting),
      { root: scrollRoot.current, rootMargin: "1000px 0px" },
    )
    observer.observe(hostRef.current)
    return () => observer.disconnect()
  }, [scrollRoot])

  React.useEffect(() => {
    setPageSize(page === 1 ? fallbackSize : null)
  }, [document, fallbackSize, page])

  React.useEffect(() => {
    if (!shouldRender || !canvasRef.current) return
    let cancelled = false
    renderTaskRef.current?.cancel()
    void document.getPage(page).then((pdfPage) => {
      if (cancelled || !canvasRef.current) return
      const baseViewport = pdfPage.getViewport({ scale: 1, rotation: 0 })
      setPageSize({ width: baseViewport.width, height: baseViewport.height })
      const viewport = pdfPage.getViewport({ scale, rotation })
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      const canvas = canvasRef.current
      canvas.width = Math.ceil(viewport.width * pixelRatio)
      canvas.height = Math.ceil(viewport.height * pixelRatio)
      canvas.style.width = `${Math.ceil(viewport.width)}px`
      canvas.style.height = `${Math.ceil(viewport.height)}px`
      const context = canvas.getContext("2d")
      if (!context) return
      const task = pdfPage.render({ canvas, canvasContext: context, viewport, transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0] })
      renderTaskRef.current = task
      return task.promise
    }).catch((reason: unknown) => {
      if ((reason as { name?: string })?.name !== "RenderingCancelledException") return
    })
    return () => { cancelled = true; renderTaskRef.current?.cancel() }
  }, [document, page, scale, rotation, shouldRender])

  return (
    <div
      ref={hostRef}
      data-page={page}
      className="relative mx-auto bg-white shadow-sm"
      style={{ width: size.width, height: size.height }}
    >
      {shouldRender ? <canvas ref={canvasRef} className="block bg-white" aria-label={`PDF 第 ${page} 页`} /> : null}
      {shouldRender ? (
        <PdfAnnotationLayer annotations={annotations} page={page} rotation={rotation} size={size} tool={tool} color={color} text={text} onCommit={onCommit} />
      ) : null}
    </div>
  )
}

export function PdfPreview({ manifest }: { manifest: PreviewManifest }) {
  const viewportHostRef = React.useRef<HTMLDivElement>(null)
  const thumbnailListRef = React.useRef<HTMLElement>(null)
  const pageHostRefs = React.useRef(new Map<number, HTMLDivElement>())
  const thumbnailHostRefs = React.useRef(new Map<number, HTMLButtonElement>())
  const pageNumberRef = React.useRef(1)
  const [document, setDocument] = React.useState<PDFDocumentProxy | null>(null)
  const [defaultPageSize, setDefaultPageSize] = React.useState<CanvasSize>(DEFAULT_PDF_PAGE_SIZE)
  const [pageNumber, setPageNumber] = React.useState(1)
  const [pageInput, setPageInput] = React.useState("1")
  const [pageInputFocused, setPageInputFocused] = React.useState(false)
  const [scale, setScale] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [query, setQuery] = React.useState("")
  const [searching, setSearching] = React.useState(false)
  const [annotations, setAnnotations] = React.useState<PdfAnnotation[]>([])
  const [annotationRevision, setAnnotationRevision] = React.useState(0)
  const [annotationReady, setAnnotationReady] = React.useState(false)
  const [annotationDirty, setAnnotationDirty] = React.useState(false)
  const [annotationSaving, setAnnotationSaving] = React.useState(false)
  const [annotationSaveBlocked, setAnnotationSaveBlocked] = React.useState(false)
  const [annotationStale, setAnnotationStale] = React.useState(false)
  const [tool, setTool] = React.useState<PdfAnnotationKind | null>(null)
  const [color, setColor] = React.useState("#f59e0b")
  const [annotationText, setAnnotationText] = React.useState("")
  const annotationSerialRef = React.useRef(0)
  const sources = previewSourceUrls(manifest)
  const sourceSignature = sources.join("\n")
  const [sourceIndex, setSourceIndex] = React.useState(0)
  const source = sources[sourceIndex] ?? manifest.assets.source.url
  const canAnnotate = manifest.capabilities.includes("annotate-personal")

  React.useEffect(() => { setSourceIndex(0) }, [manifest.node_id, manifest.version, sourceSignature])

  React.useEffect(() => {
    let cancelled = false
    let loadingTask: PDFDocumentLoadingTask | null = null
    setLoading(true)
    setError(null)
    setPageNumber(1)
    setPageInput("1")
    setDefaultPageSize(DEFAULT_PDF_PAGE_SIZE)
    setScale(1)
    setRotation(0)
    void import("pdfjs-dist").then((pdfjs) => {
      if (cancelled) return
      pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl
      loadingTask = pdfjs.getDocument({ url: source, withCredentials: isSameOriginPreviewUrl(source) })
      return loadingTask.promise.then(async (pdf) => {
        const firstPage = await pdf.getPage(1)
        const firstViewport = firstPage.getViewport({ scale: 1, rotation: 0 })
        if (!cancelled) {
          setDefaultPageSize({ width: firstViewport.width, height: firstViewport.height })
          setDocument(pdf)
        }
      })
    }).catch((reason: unknown) => {
      if (!cancelled && sourceIndex + 1 < sources.length) { setSourceIndex((value) => value + 1); return }
      if (!cancelled) setError(reason instanceof Error ? reason.message : "PDF 加载失败")
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true; void loadingTask?.destroy(); setDocument(null) }
  }, [manifest.node_id, manifest.version, source, sourceIndex, sources.length])

  React.useEffect(() => {
    if (!canAnnotate) { setAnnotationReady(true); return }
    const controller = new AbortController()
    setAnnotationReady(false)
    void getPdfAnnotations(manifest.node_id, controller.signal).then((value) => {
      setAnnotations(value.annotations)
      setAnnotationRevision(value.revision)
      setAnnotationStale(value.stale)
      setAnnotationDirty(false)
      setAnnotationSaveBlocked(false)
    }).catch((reason: unknown) => {
      if (!controller.signal.aborted) toast.error(reason instanceof Error ? reason.message : "私人标注加载失败")
    }).finally(() => { if (!controller.signal.aborted) setAnnotationReady(true) })
    return () => controller.abort()
  }, [canAnnotate, manifest.node_id, manifest.version])

  React.useEffect(() => {
    if (!canAnnotate || !annotationReady || !annotationDirty || annotationSaving || annotationSaveBlocked) return
    const serial = annotationSerialRef.current
    const timer = window.setTimeout(() => {
      setAnnotationSaving(true)
      void savePdfAnnotations(manifest.node_id, manifest.version, annotationRevision, annotations).then((value) => {
        setAnnotationRevision(value.revision)
        setAnnotationStale(false)
        if (annotationSerialRef.current === serial) setAnnotationDirty(false)
      }).catch((reason: unknown) => {
        setAnnotationSaveBlocked(true)
        toast.error(reason instanceof Error ? reason.message : "标注保存失败")
      }).finally(() => setAnnotationSaving(false))
    }, 700)
    return () => window.clearTimeout(timer)
  }, [annotationDirty, annotationReady, annotationRevision, annotationSaveBlocked, annotationSaving, annotations, canAnnotate, manifest.node_id, manifest.version])

  React.useEffect(() => {
    pageNumberRef.current = pageNumber
  }, [pageNumber])

  React.useEffect(() => {
    if (!pageInputFocused) setPageInput(String(pageNumber))
  }, [pageInputFocused, pageNumber])

  const registerPageHost = React.useCallback((page: number, element: HTMLDivElement | null) => {
    if (element) pageHostRefs.current.set(page, element)
    else pageHostRefs.current.delete(page)
  }, [])

  const registerThumbnailHost = React.useCallback((page: number, element: HTMLButtonElement | null) => {
    if (element) thumbnailHostRefs.current.set(page, element)
    else thumbnailHostRefs.current.delete(page)
  }, [])

  const scrollToPage = React.useCallback((page: number) => {
    const total = document?.numPages ?? page
    const target = Math.min(Math.max(page, 1), total)
    const distance = Math.abs(target - pageNumberRef.current)
    pageNumberRef.current = target
    setPageNumber(target)
    const host = pageHostRefs.current.get(target)
    const container = viewportHostRef.current
    if (!host || !container) return
    container.scrollTo({ top: Math.max(host.offsetTop - 24, 0), behavior: distance <= 2 ? "smooth" : "auto" })
  }, [document])

  React.useEffect(() => {
    const container = viewportHostRef.current
    if (!container || !document) return
    const visiblePages = new Map<number, HTMLElement>()
    let animationFrame = 0

    const syncActivePage = () => {
      animationFrame = 0
      if (!visiblePages.size) return
      const containerBounds = container.getBoundingClientRect()
      const anchor = containerBounds.top + Math.min(containerBounds.height * 0.3, 220)
      let closestPage = pageNumberRef.current
      let closestDistance = Number.POSITIVE_INFINITY

      visiblePages.forEach((element, page) => {
        const bounds = element.getBoundingClientRect()
        const distance = anchor < bounds.top
          ? bounds.top - anchor
          : anchor > bounds.bottom
            ? anchor - bounds.bottom
            : 0
        if (distance < closestDistance || (distance === closestDistance && page < closestPage)) {
          closestPage = page
          closestDistance = distance
        }
      })

      if (closestPage !== pageNumberRef.current) {
        pageNumberRef.current = closestPage
        setPageNumber(closestPage)
      }
    }

    const scheduleSync = () => {
      if (!animationFrame) animationFrame = window.requestAnimationFrame(syncActivePage)
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const page = Number((entry.target as HTMLElement).dataset.page)
          if (!page) continue
          if (entry.isIntersecting) visiblePages.set(page, entry.target as HTMLElement)
          else visiblePages.delete(page)
        }
        scheduleSync()
      },
      { root: container, threshold: [0, 0.01, 0.25, 0.5, 0.75, 1] },
    )
    pageHostRefs.current.forEach((element) => observer.observe(element))
    const resizeObserver = new ResizeObserver(scheduleSync)
    resizeObserver.observe(container)
    container.addEventListener("scroll", scheduleSync, { passive: true })
    scheduleSync()
    return () => {
      if (animationFrame) window.cancelAnimationFrame(animationFrame)
      container.removeEventListener("scroll", scheduleSync)
      resizeObserver.disconnect()
      observer.disconnect()
    }
  }, [document, scale, rotation])

  React.useEffect(() => {
    const list = thumbnailListRef.current
    const thumbnail = thumbnailHostRefs.current.get(pageNumber)
    if (!list || !thumbnail) return
    const listBounds = list.getBoundingClientRect()
    const thumbnailBounds = thumbnail.getBoundingClientRect()
    const horizontal = window.getComputedStyle(list).flexDirection === "row"
    if (horizontal) {
      const delta = thumbnailBounds.left < listBounds.left
        ? thumbnailBounds.left - listBounds.left - 8
        : thumbnailBounds.right > listBounds.right
          ? thumbnailBounds.right - listBounds.right + 8
          : 0
      if (delta) list.scrollBy({ left: delta, behavior: "auto" })
      return
    }
    const delta = thumbnailBounds.top < listBounds.top
      ? thumbnailBounds.top - listBounds.top - 8
      : thumbnailBounds.bottom > listBounds.bottom
        ? thumbnailBounds.bottom - listBounds.bottom + 8
        : 0
    if (delta) list.scrollBy({ top: delta, behavior: "auto" })
  }, [document, pageNumber])

  React.useEffect(() => {
    const timer = window.setTimeout(() => {
      const host = pageHostRefs.current.get(pageNumberRef.current)
      const container = viewportHostRef.current
      if (host && container) container.scrollTo({ top: Math.max(host.offsetTop - 24, 0) })
    }, 150)
    return () => window.clearTimeout(timer)
  }, [scale, rotation])

  const submitPageInput = React.useCallback(() => {
    if (!document) return
    const requested = Number.parseInt(pageInput, 10)
    if (!Number.isFinite(requested)) {
      setPageInput(String(pageNumberRef.current))
      return
    }
    const target = Math.min(Math.max(requested, 1), document.numPages)
    setPageInput(String(target))
    scrollToPage(target)
  }, [document, pageInput, scrollToPage])

  const mutateAnnotations = React.useCallback((updater: (current: PdfAnnotation[]) => PdfAnnotation[]) => {
    annotationSerialRef.current += 1
    setAnnotationSaveBlocked(false)
    setAnnotations(updater)
    setAnnotationDirty(true)
  }, [])

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
      for (let pageIndex = pageNumber; pageIndex <= document.numPages; pageIndex += 1) {
        const page = await document.getPage(pageIndex)
        const textContent = await page.getTextContent()
        const haystack = textContent.items.map((item) => ("str" in item ? item.str : "")).join(" ").toLowerCase()
        if (haystack.includes(normalized)) { scrollToPage(pageIndex); return }
      }
      toast.info(`未找到“${query.trim()}”`)
    } finally { setSearching(false) }
  }, [document, pageNumber, query, scrollToPage])

  const commitAnnotation = React.useCallback((annotation: PdfAnnotation) => {
    mutateAnnotations((items) => [...items, annotation])
  }, [mutateAnnotations])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-muted/40">
      <div className="shrink-0 overflow-hidden border-b border-border bg-background">
        <div className="flex min-h-12 flex-wrap items-center gap-1.5 px-3 py-2">
          <div className="flex min-w-0 items-center gap-1.5">
            <Input.Search value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void findText() }} placeholder="在 PDF 中查找" className="h-8 w-36 text-xs sm:w-48" />
            <Button variant="ghost" size="sm" onClick={() => void findText()} disabled={searching || !query.trim()}>
              {searching ? <IconLoader2 data-icon="inline-start" className="animate-spin" /> : <IconSearch data-icon="inline-start" />}查找
            </Button>
          </div>
          <div className="flex shrink-0 items-center gap-1 border-l border-border pl-1.5">
            <Button variant="ghost" size="icon-sm" disabled={pageNumber <= 1} onClick={() => scrollToPage(pageNumber - 1)} aria-label="上一页" title="上一页"><IconChevronLeft /></Button>
            <form onSubmit={(event) => { event.preventDefault(); submitPageInput() }} className="flex items-center gap-1">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="off"
                spellCheck={false}
                value={pageInput}
                onChange={(event) => setPageInput(event.target.value.replace(/\D/g, ""))}
                onFocus={(event) => { setPageInputFocused(true); event.currentTarget.select() }}
                onBlur={() => { setPageInputFocused(false); submitPageInput() }}
                onKeyDown={(event) => { if (event.key === "Escape") { setPageInput(String(pageNumberRef.current)); event.currentTarget.blur() } }}
                className="h-8 w-14 px-1 text-center text-xs tabular-nums"
                aria-label="跳转到指定页"
              />
              <span className="text-xs tabular-nums text-muted-foreground">/ {document?.numPages ?? "–"}</span>
            </form>
            <Button variant="ghost" size="icon-sm" disabled={!document || pageNumber >= document.numPages} onClick={() => scrollToPage(pageNumber + 1)} aria-label="下一页" title="下一页"><IconChevronRight /></Button>
          </div>
          <div className="flex shrink-0 items-center gap-1 border-l border-border pl-1.5">
            <Button variant="ghost" size="icon-sm" onClick={() => setScale((value) => Math.max(value - 0.15, 0.25))} aria-label="缩小" title="缩小"><IconZoomOut /></Button>
            <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
            <Button variant="ghost" size="icon-sm" onClick={() => setScale((value) => Math.min(value + 0.15, 4))} aria-label="放大" title="放大"><IconZoomIn /></Button>
            <Button variant="ghost" size="sm" onClick={() => void fitWidth()}>适合宽度</Button>
            <Button variant="ghost" size="icon-sm" onClick={() => setRotation((value) => (value + 90) % 360)} aria-label="旋转" title="顺时针旋转"><IconRotateClockwise /></Button>
          </div>
          {canAnnotate ? (
            <div className="flex min-w-0 flex-wrap items-center gap-1 border-l border-border pl-1.5">
              <ToggleGroup type="single" value={tool ?? ""} onValueChange={(value) => setTool((value || null) as PdfAnnotationKind | null)} variant="outline" size="sm" spacing={0} aria-label="PDF 标注工具">
                <ToggleGroupItem value="highlight" aria-label="高亮" title="高亮"><IconHighlight /></ToggleGroupItem>
                <ToggleGroupItem value="pen" aria-label="画笔" title="画笔"><IconPencil /></ToggleGroupItem>
                <ToggleGroupItem value="text" aria-label="文字" title="文字"><IconLetterT /></ToggleGroupItem>
                <ToggleGroupItem value="rectangle" aria-label="矩形" title="矩形"><IconSquare /></ToggleGroupItem>
              </ToggleGroup>
              <label className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-input" title="标注颜色">
                <span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="sr-only" aria-label="标注颜色" />
              </label>
              {tool === "text" ? <Input value={annotationText} onChange={(event) => setAnnotationText(event.target.value)} placeholder="输入文字后点击页面" className="h-8 w-44 text-xs" /> : null}
              <Button variant="ghost" size="icon-sm" disabled={!annotations.length} onClick={() => mutateAnnotations((items) => items.slice(0, -1))} aria-label="撤销上一条标注" title="撤销标注"><IconArrowBackUp /></Button>
              {annotationSaveBlocked ? <Button variant="ghost" size="sm" onClick={() => setAnnotationSaveBlocked(false)}><IconRefresh data-icon="inline-start" />重试保存</Button> : <span className="px-1 text-[11px] text-muted-foreground">{annotationSaving ? "正在保存标注…" : annotationDirty ? "标注待保存" : "私人标注"}</span>}
            </div>
          ) : null}
        </div>
      </div>
      {annotationStale ? <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-800 dark:text-amber-200">PDF 已更新；当前显示旧版本标注，下一次修改会迁移到新版。</div> : null}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {document ? (
          <aside ref={thumbnailListRef} className="custom-scrollbar flex h-32 shrink-0 gap-2 overflow-x-auto border-b border-border bg-background p-2 md:h-auto md:w-32 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-b-0 md:border-r" aria-label="PDF 页面目录">
            {Array.from({ length: document.numPages }, (_, index) => index + 1).map((page) => <PdfThumbnail key={page} document={document} page={page} active={page === pageNumber} onSelect={() => scrollToPage(page)} registerHost={registerThumbnailHost} scrollRoot={thumbnailListRef} />)}
          </aside>
        ) : null}
        <div ref={viewportHostRef} className="custom-scrollbar relative min-h-0 flex-1 overflow-auto p-6 [scrollbar-gutter:stable]" aria-label="PDF 连续页面">
          {loading ? <PreviewSkeleton kind="pdf" className="pointer-events-none absolute inset-0 z-10" /> : null}
          {error && !document ? (
            <div className="flex h-full items-center justify-center px-6 text-center text-sm text-destructive">{error}</div>
          ) : document ? (
            <div className="flex flex-col gap-6">
              {Array.from({ length: document.numPages }, (_, index) => index + 1).map((page) => (
                <PdfPageView
                  key={page}
                  document={document}
                  page={page}
                  scale={scale}
                  rotation={rotation}
                  annotations={annotations}
                  tool={canAnnotate ? tool : null}
                  color={color}
                  text={annotationText}
                  onCommit={commitAnnotation}
                  registerHost={registerPageHost}
                  scrollRoot={viewportHostRef}
                  fallbackSize={defaultPageSize}
                />
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
