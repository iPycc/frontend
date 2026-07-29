import * as React from "react"
import OpenSeadragon from "openseadragon"
import {
  IconArrowsMaximize,
  IconRotate,
  IconRotateClockwise,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react"
import {
  TransformComponent,
  TransformWrapper,
  type ReactZoomPanPinchContentRef,
} from "react-zoom-pan-pinch"

import type { PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"
import { previewSourceUrls } from "@/lib/preview-assets"
import { cn } from "@/lib/utils"
import { PreviewSkeleton } from "./PreviewSkeleton"

type ImagePreviewProps = {
  manifest: PreviewManifest
}

const controlClass = "h-9 w-9 text-foreground hover:bg-accent"

export function ImagePreview({ manifest }: ImagePreviewProps) {
  if (manifest.assets.dzi) {
    return <TiledImagePreview manifest={manifest} />
  }
  return <StandardImagePreview manifest={manifest} />
}

function StandardImagePreview({ manifest }: ImagePreviewProps) {
  const transformRef = React.useRef<ReactZoomPanPinchContentRef>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)
  const [rotation, setRotation] = React.useState(0)
  const [scale, setScale] = React.useState(1)
  const [loaded, setLoaded] = React.useState(false)
  const [failed, setFailed] = React.useState(false)
  const sources = previewSourceUrls(manifest)
  const sourceSignature = sources.join("\n")
  const [sourceIndex, setSourceIndex] = React.useState(0)
  // The original source already supports range/cache and preserves the exact
  // dimensions. Generated screen variants can still be warming up, which left
  // the low-resolution placeholder visible indefinitely.
  const source = sources[sourceIndex] ?? manifest.assets.source.url
  const imageWidth = typeof manifest.metadata.width === "number" && manifest.metadata.width > 0
    ? manifest.metadata.width
    : undefined
  const imageHeight = typeof manifest.metadata.height === "number" && manifest.metadata.height > 0
    ? manifest.metadata.height
    : undefined

  const fit = React.useCallback(() => {
    transformRef.current?.resetTransform(180)
    setScale(1)
  }, [])

  const actualSize = React.useCallback(() => {
    const image = imageRef.current
    const controls = transformRef.current
    if (!image || !controls || image.clientWidth <= 0) return
    const targetScale = Math.min(Math.max(image.naturalWidth / image.clientWidth, 1), 8)
    controls.centerView(targetScale, 180)
    setScale(targetScale)
  }, [])

  React.useEffect(() => {
    setRotation(0)
    setScale(1)
    setLoaded(false)
    setFailed(false)
    setSourceIndex(0)
  }, [manifest.node_id, manifest.version, sourceSignature])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, .monaco-editor")) return
      if (event.key === "+" || event.key === "=") transformRef.current?.zoomIn(0.25, 120)
      if (event.key === "-") transformRef.current?.zoomOut(0.25, 120)
      if (event.key === "0") fit()
      if (event.key === "1") actualSize()
      if (event.key.toLowerCase() === "r") setRotation((value) => value + 90)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [actualSize, fit])

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col bg-[#111214]">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {!loaded && !failed ? (
          <PreviewSkeleton kind="image" className="pointer-events-none absolute inset-0 z-10" />
        ) : null}
        {failed ? (
          <div className="flex h-full items-center justify-center text-sm text-white/65">图片加载失败，请重试或下载原文件</div>
        ) : (
          <TransformWrapper
            ref={transformRef}
            minScale={0.5}
            maxScale={8}
            centerOnInit
            centerZoomedOut
            limitToBounds
            smooth={false}
            wheel={{ step: 0.1 }}
            doubleClick={{ mode: "toggle", step: 1.75 }}
            onTransform={(_, state) => setScale(state.scale)}
          >
            <TransformComponent
              wrapperClass="!h-full !w-full"
              contentClass="!h-full !w-full flex items-center justify-center"
            >
              <img
                ref={imageRef}
                src={source}
                alt={manifest.name}
                width={imageWidth}
                height={imageHeight}
                draggable={false}
                decoding="async"
                fetchPriority="high"
                onLoad={(event) => {
                  if (event.currentTarget.naturalWidth > 0) setLoaded(true)
                }}
                onError={() => {
                  if (sourceIndex + 1 < sources.length) {
                    setLoaded(false)
                    setSourceIndex((value) => value + 1)
                    return
                  }
                  setFailed(true)
                }}
                className={cn(
                  "max-h-full max-w-full select-none object-contain transition-[opacity,transform] duration-150",
                  loaded ? "opacity-100" : "opacity-0"
                )}
                style={{ transform: `rotate(${rotation}deg)` }}
              />
            </TransformComponent>
          </TransformWrapper>
        )}
      </div>

      <ImageToolbar
        scale={scale}
        onZoomOut={() => transformRef.current?.zoomOut(0.25, 120)}
        onZoomIn={() => transformRef.current?.zoomIn(0.25, 120)}
        onFit={fit}
        onActual={actualSize}
        rotation={rotation}
        onRotateLeft={() => setRotation((value) => value - 90)}
        onRotateRight={() => setRotation((value) => value + 90)}
      />
    </div>
  )
}

