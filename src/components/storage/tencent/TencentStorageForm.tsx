import * as React from "react"
import { IconExternalLink } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { FormCard, FormRow, StorageFormHeader } from "@/components/storage/shared"
import type { StorageFormMode, TencentStorageDraft } from "@/components/storage/types"
import { EncryptionOptions } from "@/components/storage/tencent/EncryptionOptions"
import { MountOptions } from "@/components/storage/tencent/MountOptions"
import { TransferOptions } from "@/components/storage/tencent/TransferOptions"

interface TencentStorageFormProps {
  draft: TencentStorageDraft
  initialDraft?: TencentStorageDraft
  mode?: StorageFormMode
  onChange: (draft: TencentStorageDraft) => void
  onBack?: () => void
  onSubmit: () => void
  submitLabel?: string
}

export function TencentStorageForm({
  draft,
  initialDraft,
  mode = "create",
  onChange,
  onBack,
  onSubmit,
  submitLabel,
}: TencentStorageFormProps) {
  const readonly = mode === "readonly"

  const isDirty = React.useMemo(() => {
    if (!initialDraft || mode !== "edit") return false
    return JSON.stringify(draft) !== JSON.stringify(initialDraft)
  }, [draft, initialDraft, mode])

  const update = <K extends keyof TencentStorageDraft>(key: K, value: TencentStorageDraft[K]) =>
    onChange({ ...draft, [key]: value })

  const handleReset = () => {
    if (initialDraft) {
      onChange(initialDraft)
    }
  }

  const credentialsReady = mode === "edit" || (draft.secretId.trim().length > 0 && draft.secretKey.trim().length > 0)
  const canSubmit =
    !readonly &&
    draft.name.trim().length > 0 &&
    draft.bucketName.trim().length > 0 &&
    draft.region.trim().length > 0 &&
    credentialsReady

  const title = mode === "edit" ? `编辑 ${initialDraft?.name || "腾讯云 COS"}` : "添加 腾讯云 COS"

  return (
    <div className="flex flex-col gap-3 sm:gap-3">
      <StorageFormHeader title={title} onBack={onBack} />

      <FormCard
        title="连接配置"
        description="腾讯云 COS 的连接、权限、域名和密钥网关"
        footer={
          mode === "create" ? (
            <Button className="px-6 py-2.5 text-[15px]" onClick={onSubmit} disabled={!canSubmit}>
              {submitLabel ?? "下一步"}
            </Button>
          ) : null
        }
      >
        <FormRow label="名称" hint="存储策略的展示名，也会用于向用户展示。">
          <Input
            className="h-10 w-full text-[15px]"
            value={draft.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("name", e.target.value)}
            placeholder="例如：主资源桶"
            disabled={readonly}
          />
        </FormRow>

        <FormRow
          label="Bucket 名称"
          hint={
            <>
              前往{" "}
              <a
                href="https://console.cloud.tencent.com/cos/bucket"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                COS 管理控制台<IconExternalLink size={12} />
              </a>{" "}
              创建存储桶后，将存储桶名称填写到此处。
            </>
          }
        >
          <Input
            className="h-10 w-full text-[15px]"
            value={draft.bucketName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("bucketName", e.target.value)}
            placeholder="cloudrave-assets-1250000000"
            disabled={readonly}
          />
        </FormRow>

        <FormRow label="访问权限" hint="请选择你创建的存储空间的读写权限类型。">
          <Select
            value={draft.accessPermission}
            onValueChange={(value: string) => update("accessPermission", value as TencentStorageDraft["accessPermission"])}
            disabled={readonly}
          >
            <SelectTrigger className="h-10 w-full text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">私有读写</SelectItem>
              <SelectItem value="public-read">公有读私有写</SelectItem>
            </SelectContent>
          </Select>
        </FormRow>

        <FormRow
          label="API 域名（可选）"
          hint="通常留空，由 SDK 根据地域生成官方域名；仅在使用专用 COS API 网关时填写。"
        >
          <Input
            className="h-10 w-full text-[15px]"
            value={draft.accessDomain}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("accessDomain", e.target.value)}
            placeholder="https://cloudrave-assets-1250000000.cos.ap-guangzhou.myqcloud.com"
            disabled={readonly}
          />
        </FormRow>

        <FormRow
          label="访问凭证"
          hint={
            <>
              在腾讯云{" "}
              <a
                href="https://console.cloud.tencent.com/cam/capi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                访问密钥<IconExternalLink size={12} />
              </a>{" "}
              页面获取一对访问密钥。
            </>
          }
        >
          <div className="flex gap-3">
            <Input
              className="h-10 flex-1 text-[15px]"
              value={draft.secretId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("secretId", e.target.value)}
              placeholder="SecretId"
              disabled={readonly}
            />
            <Input
              type="password"
              className="h-10 flex-1 text-[15px]"
              value={draft.secretKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("secretKey", e.target.value)}
              placeholder="SecretKey"
              disabled={readonly}
            />
          </div>
        </FormRow>

        <MountOptions draft={draft} mode={mode} onChange={onChange} />
        <TransferOptions draft={draft} mode={mode} onChange={onChange} />
        <EncryptionOptions draft={draft} mode={mode} onChange={onChange} />
      </FormCard>

      {mode === "edit" && isDirty && (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-2xl bg-background/95 p-3 shadow-[0_8px_30px_rgba(0,0,0,0.12)] backdrop-blur-md ring-1 ring-border/50 animate-in slide-in-from-bottom-8 fade-in dark:bg-background/80 md:left-8">
          <div className="hidden px-2 text-sm font-medium text-muted-foreground sm:block">
            您有未保存的更改
          </div>
          <Button variant="outline" size="sm" className="h-9 px-5" onClick={handleReset}>
            重置
          </Button>
          <Button size="sm" className="h-9 px-6" onClick={onSubmit} disabled={!canSubmit}>
            保存
          </Button>
        </div>
      )}
    </div>
  )
}
