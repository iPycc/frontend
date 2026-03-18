import * as React from "react"
import {
  IconChevronDown,
  IconPencil,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useAppState } from "@/lib/app-state"

type CropImageSize = {
  width: number
  height: number
}

type CropOffset = {
  x: number
  y: number
}

const PREVIEW_SIZE = 220

function getCropMetrics(imageSize: CropImageSize, viewportSize: number, zoom: number) {
  const baseScale = Math.max(
    viewportSize / imageSize.width,
    viewportSize / imageSize.height
  )
  const width = imageSize.width * baseScale * zoom
  const height = imageSize.height * baseScale * zoom

  return {
    width,
    height,
    left: (viewportSize - width) / 2,
    top: (viewportSize - height) / 2,
    maxOffsetX: Math.max(0, (width - viewportSize) / 2),
    maxOffsetY: Math.max(0, (height - viewportSize) / 2),
  }
}

function clampCropOffset(offset: CropOffset, imageSize: CropImageSize | null, zoom: number) {
  if (!imageSize) {
    return { x: 0, y: 0 }
  }

  const metrics = getCropMetrics(imageSize, PREVIEW_SIZE, zoom)

  return {
    x: Math.min(metrics.maxOffsetX, Math.max(-metrics.maxOffsetX, offset.x)),
    y: Math.min(metrics.maxOffsetY, Math.max(-metrics.maxOffsetY, offset.y)),
  }
}

function getPreviewImageStyle(
  imageSize: CropImageSize,
  viewportSize: number,
  zoom: number,
  offset: CropOffset
) {
  const metrics = getCropMetrics(imageSize, viewportSize, zoom)
  const ratio = viewportSize / PREVIEW_SIZE

  return {
    width: metrics.width,
    height: metrics.height,
    left: metrics.left + offset.x * ratio,
    top: metrics.top + offset.y * ratio,
  }
}

