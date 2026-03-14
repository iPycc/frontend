import * as React from "react"
import {
  IconCheck,
  IconChevronRight,
  IconDatabasePlus,
  IconKey,
  IconLockPassword,
  IconPalette,
  IconPlayerPause,
  IconShieldLock,
  IconUserCircle,
} from "@tabler/icons-react"

import { useAppState } from "@/lib/app-state"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { cn } from "@/lib/utils"

type BucketWizardDraft = {
  provider: string
  bucket: string
  region: string
  endpoint: string
  basePrefix: string
  secretId: string
  secretKey: string
  multipartThreshold: string
  partSize: string
  presignTtl: string
  concurrency: number
  corsChecked: boolean
  corsConfigured: boolean
}

const initialBucketWizard: BucketWizardDraft = {
  provider: "腾讯云 COS",
  bucket: "",
  region: "ap-shanghai",
  endpoint: "",
  basePrefix: "/",
  secretId: "",
  secretKey: "",
  multipartThreshold: "64 MB",
  partSize: "16 MB",
  presignTtl: "900",
  concurrency: 4,
  corsChecked: false,
  corsConfigured: false,
}

const inputClassName = "bg-background"

export function Profile() {
  const { profile, updateProfile } = useAppState()
  const [form, setForm] = React.useState({
    username: profile.username,
    email: profile.email,
    avatar: profile.avatar,
  })
  const [saved, setSaved] = React.useState(false)

  React.useEffect(() => {
    setForm({
      username: profile.username,
      email: profile.email,
      avatar: profile.avatar,
    })
  }, [profile])

  const saveProfile = () => {
    updateProfile(form)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]">
      <SectionCard
        icon={<IconUserCircle size={18} />}
        title="个人信息"
        description="用户名、头像、邮箱会同步到你的分享卡片和顶部用户入口。"
      >
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <img
            src={form.avatar}
            alt={form.username}
            className="h-20 w-20 rounded-2xl border border-border/70 bg-muted object-cover"
          />
          <div className="grid flex-1 gap-4 sm:grid-cols-2">
            <Field label="用户名">
              <Input
                className={inputClassName}
                value={form.username}
                onChange={(event) => setForm((current) => ({ ...current, username: event.target.value }))}
              />
            </Field>
            <Field label="邮箱地址">
              <Input
                className={inputClassName}
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
              />
            </Field>
          </div>
        </div>

        <Field label="头像地址">
          <Input
            className={inputClassName}
            value={form.avatar}
            onChange={(event) => setForm((current) => ({ ...current, avatar: event.target.value }))}
          />
        </Field>

        <div className="grid gap-3 sm:grid-cols-3">
          <InfoStat label="UID" value={profile.uid} />
          <InfoStat label="注册时间" value={profile.registeredAt} />
          <InfoStat label="用户组" value={profile.group} />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={saveProfile}>保存修改</Button>
          <span className="text-sm text-muted-foreground">
            {saved ? "资料已保存到本地设置" : "当前为前端完整 mock，刷新后仍会保留。"}
          </span>
        </div>
      </SectionCard>

      <SectionCard title="资料预览" description="保持顶部头像与分享资料卡一致。">
        <div className="rounded-2xl border border-border/60 bg-muted/40 p-4">
          <div className="flex items-center gap-3">
            <img src={form.avatar} alt={form.username} className="h-14 w-14 rounded-2xl object-cover" />
            <div className="space-y-1">
              <div className="text-base font-semibold">{form.username}</div>
              <div className="text-sm text-muted-foreground">{form.email}</div>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div>UID：{profile.uid}</div>
            <div>加入时间：{profile.registeredAt}</div>
            <div>用户组：{profile.group}</div>
          </div>
        </div>
      </SectionCard>
    </div>
  )
}

