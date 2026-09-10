import * as React from "react"
import {
  Canvas,
  FabricImage,
  IText,
  Line,
  PencilBrush,
  Point,
  Rect,
  Triangle,
  type FabricObject,
} from "fabric"
import {
  IconArrowBackUp,
  IconArrowRight,
  IconCrop,
  IconDeviceFloppy,
  IconFlipHorizontal,
  IconLetterT,
  IconLoader2,
  IconPencil,
  IconRotateClockwise,
  IconSquare,
  IconX,
} from "@tabler/icons-react"
import { toast } from "sonner"

import { savePreviewImageAs, type PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

type ImageTool = "select" | "pen" | "rectangle" | "arrow" | "text" | "crop"

export function ImageEditor({ manifest, onClose }: { manifest: PreviewManifest; onClose: () => void }) {
  const hostRef = React.useRef<HTMLDivElement>(null)
  const canvasElementRef = React.useRef<HTMLCanvasElement>(null)
  const canvasRef = React.useRef<Canvas | null>(null)
  const sourceRef = React.useRef<FabricImage | null>(null)
  const cropRef = React.useRef<Rect | null>(null)
  const temporaryRef = React.useRef<FabricObject | null>(null)
  const startRef = React.useRef<Point | null>(null)
  const toolRef = React.useRef<ImageTool>("select")
  const colorRef = React.useRef("#ffffff")
  const [tool, setTool] = React.useState<ImageTool>("select")
  const [color, setColor] = React.useState("#ffffff")
  const [loading, setLoading] = React.useState(true)
  const [saving, setSaving] = React.useState(false)
  const [cropReady, setCropReady] = React.useState(false)
  const stem = manifest.name.replace(/\.[^.]+$/, "")
  const [filename, setFilename] = React.useState(`${stem}-edited.png`)
  const extension = String(manifest.metadata.extension || "").toLowerCase()
  const source = extension === "heic" || extension === "heif" || manifest.metadata.tiled === true
    ? manifest.assets.screen_2x?.url ?? manifest.assets.screen?.url ?? manifest.assets.source.url
    : manifest.assets.source?.url ?? manifest.assets.proxy?.url ?? manifest.assets.source.url
  toolRef.current = tool
  colorRef.current = color

  React.useEffect(() => {
    if (!canvasElementRef.current || !hostRef.current) return
    const canvas = new Canvas(canvasElementRef.current, {
      backgroundColor: "transparent",
      preserveObjectStacking: true,
      selection: true,
    })
    canvasRef.current = canvas
    let cancelled = false

    const pointer = (event: MouseEvent | TouchEvent) => canvas.getScenePoint(event)
    const onMouseDown = (options: { e: MouseEvent | TouchEvent }) => {
      const activeTool = toolRef.current
      if (activeTool === "select" || activeTool === "pen") return
      const start = pointer(options.e)
      startRef.current = start
      if (activeTool === "text") {
        const text = new IText("文字", { left: start.x, top: start.y, fill: colorRef.current, fontSize: 28, fontFamily: "sans-serif" })
        canvas.add(text)
        canvas.setActiveObject(text)
        text.enterEditing()
        canvas.requestRenderAll()
        return
      }
      if (activeTool === "arrow") {
        const line = new Line([start.x, start.y, start.x, start.y], { stroke: colorRef.current, strokeWidth: 4, selectable: false, evented: false })
        temporaryRef.current = line
        canvas.add(line)
        return
      }
      if (activeTool === "crop" && cropRef.current) canvas.remove(cropRef.current)
      if (activeTool === "crop") setCropReady(false)
      const rectangle = new Rect({
        left: start.x,
        top: start.y,
        width: 0,
        height: 0,
        originX: activeTool === "crop" ? "left" : "center",
        originY: activeTool === "crop" ? "top" : "center",
        fill: activeTool === "crop" ? "rgba(255,255,255,0.12)" : "transparent",
        stroke: activeTool === "crop" ? "#ffffff" : colorRef.current,
        strokeWidth: 2,
        strokeDashArray: activeTool === "crop" ? [8, 5] : undefined,
        selectable: false,
        evented: false,
      })
      temporaryRef.current = rectangle
      if (activeTool === "crop") cropRef.current = rectangle
      canvas.add(rectangle)
    }
    const onMouseMove = (options: { e: MouseEvent | TouchEvent }) => {
      const start = startRef.current
      const temporary = temporaryRef.current
      if (!start || !temporary) return
      const current = pointer(options.e)
      if (temporary instanceof Line) {
        temporary.set({ x2: current.x, y2: current.y })
      } else if (temporary instanceof Rect) {
        if (temporary === cropRef.current) {
          temporary.set({
            left: Math.min(start.x, current.x),
            top: Math.min(start.y, current.y),
            width: Math.abs(current.x - start.x),
            height: Math.abs(current.y - start.y),
          })
        } else {
          temporary.set({
            left: start.x,
            top: start.y,
            width: Math.abs(current.x - start.x) * 2,
            height: Math.abs(current.y - start.y) * 2,
          })
        }
      }
      canvas.requestRenderAll()
    }
    const onMouseUp = () => {
      const start = startRef.current
      const temporary = temporaryRef.current
      if (start && temporary instanceof Line) {
        const angle = Math.atan2((temporary.y2 ?? start.y) - start.y, (temporary.x2 ?? start.x) - start.x) * 180 / Math.PI
        const arrow = new Triangle({
          left: temporary.x2,
          top: temporary.y2,
          width: 16,
          height: 20,
          fill: colorRef.current,
          angle: angle + 90,
          originX: "center",
          originY: "center",
        })
        temporary.set({ selectable: true, evented: true })
        canvas.add(arrow)
      } else if (temporary instanceof Rect && temporary !== cropRef.current) {
        temporary.set({ selectable: true, evented: true })
      } else if (temporary instanceof Rect && temporary === cropRef.current) {
        setCropReady(temporary.width >= 20 && temporary.height >= 20)
      }
      startRef.current = null
      temporaryRef.current = null
      canvas.requestRenderAll()
    }
    canvas.on("mouse:down", onMouseDown)
    canvas.on("mouse:move", onMouseMove)
    canvas.on("mouse:up", onMouseUp)

    void FabricImage.fromURL(source, { crossOrigin: "anonymous" }).then((image) => {
      if (cancelled || !hostRef.current) return
      const width = image.width || 1
      const height = image.height || 1
      const availableWidth = Math.max(240, hostRef.current.clientWidth - 24)
      const availableHeight = Math.max(240, hostRef.current.clientHeight - 24)
      const scale = Math.min(availableWidth / width, availableHeight / height, 1)
      const canvasWidth = Math.round(width * scale)
      const canvasHeight = Math.round(height * scale)
      canvas.setDimensions({ width: canvasWidth, height: canvasHeight })
      image.set({
        left: canvasWidth / 2,
        top: canvasHeight / 2,
        originX: "center",
        originY: "center",
        scaleX: scale,
        scaleY: scale,
        selectable: false,
        evented: false,
      })
      sourceRef.current = image
      canvas.add(image)
      canvas.sendObjectToBack(image)
      canvas.requestRenderAll()
    }).catch((reason: unknown) => {
      toast.error(reason instanceof Error ? reason.message : "图片编辑器加载失败")
    }).finally(() => { if (!cancelled) setLoading(false) })

    return () => {
      cancelled = true
      canvas.dispose()
      canvasRef.current = null
      sourceRef.current = null
    }
  }, [source])

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.isDrawingMode = tool === "pen"
    canvas.selection = tool === "select"
    canvas.getObjects().forEach((object) => {
      if (object !== sourceRef.current && object !== cropRef.current) object.set({ selectable: tool === "select", evented: tool === "select" })
    })
    if (tool === "pen") {
      const brush = new PencilBrush(canvas)
      brush.color = color
      brush.width = 4
      canvas.freeDrawingBrush = brush
    }
    canvas.requestRenderAll()
  }, [color, tool])

  const undo = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const objects = canvas.getObjects().filter((object) => object !== sourceRef.current)
    const last = objects.at(-1)
    if (last) {
      const wasCrop = last === cropRef.current
      if (wasCrop) cropRef.current = null
      if (wasCrop) setCropReady(false)
      canvas.remove(last)
      canvas.requestRenderAll()
    }
  }

  const rotate = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const oldWidth = canvas.getWidth()
    const oldHeight = canvas.getHeight()
    canvas.getObjects().forEach((object) => {
      const center = object.getCenterPoint()
      object.rotate((object.angle || 0) + 90)
      object.setPositionByOrigin(new Point(oldHeight - center.y, center.x), "center", "center")
      object.setCoords()
    })
    canvas.setDimensions({ width: oldHeight, height: oldWidth })
    canvas.requestRenderAll()
  }

  const flip = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const width = canvas.getWidth()
    canvas.getObjects().forEach((object) => {
      const center = object.getCenterPoint()
      object.set({ flipX: !object.flipX })
      object.setPositionByOrigin(new Point(width - center.x, center.y), "center", "center")
      object.setCoords()
    })
    canvas.requestRenderAll()
  }

  const applyCrop = () => {
    const canvas = canvasRef.current
    const crop = cropRef.current
    if (!canvas || !crop) return
    const bounds = crop.getBoundingRect()
    if (bounds.width < 20 || bounds.height < 20) return
    canvas.remove(crop)
    cropRef.current = null
    setCropReady(false)
    canvas.getObjects().forEach((object) => {
      object.set({ left: (object.left || 0) - bounds.left, top: (object.top || 0) - bounds.top })
      object.setCoords()
    })
    canvas.setDimensions({ width: Math.round(bounds.width), height: Math.round(bounds.height) })
    canvas.requestRenderAll()
    setTool("select")
  }

  const save = async () => {
    const canvas = canvasRef.current
    if (!canvas || saving || !filename.trim()) return
    setSaving(true)
    try {
      if (cropRef.current) canvas.remove(cropRef.current)
      cropRef.current = null
      const blob = await canvas.toBlob({ format: "png", quality: 1, multiplier: 1 })
      if (!blob) throw new Error("无法生成编辑后的图片")
      const created = await savePreviewImageAs(manifest.node_id, blob, filename.trim())
      toast.success(`已另存为 ${created.name}`)
      onClose()
    } catch (reason) {
      toast.error(reason instanceof Error ? reason.message : "另存图片失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-background">
      <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-border bg-background px-3 py-2">
        <ToggleGroup type="single" value={tool} onValueChange={(value) => { if (value) setTool(value as ImageTool) }} variant="outline" size="sm" spacing={0} aria-label="图片编辑工具">
          <ToggleGroupItem value="select" aria-label="选择"><IconArrowRight className="-rotate-45" /></ToggleGroupItem>
          <ToggleGroupItem value="pen" aria-label="画笔"><IconPencil /></ToggleGroupItem>
          <ToggleGroupItem value="rectangle" aria-label="矩形"><IconSquare /></ToggleGroupItem>
          <ToggleGroupItem value="arrow" aria-label="箭头"><IconArrowRight /></ToggleGroupItem>
          <ToggleGroupItem value="text" aria-label="文字"><IconLetterT /></ToggleGroupItem>
          <ToggleGroupItem value="crop" aria-label="裁剪"><IconCrop /></ToggleGroupItem>
        </ToggleGroup>
        <label className="inline-flex size-8 cursor-pointer items-center justify-center rounded-md border border-input" title="绘制颜色">
          <span className="size-4 rounded-full border border-black/10" style={{ backgroundColor: color }} />
          <input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="sr-only" aria-label="绘制颜色" />
        </label>
        <Button variant="ghost" size="icon-sm" onClick={undo} aria-label="撤销"><IconArrowBackUp /></Button>
        <Button variant="ghost" size="icon-sm" onClick={rotate} aria-label="顺时针旋转"><IconRotateClockwise /></Button>
        <Button variant="ghost" size="icon-sm" onClick={flip} aria-label="水平翻转"><IconFlipHorizontal /></Button>
        {cropReady ? <Button variant="outline" size="sm" onClick={applyCrop}>应用裁剪</Button> : null}
        <div className="ml-auto flex min-w-64 items-center gap-2">
          <Input value={filename} onChange={(event) => setFilename(event.target.value)} className="h-8 min-w-0 flex-1 text-xs" aria-label="另存文件名" />
          <Button size="sm" disabled={saving || loading || !filename.trim()} onClick={() => void save()}>
            {saving ? <IconLoader2 data-icon="inline-start" className="animate-spin" /> : <IconDeviceFloppy data-icon="inline-start" />}另存为
          </Button>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="退出图片编辑"><IconX /></Button>
        </div>
      </div>
      <div ref={hostRef} className="relative flex min-h-0 flex-1 items-center justify-center overflow-auto p-3">
        {loading ? <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80 text-sm text-muted-foreground"><IconLoader2 className="mr-2 size-4 animate-spin" />正在加载编辑器…</div> : null}
        <canvas ref={canvasElementRef} aria-label={`${manifest.name} 图片编辑画布`} />
      </div>
    </div>
  )
}
