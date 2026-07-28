import * as React from "react"
import {
  IconPencil,
  IconZoomIn,
  IconZoomOut,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { getCurrentProfile, updateCurrentProfile, uploadCurrentAvatar } from "@/api/user"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { useAppState } from "@/state/app"

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

async function canvasToFile(canvas: HTMLCanvasElement, filename: string) {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/png")
  })

  if (!blob) {
    throw new Error("无法生成头像文件。")
  }

  return new File([blob], filename, { type: "image/png" })
}

export function ProfileSettingsPage() {
  const { authSession, profile, updateProfile, updateSecurity } = useAppState()
  const token = authSession?.tokens.accessToken ?? null

  const [email, setEmail] = React.useState(profile.email)
  const [username, setUsername] = React.useState(profile.username)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false)

  const [cropOpen, setCropOpen] = React.useState(false)
  const [rawImage, setRawImage] = React.useState("")
  const [zoom, setZoom] = React.useState(1)
  const [offset, setOffset] = React.useState<CropOffset>({ x: 0, y: 0 })
  const [imageSize, setImageSize] = React.useState<CropImageSize | null>(null)
  const [isImageReady, setIsImageReady] = React.useState(false)

  const imageRef = React.useRef<HTMLImageElement | null>(null)
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dragStateRef = React.useRef<{
    pointerId: number
    startX: number
    startY: number
    originX: number
    originY: number
  } | null>(null)

  React.useEffect(() => {
    setEmail(profile.email)
    setUsername(profile.username)
  }, [profile.email, profile.username])

  const loadProfile = React.useCallback(async () => {
    if (!token) {
      return
    }

    try {
      const payload = await getCurrentProfile(token)
      updateProfile(payload.profile)
      updateSecurity({ passwordUpdatedAt: payload.passwordUpdatedAt })
    } catch (error) {
      console.error("加载用户资料失败:", error)
      toast.error("加载资料失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    }
  }, [token, updateProfile, updateSecurity])

  React.useEffect(() => {
    void loadProfile()
  }, [loadProfile])

  React.useEffect(() => {
    if (!rawImage) {
      imageRef.current = null
      setImageSize(null)
      setIsImageReady(false)
      return
    }

    setIsImageReady(false)
    const image = new window.Image()
    image.onload = () => {
      imageRef.current = image
      setImageSize({
        width: image.naturalWidth,
        height: image.naturalHeight,
      })
      setIsImageReady(true)
    }
    image.src = rawImage

    return () => {
      image.onload = null
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

  const isDirty = React.useMemo(() => {
    return (
      email.trim().toLowerCase() !== profile.email.trim().toLowerCase() ||
      username.trim() !== profile.username.trim()
    )
  }, [email, profile.email, profile.username, username])

  const handleReset = () => {
    setEmail(profile.email)
    setUsername(profile.username)
  }

  const handleSave = async () => {
    if (!token) {
      return
    }

    const normalizedEmail = email.trim().toLowerCase()
    const normalizedUsername = username.trim()

    if (!normalizedEmail || !normalizedUsername) {
      toast.error("保存失败", {
        description: "邮箱和昵称不能为空。",
      })
      return
    }

    setIsSaving(true)
    try {
      const payload = await updateCurrentProfile(token, {
        email: normalizedEmail,
        username: normalizedUsername,
      })
      updateProfile(payload.profile)
      updateSecurity({ passwordUpdatedAt: payload.passwordUpdatedAt })
      toast.success("个人资料已保存")
    } catch (error) {
      console.error("更新用户资料失败:", error)
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) {
      return
    }

    const reader = new FileReader()
    reader.onload = (readerEvent) => {
      const result = readerEvent.target?.result as string
      if (!result) {
        return
      }

      setRawImage(result)
      setZoom(1)
      setOffset({ x: 0, y: 0 })
      setCropOpen(true)
    }
    reader.readAsDataURL(file)
    event.target.value = ""
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

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

    setOffset(
      clampCropOffset(
        {
          x: dragState.startX + event.clientX - dragState.originX,
          y: dragState.startY + event.clientY - dragState.originY,
        },
        imageSize,
        zoom
      )
    )
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
      const context = canvas.getContext("2d")
      if (!context) {
        return false
      }

      canvas.width = size
      canvas.height = size
      context.clearRect(0, 0, size, size)
      context.save()
      context.beginPath()
      context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
      context.closePath()
      context.clip()
      context.drawImage(
        image,
        metrics.left + offset.x * ratio,
        metrics.top + offset.y * ratio,
        metrics.width,
        metrics.height
      )
      context.restore()

      return true
    },
    [imageSize, offset.x, offset.y, zoom]
  )

  const handleConfirmCrop = async () => {
    if (!token) {
      return
    }

    const canvas = document.createElement("canvas")
    if (!renderPreviewToCanvas(canvas, 256)) {
      return
    }

    setIsUploadingAvatar(true)
    try {
      const file = await canvasToFile(canvas, `${profile.uid || "avatar"}.png`)
      const payload = await uploadCurrentAvatar(token, file)
      updateProfile(payload.profile)
      updateSecurity({ passwordUpdatedAt: payload.passwordUpdatedAt })
      setCropOpen(false)
      toast.success("头像已更新")
    } catch (error) {
      console.error("上传头像失败:", error)
      toast.error("头像上传失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  return (
    <div className="space-y-10">
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />

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
                拖动图片调整位置，滑动缩放头像区域。
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCropOpen(false)} disabled={isUploadingAvatar}>
              取消
            </Button>
            <Button onClick={handleConfirmCrop} disabled={!isImageReady || isUploadingAvatar}>
              {isUploadingAvatar ? "上传中..." : "确认"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="flex flex-col-reverse gap-y-8 lg:grid lg:max-w-[920px] lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start lg:gap-x-8">
        <div className="space-y-8">
          <FieldBlock label="电子邮箱" hint="用于登录、通知以及安全验证。">
            <Input
              value={email}
              className="w-full"
              type="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </FieldBlock>

          <FieldBlock label="昵称" hint="用于公开展示的名字，可以使用真实姓名或昵称。">
            <Input
              className="w-full"
              value={username}
              maxLength={64}
              onChange={(event) => setUsername(event.target.value)}
            />
          </FieldBlock>

          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            <MetaItem label="UID" value={profile.uid} />
            <MetaItem label="注册时间" value={profile.registeredAt} />
            <MetaItem label="用户组" value={profile.group} />
            <MetaItem label="个人主页" value={profile.homepage} />
          </div>
        </div>

        <div className="flex flex-col items-center space-y-3 lg:items-start lg:justify-self-start">
          <div className="hidden text-sm font-medium lg:block">头像</div>
          <button
            type="button"
            onClick={triggerUpload}
            className="block h-[180px] w-[180px] overflow-hidden rounded-xl transition-opacity hover:opacity-90"
          >
            <Avatar className="h-full w-full rounded-xl after:hidden">
              <AvatarImage src={profile.avatar} alt={profile.username} className="object-cover" />
              <AvatarFallback className="rounded-xl text-3xl">
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

      {isDirty ? (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-2xl bg-background/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md ring-1 ring-border/50 animate-in slide-in-from-bottom-8 fade-in dark:bg-background/80 md:left-8">
          <div className="hidden px-2 text-sm font-medium text-muted-foreground sm:block">
            您有未保存的更改
          </div>
          <Button variant="outline" size="sm" className="h-9 px-5" onClick={handleReset} disabled={isSaving}>
            重置
          </Button>
          <Button size="sm" className="h-9 px-6" onClick={handleSave} disabled={isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </div>
      ) : null}
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
      <div className="break-all text-sm text-foreground">{value}</div>
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
