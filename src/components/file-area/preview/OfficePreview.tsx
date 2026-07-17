import * as React from "react"
import { IconExternalLink, IconLoader2, IconRefresh } from "@tabler/icons-react"

import type { PreviewManifest } from "@/api/files"
import { Button } from "@/components/ui/button"

export function OfficePreview({ manifest }: { manifest: PreviewManifest }) {
  const source = manifest.assets.office_viewer?.url
  const [loading, setLoading] = React.useState(true)
  const [timedOut, setTimedOut] = React.useState(false)
  const [reloadKey, setReloadKey] = React.useState(0)
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
    <div className="relative h-full w-full bg-muted/30">
      <iframe
        key={reloadKey}
        src={source}
        title={`${manifest.name} Office 在线预览`}
        className="h-full w-full border-0 bg-white"
        referrerPolicy="no-referrer"
        allow="fullscreen"
        onLoad={() => {
          setLoading(false)
          setTimedOut(false)
        }}
      />
      {loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 px-6 text-center">
          <IconLoader2 size={22} className="mb-3 animate-spin text-primary" />
          <p className="text-sm text-foreground">正在连接 Microsoft Office Web Viewer</p>
          <p className="mt-1 max-w-lg text-xs leading-5 text-muted-foreground">Office 文档会通过短时签名的公网 HTTPS 地址交给微软服务读取；本模式仅支持预览。</p>
          {timedOut ? (
            <div className="mt-4 flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setReloadKey((value) => value + 1)}><IconRefresh size={15} className="mr-1.5" />重试</Button>
              <Button size="sm" onClick={() => window.open(source, "_blank", "noopener,noreferrer")}><IconExternalLink size={15} className="mr-1.5" />新窗口打开</Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
