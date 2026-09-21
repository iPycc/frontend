import * as React from "react"
import { IconExternalLink } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { FormCard, FormRow, StorageFormHeader } from "@/components/storage/shared"
import type { AliyunStorageDraft, StorageFormMode } from "@/components/storage/types"

type Props = {
  draft: AliyunStorageDraft
  initialDraft?: AliyunStorageDraft
  mode?: StorageFormMode
  onChange: (draft: AliyunStorageDraft) => void
  onBack?: () => void
  onSubmit: () => void
  submitLabel?: string
}

const sizeOptions = ["5 MB", "10 MB", "16 MB", "25 MB", "50 MB", "64 MB", "100 MB"]

export function AliyunStorageForm({ draft, initialDraft, mode = "create", onChange, onBack, onSubmit, submitLabel }: Props) {
  const readonly = mode === "readonly"
  const update = <K extends keyof AliyunStorageDraft>(key: K, value: AliyunStorageDraft[K]) => onChange({ ...draft, [key]: value })
  const dirty = mode === "edit" && Boolean(initialDraft) && JSON.stringify(draft) !== JSON.stringify(initialDraft)
  const credentialsReady = mode === "edit" || (draft.accessKeyId.trim().length > 0 && draft.accessKeySecret.trim().length > 0)
  const canSubmit = !readonly && draft.name.trim().length > 0 && draft.bucketName.trim().length > 0 && draft.region.trim().length > 0 && credentialsReady

  return (
    <div className="flex flex-col gap-3">
      <StorageFormHeader title={mode === "edit" ? `编辑 ${initialDraft?.name || "阿里云 OSS"}` : "添加 阿里云 OSS"} onBack={onBack} />
      <FormCard
        title="连接配置"
        description="配置 OSS 存储桶、挂载方式、浏览器直传和服务端加密。凭据提交后不可回读。"
        footer={mode === "create" ? <Button onClick={onSubmit} disabled={!canSubmit}>{submitLabel ?? "下一步"}</Button> : null}
      >
        <FormRow label="名称" hint="在 Cloudrave 中显示的存储空间名称。">
          <Input value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder="例如：阿里云主存储桶" disabled={readonly} />
        </FormRow>
        <FormRow label="Bucket 名称" hint={<span>在 <a href="https://oss.console.aliyun.com/bucket" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">OSS 控制台<IconExternalLink size={12} /></a> 创建的存储桶名称。</span>}>
          <Input value={draft.bucketName} onChange={(event) => update("bucketName", event.target.value)} placeholder="cloudrave-assets" disabled={readonly} />
        </FormRow>
        <FormRow label="地域" hint="须与 Bucket 所属地域一致；默认 cn-hangzhou。">
          <Input value={draft.region} onChange={(event) => update("region", event.target.value)} placeholder="cn-hangzhou" disabled={readonly} />
        </FormRow>
        <FormRow label="Endpoint（可选）" hint="留空时由 OSS SDK 生成公网 Endpoint。内网 Endpoint 不适合浏览器直传。">
          <Input value={draft.endpoint} onChange={(event) => update("endpoint", event.target.value)} placeholder="https://oss-cn-hangzhou.aliyuncs.com" disabled={readonly} />
        </FormRow>
        <FormRow label="访问凭证" hint="建议使用仅允许访问此 Bucket 的 RAM 用户或临时 STS 凭证。编辑时留空会保留原凭据。">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input value={draft.accessKeyId} onChange={(event) => update("accessKeyId", event.target.value)} placeholder="AccessKey ID" disabled={readonly} />
            <Input type="password" value={draft.accessKeySecret} onChange={(event) => update("accessKeySecret", event.target.value)} placeholder="AccessKey Secret" disabled={readonly} />
            <Input className="sm:col-span-2" type="password" value={draft.securityToken} onChange={(event) => update("securityToken", event.target.value)} placeholder="STS Security Token（可选）" disabled={readonly} />
          </div>
        </FormRow>
        <FormRow label="对象前缀" hint="仅管理此前缀下的对象；留空表示 Bucket 根目录。">
          <Input className="font-mono" value={draft.prefix} onChange={(event) => update("prefix", event.target.value.replace(/^\/+/, ""))} placeholder="users/primary" disabled={readonly} />
        </FormRow>
        <FormRow label="挂载模式" hint="托管模式只显示 Cloudrave 记录；镜像模式可导入前缀中的已有对象。">
          <Select value={draft.mountMode} onValueChange={(value) => update("mountMode", value as AliyunStorageDraft["mountMode"])} disabled={readonly}>
            <SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="managed">托管（推荐）</SelectItem><SelectItem value="mirror">镜像并导入已有对象</SelectItem></SelectContent>
          </Select>
        </FormRow>
        <FormRow label="只读挂载" hint="启用后禁止上传、重命名和删除。">
          <div className="flex min-h-10 items-center justify-between"><span className="text-sm text-muted-foreground">{draft.readOnly ? "只允许浏览与下载" : "允许正常读写"}</span><Switch checked={draft.readOnly} onCheckedChange={(value) => update("readOnly", value)} disabled={readonly} /></div>
        </FormRow>
        <FormRow label="分块阈值" hint="超过阈值后自动使用 OSS 分片上传。">
          <Select value={draft.multipartThreshold} onValueChange={(value) => update("multipartThreshold", value)} disabled={readonly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sizeOptions.map((value) => <SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectContent></Select>
        </FormRow>
        <FormRow label="分块大小" hint="单个分片大小；网络不稳定时建议 10–25 MB。">
          <Select value={draft.partSize} onValueChange={(value) => update("partSize", value)} disabled={readonly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{sizeOptions.map((value) => <SelectItem value={value} key={value}>{value}</SelectItem>)}</SelectContent></Select>
        </FormRow>
        <FormRow label="分块并发数" hint="每个文件同时上传的分片数。">
          <Select value={String(draft.concurrency)} onValueChange={(value) => update("concurrency", Number(value))} disabled={readonly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="1">1</SelectItem><SelectItem value="2">2</SelectItem><SelectItem value="3">3（推荐）</SelectItem></SelectContent></Select>
        </FormRow>
        <FormRow label="服务端加密" hint="对象落盘时由 OSS 加密；SSE-KMS 需要对应 KMS 权限。">
          <Select value={draft.serverSideEncryption} onValueChange={(value) => update("serverSideEncryption", value as AliyunStorageDraft["serverSideEncryption"])} disabled={readonly}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">不启用</SelectItem><SelectItem value="SSE-OSS">SSE-OSS（OSS 托管密钥）</SelectItem><SelectItem value="SSE-KMS">SSE-KMS（阿里云 KMS）</SelectItem></SelectContent></Select>
        </FormRow>
        {draft.serverSideEncryption === "SSE-KMS" ? <FormRow label="KMS Key ID" hint="填写有权限使用的 KMS Key ID。"><Input value={draft.kmsKeyId} onChange={(event) => update("kmsKeyId", event.target.value)} placeholder="KMS Key ID" disabled={readonly} /></FormRow> : null}
      </FormCard>

      {dirty ? (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-xl border bg-background p-3 shadow-lg">
          <span className="hidden text-sm text-muted-foreground sm:block">您有未保存的更改</span>
          <Button variant="outline" size="sm" onClick={() => initialDraft && onChange(initialDraft)}>重置</Button>
          <Button size="sm" onClick={onSubmit} disabled={!canSubmit}>{submitLabel ?? "保存"}</Button>
        </div>
      ) : null}
    </div>
  )
}