function TiledImagePreview({ manifest }: ImagePreviewProps) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const viewerRef = React.useRef<OpenSeadragon.Viewer | null>(null)
  const [scale, setScale] = React.useState(1)
  const [rotation, setRotation] = React.useState(0)

  React.useEffect(() => {
    if (!hostRef.current || !manifest.assets.dzi) return
    const viewer = OpenSeadragon({
      element: hostRef.current,
      tileSources: manifest.assets.dzi.url,
      showNavigationControl: false,
      showNavigator: true,
      navigatorPosition: "BOTTOM_RIGHT",
      navigatorSizeRatio: 0.13,
      visibilityRatio: 1,
      minZoomImageRatio: 0.8,
      maxZoomPixelRatio: 8,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: true, scrollToZoom: true },
      ajaxWithCredentials: true,
    })
    viewerRef.current = viewer
    const updateScale = () => setScale(viewer.viewport.getZoom(true))
    viewer.addHandler("zoom", updateScale)
    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [manifest.assets.dzi, manifest.node_id, manifest.version])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-[#111214]">
      <div ref={hostRef} className="min-h-0 flex-1" aria-label={`${manifest.name} 超大图查看器`} />
      <ImageToolbar
        scale={scale}
        onZoomOut={() => viewerRef.current?.viewport.zoomBy(0.8)}
        onZoomIn={() => viewerRef.current?.viewport.zoomBy(1.25)}
        onFit={() => viewerRef.current?.viewport.goHome(true)}
        onActual={() => viewerRef.current?.viewport.zoomTo(1, undefined, true)}
        rotation={rotation}
        onRotateLeft={() => {
          const viewport = viewerRef.current?.viewport
          if (viewport) {
            const next = rotation - 90
            viewport.setRotation(next)
            setRotation(next)
          }
        }}
        onRotateRight={() => {
          const viewport = viewerRef.current?.viewport
          if (viewport) {
            const next = rotation + 90
            viewport.setRotation(next)
            setRotation(next)
          }
        }}
      />
    </div>
  )
}

function ImageToolbar({
  scale,
  onZoomOut,
  onZoomIn,
  onFit,
  onActual,
  rotation,
  onRotateLeft,
  onRotateRight,
}: {
  scale: number
  onZoomOut: () => void
  onZoomIn: () => void
  onFit: () => void
  onActual: () => void
  rotation: number
  onRotateLeft: () => void
  onRotateRight: () => void
}) {
  return (
    <div className="flex h-12 shrink-0 items-center justify-center gap-1 border-t border-border bg-background px-3">
      <Button variant="ghost" size="icon" className={controlClass} onClick={onZoomOut} title="缩小 (-)" aria-label="缩小">
        <IconZoomOut size={18} />
      </Button>
      <button type="button" className="min-w-16 px-2 text-center text-xs tabular-nums text-muted-foreground" onClick={onFit}>
        {Math.round(scale * 100)}%
      </button>
      <Button variant="ghost" size="icon" className={controlClass} onClick={onZoomIn} title="放大 (+)" aria-label="放大">
        <IconZoomIn size={18} />
      </Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button variant="ghost" size="icon" className={controlClass} onClick={onFit} title="适应窗口 (0)" aria-label="适应窗口">
        <IconArrowsMaximize size={18} />
      </Button>
      <Button variant="ghost" size="sm" className="h-9 px-2.5 text-xs" onClick={onActual} title="原始尺寸 (1)">
        1:1
      </Button>
      <span className="mx-1 h-5 w-px bg-border" />
      <Button variant="ghost" size="icon" className={controlClass} onClick={onRotateLeft} title="逆时针旋转" aria-label="逆时针旋转">
        <IconRotate size={18} />
      </Button>
      <span className="min-w-12 text-center text-xs tabular-nums text-muted-foreground" title="当前旋转角度">
        {rotation}°
      </span>
      <Button variant="ghost" size="icon" className={controlClass} onClick={onRotateRight} title="顺时针旋转 (R)" aria-label="顺时针旋转">
        <IconRotateClockwise size={18} />
      </Button>
    </div>
  )
}