export function SettingsSecurity() {
  const { security, loginActivity, verifyPassword, resetPasswordVerification } = useAppState()
  const [verifyOpen, setVerifyOpen] = React.useState(false)
  const [originPassword, setOriginPassword] = React.useState("")
  const [verifyError, setVerifyError] = React.useState("")
  const [passwordForm, setPasswordForm] = React.useState({ next: "", confirm: "" })
  const [passwordSaved, setPasswordSaved] = React.useState(false)

  const handleVerify = () => {
    if (verifyPassword(originPassword)) {
      setVerifyError("")
      setVerifyOpen(false)
      setOriginPassword("")
      return
    }

    setVerifyError("原始密码不正确，演示环境密码为 cloudrave123")
  }

  const savePassword = () => {
    if (!passwordForm.next || passwordForm.next !== passwordForm.confirm) {
      setPasswordSaved(false)
      return
    }

    setPasswordSaved(true)
    setPasswordForm({ next: "", confirm: "" })
    resetPasswordVerification()
  }

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<IconShieldLock size={18} />}
        title="密码与验证"
        description="先验证原始密码，验证成功后才能录入新密码。"
      >
        <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-medium">密码修改</div>
              <div className="text-sm text-muted-foreground">
                当前流程采用前端 mock，验证密码后才显示新密码输入区。
              </div>
            </div>
            <Button variant={security.passwordVerified ? "secondary" : "default"} onClick={() => setVerifyOpen(true)}>
              {security.passwordVerified ? "重新验证" : "验证原密码"}
            </Button>
          </div>

          {security.passwordVerified ? (
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <Field label="新密码">
                <Input
                  type="password"
                  className={inputClassName}
                  value={passwordForm.next}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, next: event.target.value }))}
                />
              </Field>
              <Field label="确认新密码">
                <Input
                  type="password"
                  className={inputClassName}
                  value={passwordForm.confirm}
                  onChange={(event) => setPasswordForm((current) => ({ ...current, confirm: event.target.value }))}
                />
              </Field>
              <div className="md:col-span-2 flex flex-wrap items-center gap-3">
                <Button onClick={savePassword}>提交新密码</Button>
                <Button variant="ghost" onClick={resetPasswordVerification}>
                  取消本次修改
                </Button>
                <span className="text-sm text-muted-foreground">
                  {passwordSaved ? "密码已更新并重置验证状态" : "建议使用至少 12 位强密码。"}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 grid-cols-1">
          <PlaceholderSecurityCard
            title="二步验证 2FA"
            description="预留 TOTP / 验证器 App 绑定入口。"
            action="预留布局"
          />
          <PlaceholderSecurityCard
            title="通行密钥"
            description="预留 WebAuthn / Passkey 设备绑定入口。"
            action="预留布局"
          />
        </div>
      </SectionCard>

      <SectionCard title="最近登录活动" description="按登录方式、设备、IP、时间展示最近访问记录。">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>登录方式</TableHead>
              <TableHead>设备</TableHead>
              <TableHead>IP</TableHead>
              <TableHead>时间</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loginActivity.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.method}</TableCell>
                <TableCell>{item.device}</TableCell>
                <TableCell>{item.ip}</TableCell>
                <TableCell>{item.time}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SectionCard>

      <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>验证原始密码</DialogTitle>
            <DialogDescription>
              演示环境中请输入 <code>cloudrave123</code> 完成验证。
            </DialogDescription>
          </DialogHeader>
          <Field label="原始密码">
            <Input
              autoFocus
              type="password"
              className={inputClassName}
              value={originPassword}
              onChange={(event) => {
                setOriginPassword(event.target.value)
                setVerifyError("")
              }}
            />
          </Field>
          {verifyError ? <div className="text-sm text-destructive">{verifyError}</div> : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyOpen(false)}>
              取消
            </Button>
            <Button onClick={handleVerify}>验证</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export function SettingsPersonalization() {
  const { settings, setThemeMode, updateSettings } = useAppState()

  const ItemRow = ({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between border-b border-border/40 py-4 last:border-0">
      <div>
        <div className="font-medium text-sm">{title}</div>
        {description && <div className="text-xs text-muted-foreground mt-0.5">{description}</div>}
      </div>
      <div>{children}</div>
    </div>
  )

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<IconPalette size={18} />}
        title="个性化"
        description="所有设置会自动保存到 localStorage，并立即作用于当前界面。"
      >
        <div className="rounded-2xl border border-border/60 bg-background px-4">
          <ItemRow title="语言">
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none"
              value={settings.language}
              onChange={(event) => updateSettings({ language: event.target.value })}
            >
              <option value="zh-CN">简体中文</option>
              <option value="en-US">English</option>
              <option value="ja-JP">日本語</option>
            </select>
          </ItemRow>
          
          <ItemRow title="时区">
            <select
              className="h-9 rounded-lg border border-input bg-background px-3 text-sm outline-none"
              value={settings.timezone}
              onChange={(event) => updateSettings({ timezone: event.target.value })}
            >
              <option value="Asia/Shanghai">Asia/Shanghai</option>
              <option value="Asia/Tokyo">Asia/Tokyo</option>
              <option value="America/Los_Angeles">America/Los_Angeles</option>
            </select>
          </ItemRow>

          <ItemRow title="暗色模式">
            <div className="flex bg-muted p-1 rounded-xl">
              {[
                { value: "light" as const, label: "浅色" },
                { value: "dark" as const, label: "暗色" },
                { value: "system" as const, label: "系统" },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setThemeMode(item.value)}
                  className={cn(
                    "rounded-lg px-4 py-1.5 text-sm transition-colors",
                    settings.themeMode === item.value
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </ItemRow>

          <ItemRow title="主题配色">
            <div className="flex gap-2">
              {["默认蓝", "海盐白", "石墨灰"].map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => updateSettings({ accentTheme: item })}
                  className={cn(
                    "rounded-md border px-3 py-1.5 text-xs transition-colors",
                    settings.accentTheme === item
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-background text-muted-foreground hover:bg-muted"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </ItemRow>

          <ItemRow title="侧边栏树状图" description="控制侧边栏文件夹树是否默认展开显示。">
            <Switch
              checked={settings.showSidebarTree}
              onCheckedChange={(checked) => updateSettings({ showSidebarTree: checked })}
            />
          </ItemRow>
        </div>
      </SectionCard>
    </div>
  )
}

export function SettingsBuckets() {
  const { buckets, renameBucket, activeBucket, setActiveBucket, addBucket } = useAppState()
  const [sheetOpen, setSheetOpen] = React.useState(false)
  const [step, setStep] = React.useState(1)
  const [draft, setDraft] = React.useState<BucketWizardDraft>(initialBucketWizard)

  const resetWizard = () => {
    setStep(1)
    setDraft(initialBucketWizard)
  }

  const handleFinish = () => {
    addBucket({
      provider: draft.provider,
      bucket: draft.bucket,
      region: draft.region,
      endpoint: draft.endpoint,
      basePrefix: draft.basePrefix,
      secretId: draft.secretId,
      secretKey: draft.secretKey,
      multipartThreshold: draft.multipartThreshold,
      partSize: draft.partSize,
      presignTtl: draft.presignTtl,
      concurrency: draft.concurrency,
      corsConfigured: draft.corsConfigured,
    })
    setSheetOpen(false)
    resetWizard()
  }

  return (
    <div className="space-y-6">
      <SectionCard
        icon={<IconDatabasePlus size={18} />}
        title="存储桶管理"
        description="默认存在本机 local 存储；新建存储桶将按 5 个步骤完成挂载配置。"
        action={
          <Button onClick={() => setSheetOpen(true)}>
            <IconDatabasePlus size={16} />
            新建存储桶
          </Button>
        }
      >
        <div className="grid gap-4 xl:grid-cols-2">
          {buckets.map((bucket) => (
            <div
              key={bucket.id}
              className={cn(
                "rounded-2xl border p-4 transition-colors",
                activeBucket.id === bucket.id
                  ? "border-primary/50 bg-primary/5"
                  : "border-border/60 bg-background"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => setActiveBucket(bucket.id)}
                    className="text-left text-base font-semibold text-foreground"
                  >
                    {bucket.name}
                  </button>
                  <div className="text-sm text-muted-foreground">
                    {bucket.provider} · {bucket.region || "本机"}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2 py-1 text-xs font-medium",
                    bucket.corsStatus === "healthy"
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  )}
                >
                  {bucket.corsStatus === "healthy" ? "CORS 正常" : "存在风险"}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                <Field label="显示名称">
                  <Input
                    className={inputClassName}
                    value={bucket.name}
                    onChange={(event) => renameBucket(bucket.id, event.target.value)}
                  />
                </Field>
                <div className="grid gap-2 text-sm text-muted-foreground">
                  <div>Bucket：{bucket.bucket || "local"}</div>
                  <div>Base Prefix：{bucket.basePrefix || "/"}</div>
                  <div>策略：{bucket.strategy.multipartThreshold} / {bucket.strategy.partSize} / TTL {bucket.strategy.presignTtl}</div>
                  <div>{bucket.corsMessage}</div>
                </div>
                <div className="flex gap-2 justify-end mt-2">
                  <Button variant="outline" size="sm">修改配置</Button>
                  <Button variant="destructive" size="sm">删除存储桶</Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Sheet open={sheetOpen} onOpenChange={(open) => {
        setSheetOpen(open)
        if (!open) {
          resetWizard()
        }
      }}>
        <SheetContent side="right" className="w-full gap-0 border-l border-border/60 sm:max-w-3xl">
          <SheetHeader className="border-b border-border/60">
            <SheetTitle>新增存储桶</SheetTitle>
            <SheetDescription>按 Step 1-5 完成腾讯云存储挂载配置。</SheetDescription>
          </SheetHeader>

          <div className="flex flex-1 flex-col overflow-y-auto p-4">
            <WizardProgress step={step} />

            <div className="mt-6 space-y-4">
              {step === 1 ? (
                <Field label="提供商">
                  <div className="rounded-2xl border border-primary/50 bg-primary/5 p-4">
                    <div className="font-medium">腾讯云 COS</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      当前版本默认支持腾讯云，后续可扩展更多 provider。
                    </div>
                  </div>
                </Field>
              ) : null}

              {step === 2 ? (
                <>
                  <Field label="Bucket">
                    <Input className={inputClassName} value={draft.bucket} onChange={(event) => setDraft((current) => ({ ...current, bucket: event.target.value }))} />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Region">
                      <Input className={inputClassName} value={draft.region} onChange={(event) => setDraft((current) => ({ ...current, region: event.target.value }))} />
                    </Field>
                    <Field label="Endpoint（可选）">
                      <Input className={inputClassName} value={draft.endpoint} onChange={(event) => setDraft((current) => ({ ...current, endpoint: event.target.value }))} />
                    </Field>
                  </div>
                  <Field label="Base Prefix">
                    <Input className={inputClassName} value={draft.basePrefix} onChange={(event) => setDraft((current) => ({ ...current, basePrefix: event.target.value }))} />
                  </Field>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="SecretId">
                      <Input className={inputClassName} value={draft.secretId} onChange={(event) => setDraft((current) => ({ ...current, secretId: event.target.value }))} />
                    </Field>
                    <Field label="SecretKey">
                      <Input className={inputClassName} type="password" value={draft.secretKey} onChange={(event) => setDraft((current) => ({ ...current, secretKey: event.target.value }))} />
                    </Field>
                  </div>
                </>
              ) : null}

              {step === 3 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="multipart_threshold">
                    <Input className={inputClassName} value={draft.multipartThreshold} onChange={(event) => setDraft((current) => ({ ...current, multipartThreshold: event.target.value }))} />
                  </Field>
                  <Field label="part_size">
                    <Input className={inputClassName} value={draft.partSize} onChange={(event) => setDraft((current) => ({ ...current, partSize: event.target.value }))} />
                  </Field>
                  <Field label="presign_ttl">
                    <Input className={inputClassName} value={draft.presignTtl} onChange={(event) => setDraft((current) => ({ ...current, presignTtl: event.target.value }))} />
                  </Field>
                  <Field label="客户端并发数">
                    <Input className={inputClassName} type="number" value={String(draft.concurrency)} onChange={(event) => setDraft((current) => ({ ...current, concurrency: Number(event.target.value) || 1 }))} />
                  </Field>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="font-medium">CORS 检测</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      模拟调用 <code>GET /mounts/{"{id}"}/cors</code> 检测当前 bucket 的跨域策略。
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setDraft((current) => ({ ...current, corsChecked: true }))}
                    >
                      执行检测
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setDraft((current) => ({ ...current, corsChecked: true, corsConfigured: true }))}
                    >
                      一键配置
                    </Button>
                  </div>
                  {draft.corsChecked ? (
                    <div
                      className={cn(
                        "rounded-2xl border p-4 text-sm",
                        draft.corsConfigured
                          ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                          : "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300"
                      )}
                    >
                      {draft.corsConfigured
                        ? "CORS 已修复，允许预签名链接与静态资源访问。"
                        : "检测到未配置或不匹配项，继续创建会提示风险。"}
                    </div>
                  ) : null}
                </div>
              ) : null}

              {step === 5 ? (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
                    <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                      <IconCheck size={18} className="text-emerald-500" />
                      完成
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      创建后会自动生成 mount root 目录节点，并切换到新 bucket。
                    </div>
                  </div>
                  <div className="grid gap-2 rounded-2xl border border-border/60 bg-background p-4 text-sm text-muted-foreground">
                    <div>Provider：{draft.provider}</div>
                    <div>Bucket：{draft.bucket}</div>
                    <div>Region：{draft.region}</div>
                    <div>Base Prefix：{draft.basePrefix}</div>
                    <div>CORS：{draft.corsConfigured ? "已匹配" : "存在风险"}</div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <SheetFooter className="border-t border-border/60">
            <div className="flex w-full items-center justify-between gap-3">
              <Button variant="outline" onClick={() => (step === 1 ? setSheetOpen(false) : setStep((current) => current - 1))}>
                {step === 1 ? "取消" : "上一步"}
              </Button>
              <Button
                onClick={() => (step === 5 ? handleFinish() : setStep((current) => current + 1))}
                disabled={step === 2 && (!draft.bucket || !draft.region || !draft.secretId || !draft.secretKey)}
              >
                {step === 5 ? "完成并创建" : "下一步"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  )
}

function SectionCard({
  title,
  description,
  icon,
  action,
  children,
}: {
  title: string
  description: string
  icon?: React.ReactNode
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border/60 bg-background p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-base font-semibold text-foreground">
            {icon}
            {title}
          </div>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-5 space-y-5">{children}</div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  )
}

function InfoStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-muted/30 p-4">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 text-sm font-medium text-foreground">{value}</div>
    </div>
  )
}

function PlaceholderSecurityCard({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action: string
}) {
  return (
    <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 p-4">
      <div className="flex items-center gap-2 text-base font-medium">
        <IconKey size={18} />
        {title}
      </div>
      <div className="mt-1 text-sm text-muted-foreground">{description}</div>
      <div className="mt-4 inline-flex rounded-full bg-background px-3 py-1 text-xs font-medium text-muted-foreground">
        {action}
      </div>
    </div>
  )
}

function WizardProgress({ step }: { step: number }) {
  const items = ["选择提供商", "连接参数", "策略参数", "CORS 检测", "完成创建"]
  return (
    <div className="grid gap-2 md:grid-cols-5">
      {items.map((item, index) => {
        const current = index + 1
        const active = current === step
        const completed = current < step
        return (
          <div
            key={item}
            className={cn(
              "flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm",
              active
                ? "border-primary/50 bg-primary/5 text-foreground"
                : completed
                  ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300"
                  : "border-border/60 bg-background text-muted-foreground"
            )}
          >
            <span className="inline-flex size-6 items-center justify-center rounded-full bg-background text-xs font-semibold">
              {completed ? <IconCheck size={14} /> : current}
            </span>
            <span className="truncate">{item}</span>
            {active ? <IconChevronRight size={14} className="ml-auto" /> : null}
          </div>
        )
      })}
    </div>
  )
}
