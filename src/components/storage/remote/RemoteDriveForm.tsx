import * as React from "react"
import { IconCheck, IconExternalLink, IconKey, IconLoader2, IconShieldLock } from "@tabler/icons-react"
import { toast } from "sonner"

import { inspectStorageDriver, type StorageDriverId, type StorageDriverInspection } from "@/api/storage"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FormCard, StorageFormHeader } from "@/components/storage/shared"
import type { RemoteDriveDraft, StorageFormMode } from "@/components/storage/types"
import { formatBytes } from "@/lib/models"

type Props = {
  accessToken: string
  draft: RemoteDriveDraft
  initialDraft?: RemoteDriveDraft
  initialInspection?: StorageDriverInspection | null
  mode?: StorageFormMode
  onChange: (draft: RemoteDriveDraft) => void
  onBack: () => void
  onSubmit: (inspection: StorageDriverInspection | null) => void
  submitLabel?: string
}

const providers = {
  "139": {
    driverId: "drive_139" as StorageDriverId,
    title: "中国移动云盘（139）",
    portal: "https://yun.139.com/",
    tokenLabel: "Authorization",
    tokenPlaceholder: "粘贴 Authorization；带不带 Basic 前缀均可",
    tokenRows: 3,
    rootId: "/",
    steps: [
      "登录移动云盘网页版，进入个人云盘文件列表，再按 F12 打开开发者工具。",
      "在“网络”中找到 file/list 请求，从请求标头复制 Authorization；带不带 Basic 前缀均可。",
      "在“应用 / 存储 → Cookie”中复制 ud_id；Cloudrave 会用它读取总容量与剩余容量。",
      "挂载后会尝试在 Token 到期前自动续期；已过期或被撤销时，请重新登录并更新 Authorization。",
    ],
  },
  "189": {
    driverId: "drive_189" as StorageDriverId,
    title: "天翼云盘（189）",
    portal: "https://cloud.189.cn/",
    tokenLabel: "会话 JSON",
    tokenPlaceholder: '{"accessToken":"...","sessionKey":"...","sessionSecret":"..."}',
    tokenRows: 6,
    rootId: "-11",
    steps: [
      "登录天翼云盘网页版，按 F12 打开开发者工具并切到“网络”。",
      "查找 getSessionForPC 请求，复制响应中的 accessToken、sessionKey、sessionSecret JSON。",
      "会话失效时会尝试用 accessToken 重新换取；accessToken 也失效时，请重新登录并更新会话 JSON。",
    ],
  },
  wo: {
    driverId: "drive_wo" as StorageDriverId,
    title: "联通云盘（Wo）",
    portal: "https://pan.wo.cn/",
    tokenLabel: "WoCloud-Web-Token",
    tokenPlaceholder: "粘贴 WoCloud-Web-Token，或包含它的完整 Cookie Header",
    tokenRows: 3,
    rootId: "0",
    steps: [
      "登录联通云盘网页版，按 F12 打开开发者工具。",
      "在 Cookie 中复制 WoCloud-Web-Token；也可以直接复制完整 Cookie Header。",
      "验证时会读取账号、云盘总量、已用与剩余空间。",
      "Web Token 失效后无法仅凭旧 Token 刷新，请重新登录并复制新的 WoCloud-Web-Token。",
    ],
  },
} as const

export function remoteDriveCredentials(draft: RemoteDriveDraft): Record<string, string> {
  if (draft.provider === "139") {
    return {
      authorization: draft.token.trim(),
      user_domain_id: draft.userDomainId.trim(),
      root_id: draft.rootId.trim() || providers["139"].rootId,
    }
  }
  if (draft.provider === "189") {
    return { session: draft.token.trim(), root_id: draft.rootId.trim() || providers["189"].rootId }
  }
  return { token: draft.token.trim(), root_id: draft.rootId.trim() || providers.wo.rootId }
}

