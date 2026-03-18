import * as React from "react"
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface CosPolicyDraft {
  name: string
  bucketName: string
  accessPermission: "private" | "public-read"
  accessDomain: string
  secretId: string
  secretKey: string
}

interface CosPolicyFormProps {
  draft: CosPolicyDraft
  onChange: (draft: CosPolicyDraft) => void
  onBack: () => void
  onNext: () => void
}

function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/40 py-4 last:border-0 sm:grid sm:grid-cols-[1fr_1.4fr] sm:items-start sm:gap-x-10 sm:py-5">
      <div className="space-y-1">
        <div className="text-[15px] font-semibold tracking-wide">{label}</div>
        {hint && (
          <div className="text-sm leading-relaxed tracking-wide text-muted-foreground">{hint}</div>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

export function CosPolicyForm({ draft, onChange, onBack, onNext }: CosPolicyFormProps) {
  const update = <K extends keyof CosPolicyDraft>(key: K, value: CosPolicyDraft[K]) =>
    onChange({ ...draft, [key]: value })

  const canNext =
    draft.name.trim().length > 0 &&
    draft.bucketName.trim().length > 0 &&
    draft.accessDomain.trim().length > 0 &&
    draft.secretId.trim().length > 0 &&
    draft.secretKey.trim().length > 0

  return (
    <div className="flex flex-col gap-8">
      {/* 上一步 + 标题同一行 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-3 py-2 text-[15px] text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <IconArrowLeft size={16} />
          上一步
        </Button>
        <h2 className="text-xl font-semibold tracking-wide">添加 腾讯云COS</h2>
      </div>

      <div className="rounded-md border border-border/50 px-6">
        <Row label="名称" hint="存储策略的展示名，也会用于向用户展示。">
          <Input
            className="h-10 w-full text-[15px]"
            value={draft.name}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("name", e.target.value)}
            placeholder="例如：主资源桶"
          />
        </Row>

        <Row
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
              创建存储桶，转到所创建存储桶的基础配置页面，将{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">存储桶名称</code>{" "}
              填写到上方。
            </>
          }
        >
          <Input
            className="h-10 w-full text-[15px]"
            value={draft.bucketName}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("bucketName", e.target.value)}
            placeholder="cloudrave-assets-1250000000"
          />
        </Row>

        <Row label="访问权限" hint="请选择你创建的存储空间的读写权限类型。">
          <Select
            value={draft.accessPermission}
            onValueChange={(v: string) => update("accessPermission", v as CosPolicyDraft["accessPermission"])}
          >
            <SelectTrigger className="h-10 w-full text-[15px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">私有读写</SelectItem>
              <SelectItem value="public-read">公有读私有写</SelectItem>
            </SelectContent>
          </Select>
        </Row>

        <Row
          label="访问域名"
          hint={
            <>
              在所创建 Bucket 的概况页面，填写{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">域名信息</code>{" "}
              栏目下给出的{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">访问域名</code>
              。你也可以使用自己绑定的源站域名或 CDN 加速域名。
            </>
          }
        >
          <Input
            className="h-10 w-full text-[15px]"
            value={draft.accessDomain}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("accessDomain", e.target.value)}
            placeholder="https://cloudrave-assets-1250000000.cos.ap-guangzhou.myqcloud.com"
          />
        </Row>

        <Row
          label="访问凭证"
          hint={
            <>
              填写在腾讯云{" "}
              <a
                href="https://console.cloud.tencent.com/cam/capi"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-0.5 text-primary hover:underline"
              >
                访问密钥<IconExternalLink size={12} />
              </a>{" "}
              页面获取一对访问密钥。请确保这对密钥拥有 COS 服务的访问权限。
            </>
          }
        >
          <div className="flex gap-3">
            <Input
              className="h-10 flex-1 text-[15px]"
              value={draft.secretId}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("secretId", e.target.value)}
              placeholder="SecretId"
            />
            <Input
              type="password"
              className="h-10 flex-1 text-[15px]"
              value={draft.secretKey}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => update("secretKey", e.target.value)}
              placeholder="SecretKey"
            />
          </div>
        </Row>
      </div>

      <div>
        <Button className="px-6 py-2.5 text-[15px]" onClick={onNext} disabled={!canNext}>
          下一步
        </Button>
      </div>
    </div>
  )
}
