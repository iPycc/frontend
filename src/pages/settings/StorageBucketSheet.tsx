import { Input } from "@/components/ui/input"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import type { BucketMount } from "@/lib/mock-data"
import { cn } from "@/lib/utils"
import { BucketMeta, CheckboxRow, FieldBlock, SelectField } from "./shared"

export type BucketDraft = {
  name: string
  provider: string
  bucket: string
  region: string
  endpoint: string
  basePrefix: string
  secretId: string
  secretKey: string
  sessionToken: string
  multipartThreshold: string
  partSize: string
  presignTtl: string
  concurrency: number
  protocol: "https" | "http"
  pathStyle: boolean
  accelerate: boolean
  corsConfigured: boolean
  advancedMode: boolean
}

export const bucketSteps = [
  "准备信息",
  "基础连接",
  "访问凭证",
  "Endpoint / CORS",
  "上传策略",
  "确认创建",
]

export function createBucketDraft(bucket?: BucketMount): BucketDraft {
  return {
    name: bucket?.name ?? "",
    provider: bucket?.provider ?? "Tencent COS",
    bucket: bucket?.bucket ?? "",
    region: bucket?.region ?? "ap-guangzhou",
    endpoint: bucket?.endpoint ?? "cos.ap-guangzhou.myqcloud.com",
    basePrefix: bucket?.basePrefix ?? "",
    secretId: bucket?.secretId ?? "",
    secretKey: bucket?.secretKey ?? "",
    sessionToken: bucket?.sessionToken ?? "",
    multipartThreshold: bucket?.strategy.multipartThreshold ?? "64 MB",
    partSize: bucket?.strategy.partSize ?? "16 MB",
    presignTtl: bucket?.strategy.presignTtl ?? "900",
    concurrency: bucket?.strategy.concurrency ?? 4,
    protocol: bucket?.strategy.protocol ?? "https",
    pathStyle: bucket?.strategy.pathStyle ?? false,
    accelerate: bucket?.strategy.accelerate ?? false,
    corsConfigured: bucket ? bucket.corsStatus === "healthy" : true,
    advancedMode: bucket?.advancedMode ?? true,
  }
}

