import * as React from "react"
import { createPortal } from "react-dom"
import OpenSeadragon from "openseadragon"
import {
  IconArrowsMaximize,
  IconRotate,
  IconRotateClockwise,
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
  toolbarTarget?: HTMLElement | null
}

const controlClass = "size-8 sm:size-9 text-foreground hover:bg-accent"

export function ImagePreview({ manifest, toolbarTarget }: ImagePreviewProps) {
  return manifest.assets.dzi
    ? <TiledImagePreview manifest={manifest} toolbarTarget={toolbarTarget} />
    : <StandardImagePreview manifest={manifest} toolbarTarget={toolbarTarget} />
}

function StandardImagePreview({ manifest, toolbarTarget }: ImagePreviewProps) {
  const transformRef = React.useRef<ReactZoomPanPinchContentRef>(null)
  const imageRef = React.useRef<HTMLImageElement>(null)
  const [rotation, setRotation] = React.useState(0)
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
  }, [])

  React.useEffect(() => {
    setRotation(0)
    setLoaded(false)
    setFailed(false)
    setSourceIndex(0)
  }, [manifest.node_id, manifest.version, sourceSignature])

  React.useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target?.closest("input, textarea, .monaco-editor")) return
      if (event.key === "0") fit()
      if (event.key.toLowerCase() === "r") setRotation((value) => value + 90)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [fit])

  return (
    <div className="relative flex h-full w-full min-h-0 flex-col bg-background">
      <ImageToolbar
        target={toolbarTarget}
        onFit={fit}
        rotation={rotation}
        onRotateLeft={() => setRotation((value) => value - 90)}
        onRotateRight={() => setRotation((value) => value + 90)}
      />
      <div className="relative min-h-0 flex-1 overflow-hidden">
        {!loaded && !failed ? (
          <PreviewSkeleton kind="image" className="pointer-events-none absolute inset-0 z-10" />
        ) : null}
        {failed ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">图片加载失败，请重试或下载原文件</div>
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
            doubleClick={{ disabled: true }}
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


    </div>
  )
}

function TiledImagePreview({ manifest, toolbarTarget }: ImagePreviewProps) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const viewerRef = React.useRef<OpenSeadragon.Viewer | null>(null)
  const [rotation, setRotation] = React.useState(0)

  React.useEffect(() => {
    if (!hostRef.current || !manifest.assets.dzi) return
    const viewer = OpenSeadragon({
      element: hostRef.current,
      tileSources: manifest.assets.dzi.url,
      showNavigationControl: false,
      showNavigator: false,
      visibilityRatio: 1,
      minZoomImageRatio: 0.8,
      maxZoomPixelRatio: 8,
      gestureSettingsMouse: { clickToZoom: false, dblClickToZoom: false, scrollToZoom: true },
      ajaxWithCredentials: true,
    })
    viewerRef.current = viewer
    return () => {
      viewer.destroy()
      viewerRef.current = null
    }
  }, [manifest.assets.dzi, manifest.node_id, manifest.version])

  return (
    <div className="flex h-full min-h-0 w-full flex-col bg-background">
      <ImageToolbar
        target={toolbarTarget}
        onFit={() => viewerRef.current?.viewport.goHome(true)}
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
      <div ref={hostRef} className="min-h-0 flex-1" aria-label={`${manifest.name} 超大图查看器`} />

    </div>
  )
}

function ImageToolbar({
  target,
  onFit,
  rotation,
  onRotateLeft,
  onRotateRight,
}: {
  target?: HTMLElement | null
  onFit: () => void
  rotation: number
  onRotateLeft: () => void
  onRotateRight: () => void
}) {
  const toolbar = (
    <div aria-label="图片工具栏" className={cn("flex shrink-0 items-center gap-0 bg-background sm:gap-1", target ? "h-10 w-max" : "min-h-12 flex-wrap justify-center border-b border-border px-2 py-1 sm:justify-start sm:px-3")}>
      <Button variant="ghost" size="icon" className={controlClass} onClick={onFit} title="适应窗口 (0)" aria-label="适应窗口">
        <IconArrowsMaximize size={18} />
      </Button>
      <span className="mx-0.5 h-5 w-px sm:mx-1 bg-border" />
      <Button variant="ghost" size="icon" className={controlClass} onClick={onRotateLeft} title="逆时针旋转" aria-label="逆时针旋转">
        <IconRotate size={18} />
      </Button>
      <span className="min-w-8 sm:min-w-12 text-center text-xs tabular-nums text-muted-foreground" title="当前旋转角度">
        {rotation}°
      </span>
      <Button variant="ghost" size="icon" className={controlClass} onClick={onRotateRight} title="顺时针旋转 (R)" aria-label="顺时针旋转">
        <IconRotateClockwise size={18} />
      </Button>
    </div>
  )
  return target ? createPortal(toolbar, target) : toolbar
}
