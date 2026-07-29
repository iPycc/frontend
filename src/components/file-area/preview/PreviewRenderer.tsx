import * as React from "react"
import { IconFileOff, IconFileText, IconLoader2, IconRefresh } from "@tabler/icons-react"

import type { PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"

const ImagePreview = React.lazy(() => import("./ImagePreview").then((module) => ({ default: module.ImagePreview })))
const MediaPreview = React.lazy(() => import("./MediaPreview").then((module) => ({ default: module.MediaPreview })))
const PdfPreview = React.lazy(() => import("./PdfPreview").then((module) => ({ default: module.PdfPreview })))
const TextPreview = React.lazy(() => import("./TextPreview").then((module) => ({ default: module.TextPreview })))
const OfficePreview = React.lazy(() => import("./OfficePreview").then((module) => ({ default: module.OfficePreview })))
const ArchivePreview = React.lazy(() => import("./ArchivePreview").then((module) => ({ default: module.ArchivePreview })))
const AudioPlayer = React.lazy(() => import("@/components/audio/AudioPlayer").then((module) => ({ default: module.AudioPlayer })))

function LazyFallback() {
  return <div className="flex h-full items-center justify-center text-sm text-muted-foreground"><IconLoader2 size={20} className="mr-2 animate-spin" />正在加载预览器</div>
}

export function PreviewRenderer({
  manifest,
  onRetry,
  compactAudio = false,
}: {
  manifest: PreviewManifest
  onRetry?: () => void
  compactAudio?: boolean
}) {
  if (manifest.status === "failed") {
    return <EmptyState message={manifest.error || "预览生成失败，请下载后查看。"} onRetry={onRetry} />
  }
  if (manifest.status === "unsupported" || manifest.kind === "unsupported") {
    return <UnknownPreview manifest={manifest} />
  }

  const renderer = (() => {
    switch (manifest.kind) {
      case "image": return <ImagePreview manifest={manifest} />
      case "video": return <MediaPreview manifest={manifest} />
      case "audio": return <AudioPlayer manifest={manifest} compact={compactAudio} />
      case "pdf": return <PdfPreview manifest={manifest} />
      case "office": return <OfficePreview manifest={manifest} />
      case "text": return <TextPreview manifest={manifest} />
      case "archive": return <ArchivePreview manifest={manifest} />
      default: return <UnknownPreview manifest={manifest} />
    }
  })()

  return <React.Suspense fallback={<LazyFallback />}>{renderer}</React.Suspense>
}

function UnknownPreview({ manifest }: { manifest: PreviewManifest }) {
  const [encoding, setEncoding] = React.useState("utf-8")
  const [openAsText, setOpenAsText] = React.useState(false)

  if (openAsText) {
    const textManifest: PreviewManifest = {
      ...manifest,
      kind: "text",
      status: "ready",
      metadata: { ...manifest.metadata, max_bytes: 5 * 1024 * 1024, text_encoding: encoding },
      capabilities: [],
    }
    return <React.Suspense fallback={<LazyFallback />}><TextPreview manifest={textManifest} /></React.Suspense>
  }

  const extension = String(manifest.metadata.extension || manifest.name.split(".").pop() || "未知")
  return (
    <div className="flex h-full items-center justify-center px-6">
      <div className="w-full max-w-lg text-center">
        <IconFileOff size={42} className="mx-auto text-muted-foreground" stroke={1.5} />
        <h2 className="mt-4 text-lg font-semibold">暂不识别 .{extension} 文件</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          可以尝试把它作为纯文本只读打开。二进制文件可能显示乱码，但不会修改原文件。
        </p>
        <div className="mx-auto mt-5 flex max-w-sm gap-2">
          <label className="sr-only" htmlFor="unknown-file-encoding">文本编码</label>
          <select
            id="unknown-file-encoding"
            value={encoding}
            onChange={(event) => setEncoding(event.target.value)}
            className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="utf-8">UTF-8</option>
            <option value="gb18030">GB18030</option>
            <option value="big5">Big5</option>
          </select>
          <Button size="sm" onClick={() => setOpenAsText(true)}>
            <IconFileText size={16} className="mr-1.5" />作为文本打开
          </Button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-6 text-center">
      <IconFileOff size={40} className="mb-3 text-muted-foreground" />
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry ? <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}><IconRefresh size={15} className="mr-1.5" />重试</Button> : null}
    </div>
  )
}