export function RemoteDriveForm({
  accessToken,
  draft,
  initialDraft,
  initialInspection = null,
  mode = "create",
  onChange,
  onBack,
  onSubmit,
  submitLabel,
}: Props) {
  const config = providers[draft.provider]
  const readonly = mode === "readonly"
  const [checking, setChecking] = React.useState(false)
  const [inspection, setInspection] = React.useState<StorageDriverInspection | null>(initialInspection)
  const dirty = mode === "edit" && Boolean(initialDraft) && JSON.stringify(draft) !== JSON.stringify(initialDraft)
  const capacityRatio = inspection && inspection.total_bytes > 0
    ? Math.min(1, inspection.used_bytes / inspection.total_bytes)
    : 0

  React.useEffect(() => setInspection(initialInspection), [initialInspection, draft.provider])

  const update = <K extends keyof RemoteDriveDraft>(key: K, value: RemoteDriveDraft[K]) => {
    onChange({ ...draft, [key]: value })
    if (key !== "name") setInspection(null)
  }

  const verify = async () => {
    if (!draft.name.trim()) {
      toast.error("请先填写在 Cloudrave 中显示的名称。")
      return
    }
    if (!draft.token.trim()) {
      toast.error(`请粘贴${config.tokenLabel}。`)
      return
    }
    if (draft.provider === "139" && !draft.userDomainId.trim()) {
      toast.error("请填写移动云盘 Cookie 中的 ud_id，容量检测需要它。")
      return
    }
    setChecking(true)
    try {
      const result = await inspectStorageDriver(accessToken, config.driverId, remoteDriveCredentials(draft))
      setInspection(result)
      if (!draft.rootId.trim()) onChange({ ...draft, rootId: result.root_id })
      toast.success("登录状态与云盘容量验证成功。")
    } catch (error) {
      setInspection(null)
      toast.error(error instanceof Error ? error.message : "无法验证云盘连接")
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <StorageFormHeader title={mode === "create" ? `添加 ${config.title}` : `编辑 ${initialDraft?.name || config.title}`} onBack={onBack} />

      <FormCard title="1. 获取登录信息" description="这是一次显式的账号连接；Cloudrave 不会根据手机号自动合并账号。">
        <div className="space-y-4 py-4">
          <ol className="space-y-2 text-sm text-muted-foreground">
            {config.steps.map((step, index) => (
              <li className="flex gap-3" key={step}>
                <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-foreground">{index + 1}</span>
                <span className="leading-5">{step}</span>
              </li>
            ))}
          </ol>
          <a className="inline-flex items-center gap-1 text-sm text-primary hover:underline" href={config.portal} target="_blank" rel="noreferrer">
            打开{config.title}网页版 <IconExternalLink size={14} />
          </a>
        </div>
      </FormCard>

      <FormCard title="2. 验证连接" description="Token 在 Cloudrave 中加密保存；上传时浏览器按运营商协议直连，不经过 Cloudrave 转发文件内容。">
        <FieldGroup className="py-4">
          <Field>
            <FieldLabel htmlFor={`${draft.provider}-name`}>存储空间名称</FieldLabel>
            <Input id={`${draft.provider}-name`} value={draft.name} onChange={(event) => update("name", event.target.value)} placeholder={`例如：我的${config.title}`} disabled={readonly} />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${draft.provider}-token`}><IconKey size={15} /> {config.tokenLabel}</FieldLabel>
            <Textarea id={`${draft.provider}-token`} rows={config.tokenRows} value={draft.token} onChange={(event) => update("token", event.target.value)} placeholder={mode === "edit" ? "留空表示保留现有凭据" : config.tokenPlaceholder} autoComplete="off" spellCheck={false} className="font-mono text-xs" disabled={readonly} />
            <FieldDescription>不要把这段登录信息发给他人。验证失败时请重新登录网页版后再获取。</FieldDescription>
          </Field>
          {draft.provider === "139" ? (
            <Field>
              <FieldLabel htmlFor="drive-139-ud-id">用户域 ID（ud_id）</FieldLabel>
              <Input id="drive-139-ud-id" value={draft.userDomainId} onChange={(event) => update("userDomainId", event.target.value)} placeholder="从 yun.139.com Cookie 中复制 ud_id" disabled={readonly} />
              <FieldDescription>移动云盘必须提供此值才能自动读取总容量与剩余容量。</FieldDescription>
            </Field>
          ) : null}
          <Field>
            <FieldLabel htmlFor={`${draft.provider}-root`}>根目录 ID</FieldLabel>
            <Input id={`${draft.provider}-root`} className="font-mono" value={draft.rootId} onChange={(event) => update("rootId", event.target.value)} placeholder={config.rootId || "留空表示个人云盘根目录"} disabled={readonly || mode === "edit"} />
            <FieldDescription>默认值适用于个人云盘根目录；添加后不允许直接改动，避免索引指向错误目录。</FieldDescription>
          </Field>
          {mode === "create" || draft.token.trim() ? (
            <Button type="button" variant="outline" className="w-fit" onClick={verify} disabled={readonly || checking}>
              {checking ? <IconLoader2 className="animate-spin" /> : <IconShieldLock />}
              {checking ? "正在验证登录并读取容量…" : "验证登录并读取容量"}
            </Button>
          ) : null}
        </FieldGroup>
      </FormCard>

      {inspection ? (
        <FormCard
          title="3. 确认容量并挂载"
          description="首次挂载会导入远程目录索引；上传、下载和在线预览均直连运营商云盘。"
          footer={<Button onClick={() => onSubmit(inspection)} disabled={readonly}>{submitLabel ?? (mode === "create" ? "确认并挂载" : "保存")}</Button>}
        >
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 rounded-xl bg-emerald-500/8 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              <IconCheck size={18} />
              <div><div className="font-medium">登录状态有效</div><div className="text-xs opacity-80">{inspection.display_name || inspection.account_id}</div></div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm"><span>云盘空间</span><span className="text-muted-foreground">{formatBytes(inspection.used_bytes)} / {formatBytes(inspection.total_bytes)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-[width]" style={{ width: `${capacityRatio * 100}%` }} /></div>
              <div className="flex justify-between text-xs text-muted-foreground"><span>已用 {(capacityRatio * 100).toFixed(capacityRatio >= 0.1 ? 1 : 2)}%</span><span>剩余 {formatBytes(inspection.free_bytes)}</span></div>
            </div>
            <div className="text-xs leading-5 text-muted-foreground">Cloudrave 会把运营商总容量作为此挂载的配额上限，并在存储列表显示本次读取的用量，避免容量不足时才发现。</div>
          </div>
        </FormCard>
      ) : mode === "edit" && dirty ? (
        <div className="fixed bottom-6 left-6 z-50 flex items-center gap-3 rounded-xl border bg-background p-3 shadow-lg">
          <span className="hidden text-sm text-muted-foreground sm:block">您有未保存的更改</span>
          <Button onClick={() => onSubmit(null)}>保存名称</Button>
        </div>
      ) : null}
    </div>
  )
}
