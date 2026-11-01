import * as React from "react"

import { Button } from "@/components/ui/button"
import { FormCard, StorageFormHeader } from "@/components/storage/shared"

type Props = {
  onBack: () => void
  onSubmit: (autoConfigure: boolean) => void
}

export function AliyunCorsStep({ onBack, onSubmit }: Props) {
  const [action, setAction] = React.useState<"auto" | "manual" | null>(null)
  const origin = typeof window === "undefined" ? "当前站点" : window.location.origin

  return (
    <div className="flex flex-col gap-3">
      <StorageFormHeader title="跨域策略" onBack={onBack} />
      <FormCard
        title="OSS CORS 配置"
        description="Cloudrave 会保留存储桶中无关的规则，只合并当前站点浏览器直传所需的规则。"
        footer={
          <div className="flex flex-wrap items-center gap-3 pt-3">
            {action === null ? (
              <>
                <Button onClick={() => setAction("auto")}>让 Cloudrave 帮我设置</Button>
                <Button variant="outline" onClick={() => setAction("manual")}>我自行设置</Button>
              </>
            ) : (
              <>
                <span className="text-sm text-muted-foreground">
                  {action === "auto" ? "创建后自动合并规则。" : "创建后请在 OSS 控制台手动添加此规则。"}
                </span>
                <Button onClick={() => onSubmit(action === "auto")}>创建</Button>
              </>
            )}
          </div>
        }
      >
        <dl className="grid gap-3 py-4 text-sm sm:grid-cols-[10rem_1fr]">
          <dt className="text-muted-foreground">来源</dt><dd className="font-mono">{origin}</dd>
          <dt className="text-muted-foreground">允许方法</dt><dd className="font-mono">GET, POST, PUT, HEAD, DELETE</dd>
          <dt className="text-muted-foreground">允许请求头</dt><dd className="font-mono">*</dd>
          <dt className="text-muted-foreground">暴露响应头</dt><dd className="font-mono">ETag, Content-Length, Content-Range, x-oss-request-id</dd>
        </dl>
      </FormCard>
    </div>
  )
}