export function StorageBucketSheet({
  open,
  onOpenChange,
  editingBucket,
  draft,
  onDraftChange,
  step,
  onStepChange,
  canContinue,
  onSubmit,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  editingBucket: BucketMount | null
  draft: BucketDraft
  onDraftChange: (recipe: (current: BucketDraft) => BucketDraft) => void
  step: number
  onStepChange: (step: number) => void
  canContinue: boolean
  onSubmit: () => void
}) {
  const updateDraft = <K extends keyof BucketDraft>(key: K, value: BucketDraft[K]) =>
    onDraftChange((current) => ({ ...current, [key]: value }))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full max-w-[560px] gap-0 border-l border-border/60 bg-background p-0 sm:max-w-[560px]"
      >
        <SheetHeader className="border-b border-border/60 px-6 py-5">
          <SheetTitle>{editingBucket ? "编辑存储桶" : "新建存储桶"}</SheetTitle>
          <SheetDescription>
            采用 0-5 步抽屉流程，把 COS 接入信息和高级模式分开填写。
          </SheetDescription>
        </SheetHeader>

        <div className="border-b border-border/60 px-6 py-4">
          <div className="grid grid-cols-3 gap-2 text-xs sm:grid-cols-6">
            {bucketSteps.map((item, index) => (
              <button
                key={item}
                type="button"
                onClick={() => onStepChange(index)}
                className={cn(
                  "rounded-md px-2 py-2 text-left transition-colors",
                  index === step
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted/70 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className="font-medium">0{index}</div>
                <div className="mt-1 truncate">{item}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="custom-scrollbar flex-1 overflow-y-auto px-6 py-5">
          {step === 0 ? (
            <div className="space-y-5">
              <FieldBlock
                label="显示名称"
                hint="用于设置中心和侧边栏展示，可以与真实 Bucket 名不同。"
              >
                <Input
                  value={draft.name}
                  onChange={(event) => updateDraft("name", event.target.value)}
                  placeholder="例如：主资源桶"
                />
              </FieldBlock>

              <FieldBlock
                label="高级模式"
                hint="开启后会显示协议、路径风格、加速域名和更细的上传策略参数。"
              >
                <CheckboxRow
                  checked={draft.advancedMode}
                  label="启用高级模式"
                  description="适合已有 COS 运维经验，或者需要和 SDK 参数完全对齐的场景。"
                  onToggle={() => updateDraft("advancedMode", !draft.advancedMode)}
                />
              </FieldBlock>

              <div
                className="rounded-xl px-4 py-4"
                style={{ backgroundColor: "var(--app-shell)" }}
              >
                <div className="text-sm font-medium">开始前请准备</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  <li>Bucket 名称通常包含业务名与 AppId 后缀。</li>
                  <li>Region 需要与 COS 控制台里的存储桶地域完全一致。</li>
                  <li>浏览器上传场景建议提前确认 CORS 白名单和签名时效。</li>
                </ul>
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="space-y-5">
              <FieldBlock
                label="存储提供方"
                hint="当前先按腾讯云 COS 设计，后续可以扩展其他对象存储。"
              >
                <SelectField
                  value={draft.provider}
                  onChange={(value) => updateDraft("provider", value)}
                  options={[{ label: "Tencent COS", value: "Tencent COS" }]}
                />
              </FieldBlock>

              <FieldBlock
                label="Bucket"
                hint="填写完整 Bucket 名称，例如 cloudrave-assets-prod-1250000000。"
              >
                <Input
                  value={draft.bucket}
                  onChange={(event) => updateDraft("bucket", event.target.value)}
                />
              </FieldBlock>

              <FieldBlock
                label="Region"
                hint="示例：ap-guangzhou、ap-shanghai、ap-hongkong。"
              >
                <Input
                  value={draft.region}
                  onChange={(event) => updateDraft("region", event.target.value)}
                />
              </FieldBlock>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-5">
              <FieldBlock
                label="SecretId"
                hint="长期密钥场景必填，临时密钥场景需和 SessionToken 搭配。"
              >
                <Input
                  value={draft.secretId}
                  onChange={(event) => updateDraft("secretId", event.target.value)}
                  placeholder="AKIDxxxxxxxxxxxx"
                />
              </FieldBlock>

              <FieldBlock
                label="SecretKey"
                hint="这里只做本地 mock 演示，真实环境应由后端安全托管。"
              >
                <Input
                  type="password"
                  value={draft.secretKey}
                  onChange={(event) => updateDraft("secretKey", event.target.value)}
                  placeholder="********************************"
                />
              </FieldBlock>

              <FieldBlock
                label="SessionToken"
                hint="如果你使用 STS 临时密钥，可以在这里额外填写。"
              >
                <Input
                  value={draft.sessionToken}
                  onChange={(event) => updateDraft("sessionToken", event.target.value)}
                  placeholder="可选"
                />
              </FieldBlock>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-5">
              <FieldBlock
                label="Endpoint"
                hint="默认为腾讯云 COS 域名，也可以改为自定义域名或内网域名。"
              >
                <Input
                  value={draft.endpoint}
                  onChange={(event) => updateDraft("endpoint", event.target.value)}
                  placeholder="cos.ap-guangzhou.myqcloud.com"
                />
              </FieldBlock>

              <FieldBlock
                label="根目录前缀"
                hint="把该策略挂载到 Bucket 的某个子目录时使用。"
              >
                <Input
                  value={draft.basePrefix}
                  onChange={(event) => updateDraft("basePrefix", event.target.value)}
                  placeholder="team-assets"
                />
              </FieldBlock>

              <FieldBlock
                label="CORS"
                hint="浏览器上传、预览和分片直传都依赖跨域设置。"
              >
                <CheckboxRow
                  checked={draft.corsConfigured}
                  label="我已经确认 CORS 配置"
                  description="建议允许当前站点域名、HEAD/GET/PUT/POST 请求与必要的自定义头。"
                  onToggle={() => updateDraft("corsConfigured", !draft.corsConfigured)}
                />
              </FieldBlock>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <FieldBlock label="分片阈值" hint="超过该值开始使用 multipart 上传。">
                  <Input
                    value={draft.multipartThreshold}
                    onChange={(event) => updateDraft("multipartThreshold", event.target.value)}
                  />
                </FieldBlock>

                <FieldBlock label="Part Size" hint="每个分片的大小。">
                  <Input
                    value={draft.partSize}
                    onChange={(event) => updateDraft("partSize", event.target.value)}
                  />
                </FieldBlock>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <FieldBlock label="预签名 TTL" hint="单位秒。">
                  <Input
                    value={draft.presignTtl}
                    onChange={(event) => updateDraft("presignTtl", event.target.value)}
                  />
                </FieldBlock>

                <FieldBlock label="并发数" hint="控制分片并发上传的数量。">
                  <Input
                    type="number"
                    min={1}
                    value={String(draft.concurrency)}
                    onChange={(event) => updateDraft("concurrency", Number(event.target.value || 1))}
                  />
                </FieldBlock>
              </div>

              {draft.advancedMode ? (
                <div
                  className="space-y-4 rounded-xl px-4 py-4"
                  style={{ backgroundColor: "var(--app-shell)" }}
                >
                  <div className="text-sm font-medium">高级模式</div>

                  <FieldBlock
                    label="传输协议"
                    hint="一般建议保持 HTTPS，自定义内网环境时再切换。"
                  >
                    <SelectField
                      value={draft.protocol}
                      onChange={(value) => updateDraft("protocol", value as "https" | "http")}
                      options={[
                        { label: "HTTPS", value: "https" },
                        { label: "HTTP", value: "http" },
                      ]}
                    />
                  </FieldBlock>

                  <CheckboxRow
                    checked={draft.pathStyle}
                    label="强制路径风格"
                    description="一些私有部署或兼容接口会要求 path-style 访问。"
                    onToggle={() => updateDraft("pathStyle", !draft.pathStyle)}
                  />

                  <CheckboxRow
                    checked={draft.accelerate}
                    label="启用加速域名"
                    description="需要 Bucket 已在 COS 控制台开启传输加速。"
                    onToggle={() => updateDraft("accelerate", !draft.accelerate)}
                  />
                </div>
              ) : null}
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              <div
                className="rounded-xl px-4 py-4"
                style={{ backgroundColor: "var(--app-shell)" }}
              >
                <div className="text-sm font-medium">{draft.name || "未命名存储桶"}</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {draft.provider} · {draft.region} · {draft.bucket || "待填写 Bucket"}
                </div>
              </div>

              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <BucketMeta label="Endpoint" value={draft.endpoint || "默认"} />
                <BucketMeta label="目录前缀" value={draft.basePrefix || "/"} />
                <BucketMeta label="CORS" value={draft.corsConfigured ? "已确认" : "待确认"} />
                <BucketMeta label="高级模式" value={draft.advancedMode ? "已开启" : "已关闭"} />
                <BucketMeta label="上传策略" value={`${draft.multipartThreshold} / ${draft.partSize}`} />
                <BucketMeta label="签名与并发" value={`${draft.presignTtl}s / ${draft.concurrency} 并发`} />
              </dl>
            </div>
          ) : null}
        </div>

        <SheetFooter className="border-t border-border/60 px-6 py-4">
          <div className="flex w-full items-center justify-between gap-3">
            <Button
              variant="outline"
              onClick={() => onStepChange(Math.max(step - 1, 0))}
              disabled={step === 0}
            >
              上一步
            </Button>

            {step < bucketSteps.length - 1 ? (
              <Button
                onClick={() => onStepChange(Math.min(step + 1, bucketSteps.length - 1))}
                disabled={!canContinue}
              >
                下一步
              </Button>
            ) : (
              <Button onClick={onSubmit}>
                {editingBucket ? "保存更改" : "创建存储桶"}
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