export function ProfileSettingsPage() {
  const { profile, updateProfile } = useAppState()
  const [username, setUsername] = React.useState(profile.username)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const [cropOpen, setCropOpen] = React.useState(false)
  const [rawImage, setRawImage] = React.useState<string>("")
  const [zoom, setZoom] = React.useState(1)
  const [offset, setOffset] = React.useState<CropOffset>({ x: 0, y: 0 })
  const [imageSize, setImageSize] = React.useState<CropImageSize | null>(null)
  const [isImageReady, setIsImageReady] = React.useState(false)
  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const dragStateRef = React.useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  React.useEffect(() => {
    setUsername(profile.username)
  }, [profile.username])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        setRawImage(result)
        setZoom(1)
        setOffset({ x: 0, y: 0 })
        setCropOpen(true)
      }
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  React.useEffect(() => {
    if (!rawImage) {
      imageRef.current = null
      setImageSize(null)
      setIsImageReady(false)
      return
    }

    setIsImageReady(false)
    const img = new window.Image()

    img.onload = () => {
      imageRef.current = img
      setImageSize({
        width: img.naturalWidth,
        height: img.naturalHeight,
      })
      setIsImageReady(true)
    }

    img.src = rawImage

    return () => {
      img.onload = null
    }
  }, [rawImage])

  React.useEffect(() => {
    setOffset((current) => {
      const next = clampCropOffset(current, imageSize, zoom)

      if (next.x === current.x && next.y === current.y) {
        return current
      }

      return next
    })
  }, [imageSize, zoom])

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!isImageReady) {
      return
    }

    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: offset.x,
      startY: offset.y,
      originX: event.clientX,
      originY: event.clientY,
    }

    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const dragState = dragStateRef.current

    if (!dragState || dragState.pointerId !== event.pointerId) {
      return
    }

    const nextOffset = clampCropOffset(
      {
        x: dragState.startX + event.clientX - dragState.originX,
        y: dragState.startY + event.clientY - dragState.originY,
      },
      imageSize,
      zoom
    )

    setOffset(nextOffset)
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const renderPreviewToCanvas = React.useCallback(
    (canvas: HTMLCanvasElement, size: number) => {
      const image = imageRef.current

      if (!image || !imageSize) {
        return false
      }

      const metrics = getCropMetrics(imageSize, size, zoom)
      const ratio = size / PREVIEW_SIZE
      const ctx = canvas.getContext("2d")

      if (!ctx) {
        return false
      }

      canvas.width = size
      canvas.height = size
      ctx.clearRect(0, 0, size, size)
      ctx.save()
      ctx.beginPath()
      ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(
        image,
        metrics.left + offset.x * ratio,
        metrics.top + offset.y * ratio,
        metrics.width,
        metrics.height
      )
      ctx.restore()

      return true
    },
    [imageSize, offset.x, offset.y, zoom]
  )

  const handleConfirmCrop = () => {
    const canvas = document.createElement("canvas")

    if (!renderPreviewToCanvas(canvas, 256)) {
      return
    }

    updateProfile({ avatar: canvas.toDataURL("image/png") })
    setCropOpen(false)
  }

  const commitUsername = () => {
    const nextValue = username.trim()
    if (nextValue && nextValue !== profile.username) {
      updateProfile({ username: nextValue })
    }
  }

  return (
    <div className="space-y-10">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

      {/* Avatar Crop Dialog */}
      <Dialog
        open={cropOpen}
        onOpenChange={(open) => {
          dragStateRef.current = null
          setCropOpen(open)
        }}
      >
        <DialogContent className="sm:max-w-[520px]">
          <DialogHeader>
            <DialogTitle>裁剪头像</DialogTitle>
          </DialogHeader>

          <div className="space-y-5">
            <div className="flex justify-center">
              <div
                className="relative overflow-hidden rounded-full border border-primary/20 bg-secondary/40 touch-none select-none"
                style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                {rawImage && imageSize ? (
                  <img
                    src={rawImage}
                    alt="头像预览"
                    draggable={false}
                    className="pointer-events-none absolute max-w-none select-none"
                    style={getPreviewImageStyle(imageSize, PREVIEW_SIZE, zoom, offset)}
                  />
                ) : null}
                <div className="pointer-events-none absolute inset-0 rounded-full ring-1 ring-primary/30" />
                <div className="pointer-events-none absolute inset-[12%] rounded-full border border-dashed border-primary/20" />
                {!isImageReady ? (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
                    正在准备裁剪区域...
                  </div>
                ) : null}
              </div>
            </div>

            <div className="flex items-center gap-3 px-2">
              <IconZoomOut size={16} className="shrink-0 text-muted-foreground" />
              <Slider
                min={1}
                max={3}
                step={0.05}
                value={[zoom]}
                onValueChange={([value]) => {
                  if (typeof value === "number") {
                    setZoom(value)
                  }
                }}
                className="flex-1"
              />
              <IconZoomIn size={16} className="shrink-0 text-muted-foreground" />
            </div>

            <div className="flex items-end gap-5 px-2">
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">大图标</div>
                <CropPreview
                  src={rawImage}
                  imageSize={imageSize}
                  zoom={zoom}
                  offset={offset}
                  size={64}
                />
              </div>
              <div className="space-y-2">
                <div className="text-xs text-muted-foreground">小图标</div>
                <CropPreview
                  src={rawImage}
                  imageSize={imageSize}
                  zoom={zoom}
                  offset={offset}
                  size={36}
                />
              </div>
              <p className="flex-1 pb-1 text-xs text-muted-foreground">
                拖动图片调整位置，滑动缩放大小
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCropOpen(false)}>
              取消
            </Button>
            <Button onClick={handleConfirmCrop} disabled={!isImageReady}>
              确认
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col-reverse gap-y-8 lg:grid lg:max-w-[920px] lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start lg:gap-x-8">
        <div className="space-y-8">
          <FieldBlock label="电子邮箱">
            <Input value={profile.email} className="w-full" readOnly />
          </FieldBlock>

          <FieldBlock label="昵称" hint="用于公开展示的名字，可使用真实姓名或昵称">
            <Input
              className="w-full"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onBlur={commitUsername}
            />
          </FieldBlock>

          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            <MetaItem label="UID" value={profile.uid} />
            <MetaItem label="注册时间" value={profile.registeredAt} />
            <MetaItem label="用户组" value={profile.group} />
            <MetaItem
              label="个人主页"
              value={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-left text-foreground transition-colors hover:text-primary outline-none"
                    >
                      <span>仅展示无密码分享链接</span>
                      <IconChevronDown size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>仅展示无密码分享链接</DropdownMenuItem>
                    <DropdownMenuItem>展示所有链接</DropdownMenuItem>
                    <DropdownMenuItem>不展示</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          </div>
        </div>

        <div className="flex flex-col items-center space-y-3 lg:items-start lg:justify-self-start">
          <div className="hidden text-sm font-medium lg:block">头像</div>
          <button
            type="button"
            onClick={triggerUpload}
            className="block h-[180px] w-[180px] overflow-hidden rounded-[15px] transition-opacity hover:opacity-90"
          >
            <Avatar className="h-full w-full rounded-[15px] after:hidden">
              <AvatarImage src={profile.avatar} alt={profile.username} className="object-cover" />
              <AvatarFallback className="rounded-[15px] text-3xl">
                {profile.username.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <Button variant="outline" size="sm" onClick={triggerUpload}>
            <IconPencil size={15} />
            编辑
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
      {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

function MetaItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  )
}

function CropPreview({
  src,
  imageSize,
  zoom,
  offset,
  size,
}: {
  src: string
  imageSize: CropImageSize | null
  zoom: number
  offset: CropOffset
  size: number
}) {
  return (
    <div
      className="relative overflow-hidden rounded-full border border-border/70 bg-secondary/40"
      style={{ width: size, height: size }}
    >
      {src && imageSize ? (
        <img
          src={src}
          alt=""
          draggable={false}
          className="pointer-events-none absolute max-w-none select-none"
          style={getPreviewImageStyle(imageSize, size, zoom, offset)}
        />
      ) : null}
    </div>
  )
}
