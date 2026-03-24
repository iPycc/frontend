import * as React from "react"

import { FormCard, StorageFormHeader } from "@/components/storage/shared"

export function AliyunStorageForm({ onBack }: { onBack?: () => void }) {
  return (
    <div className="flex flex-col gap-8">
      <StorageFormHeader title="阿里云 OSS" onBack={onBack} />
      <FormCard
        title="功能预留"
        description="阿里云 OSS 模块已预留接入位，后续新增厂商时无需改动主页面。"
      >
        <div className="py-6 text-sm text-muted-foreground">
          当前版本暂未开放阿里云 OSS 配置。
        </div>
      </FormCard>
    </div>
  )
}
