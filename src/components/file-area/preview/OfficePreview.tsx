import * as React from "react"
import { IconArrowsMaximize, IconExternalLink, IconRefresh } from "@tabler/icons-react"

import type { PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"
import { PreviewSkeleton } from "./PreviewSkeleton"

export function OfficePreview({ manifest }: { manifest: PreviewManifest }) {
  const source = manifest.assets.office_viewer?.url
  const [loading, setLoading] = React.useState(true)
  const [timedOut, setTimedOut] = React.useState(false)
  const [reloadKey, setReloadKey] = React.useState(0)
  const hostRef = React.useRef<HTMLDivElement>(null)
  const publicSourceReady = manifest.metadata.public_source_ready !== false

  React.useEffect(() => {
    setLoading(true)
    setTimedOut(false)
    const timer = window.setTimeout(() => setTimedOut(true), 15_000)
    return () => window.clearTimeout(timer)
  }, [manifest.node_id, manifest.version, reloadKey])

  if (!source || !publicSourceReady) {
    return <div className="flex h-full items-center justify-center px-6 text-center text-sm text-muted-foreground">Microsoft 需要通过公网 HTTPS 读取文档。请为 Cloudrave 配置 public_base_url 后重试。</div>
  }

  return (
    <div ref={hostRef} className="relative h-full w-full bg-background">
      <iframe
        key={reloadKey}
        src={source}
        title={`${manifest.name} Office 在线预览`}
        className={`h-full w-full border-0 bg-white transition-opacity ${loading ? "opacity-0" : "opacity-100"}`}
        referrerPolicy="no-referrer"
        allow="fullscreen"
        onLoad={() => {
          setLoading(false)
          setTimedOut(false)
        }}
      />
      {!loading ? (
        <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-sm">
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => hostRef.current?.requestFullscreen()}
            aria-label="全屏放映"
            title="全屏放映"
          >
            <IconArrowsMaximize size={17} />
          </Button>
          <Button
            size="icon-sm"
            variant="ghost"
            onClick={() => window.open(source, "_blank", "noopener,noreferrer")}
            aria-label="新窗口打开"
            title="新窗口打开"
          >
            <IconExternalLink size={17} />
          </Button>
        </div>
      ) : null}
      {loading ? (
        <div className="absolute inset-0">
          <PreviewSkeleton kind="office" />
          {timedOut ? (
            <div className="absolute inset-x-0 bottom-5 flex justify-center gap-2">
              <Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)}><IconRefresh size={15} className="mr-1.5" />重试</Button>
              <Button size="sm" onClick={() => window.open(source, "_blank", "noopener,noreferrer")}><IconExternalLink size={15} className="mr-1.5" />新窗口打开</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
