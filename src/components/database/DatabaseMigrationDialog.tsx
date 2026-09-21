import * as React from "react"
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Database,
  Download,
  LoaderCircle,
  RefreshCw,
  Server,
} from "lucide-react"
import { toast } from "sonner"

import { currentMigrationFromStatus, wizardStepFromStatus, type WizardStep } from "@/components/database/migrationState"
import {
  downloadDatabaseBackup,
  getDatabaseMigration,
  getDatabaseStatus,
  startDatabaseMigration,
  testDatabaseConnection,
  updateDatabaseConfig,
  type DatabaseBackend,
  type DatabaseConfigInput,
  type DatabaseConnection,
  type DatabaseDataChoice,
  type DatabaseMigration,
  type DatabaseStatus,
} from "@/api/database"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const backendLabels: Record<DatabaseBackend, string> = {
  sqlite: "SQLite",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
}

const activePhases = new Set(["queued", "connecting", "inventory", "backup", "schema", "copying", "verifying"])

type FormState = {
  backend: DatabaseBackend
  host: string
  port: string
  user: string
  password: string
  name: string
  sqlitePath: string
}

const stepTitles = ["连接", "选择数据", "确认", "迁移"] as const

export function DatabaseMigrationDialog({
  open,
  onOpenChange,
  initialStatus,
  onStatusChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  initialStatus?: DatabaseStatus | null
  onStatusChange?: (status: DatabaseStatus) => void
}) {
  const [status, setStatus] = React.useState<DatabaseStatus | null>(initialStatus ?? null)
  const [form, setForm] = React.useState<FormState>(() => formFromStatus(initialStatus))
  const [connection, setConnection] = React.useState<DatabaseConnection | null>(initialStatus?.target ?? null)
  const [migration, setMigration] = React.useState<DatabaseMigration | null>(() => currentMigrationFromStatus(initialStatus))
  const [choice, setChoice] = React.useState<DatabaseDataChoice>("source")
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [confirmation, setConfirmation] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [step, setStep] = React.useState<WizardStep>(() => wizardStepFromStatus(initialStatus))
  const lastLogSeq = React.useRef(0)

  const publishStatus = React.useCallback((next: DatabaseStatus) => {
    setStatus(next)
    onStatusChange?.(next)
  }, [onStatusChange])

  const refreshStatus = React.useCallback(async (signal?: AbortSignal) => {
    const next = await getDatabaseStatus(0, signal)
    publishStatus(next)
    const current = currentMigrationFromStatus(next)
    lastLogSeq.current = current?.logs.at(-1)?.seq ?? 0
    setMigration(current)
    setStep(wizardStepFromStatus(next))
    if (next.switch_pending) {
      setConnection(next.target)
    }
    return next
  }, [publishStatus])

  React.useEffect(() => {
    if (!open) return
    if (initialStatus) {
      const current = currentMigrationFromStatus(initialStatus)
      setStatus(initialStatus)
      setMigration(current)
      lastLogSeq.current = current?.logs.at(-1)?.seq ?? 0
      setConnection(initialStatus.switch_pending ? initialStatus.target : null)
      setForm(formFromStatus(initialStatus))
      setStep(wizardStepFromStatus(initialStatus))
      return
    }
    const controller = new AbortController()
    void refreshStatus(controller.signal)
      .then((next) => {
        setForm(formFromStatus(next))
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) setError(errorMessage(reason))
      })
    return () => controller.abort()
  }, [open, refreshStatus])

  React.useEffect(() => {
    if (!open || !migration || !activePhases.has(migration.phase)) return
    let cancelled = false
    const poll = async () => {
      try {
        const next = await getDatabaseMigration(migration.id, lastLogSeq.current)
        if (cancelled) return
        lastLogSeq.current = next.logs.at(-1)?.seq ?? lastLogSeq.current
        setMigration((previous) => ({
          ...next,
          logs: [...(previous?.logs ?? []), ...next.logs].filter(
            (item, index, all) => all.findIndex((entry) => entry.seq === item.seq) === index
          ),
        }))
        if (!activePhases.has(next.phase)) await refreshStatus()
      } catch (reason) {
        if (!cancelled) setError(errorMessage(reason))
      }
    }
    const timer = window.setInterval(() => void poll(), 1000)
    void poll()
    return () => {
      cancelled = true
      window.clearInterval(timer)
    }
  }, [migration?.id, migration?.phase, open, refreshStatus])

  React.useEffect(() => {
    if (
      connection?.reachable &&
      (!hasTargetUsers(connection) || !instancesAreCompatible(status?.source, connection)) &&
      choice === "target"
    ) {
      setChoice("source")
    }
  }, [choice, connection, status?.source])

  const input = React.useMemo(() => formToInput(form), [form])
  const selectedProfile = status?.profiles.find((item) => item.backend === form.backend)
  const running = Boolean(migration && activePhases.has(migration.phase))
  const ready = Boolean(
    status?.activation_pending ||
      (status?.switch_pending && migration?.phase === "ready" && migration.restart_required)
  )
  const targetName = confirmationName(
    status?.switch_pending ? status.requested.backend : form.backend,
    status?.switch_pending ? status.requested.name : form.backend === "sqlite" ? form.sqlitePath : form.name
  )
  const targetCanBeAdopted = connection
    ? hasTargetUsers(connection) && instancesAreCompatible(status?.source, connection)
    : false
  const canStart = Boolean(
    status?.switch_pending &&
      connection?.reachable &&
      currentPassword &&
      confirmation.trim() === targetName &&
      !running &&
      !ready
  )

  const saveAndTest = async () => {
    setBusy(true)
    setError(null)
    try {
      const tested = await testDatabaseConnection(input)
      setConnection(tested)
      if (!tested.reachable) {
        setError(tested.error || "无法连接目标数据库")
        return
      }
      await updateDatabaseConfig(input)
      const next = await refreshStatus()
      setForm(formFromStatus(next))
      if (next.target) {
        setConnection({ ...next.target, database_created: tested.database_created })
      }
      setStep(2)
      if (form.backend === "sqlite") {
        toast.success("SQLite 数据库连接测试通过，配置已保存")
      } else if (tested.database_created) {
        toast.success(`已自动创建数据库 ${form.name}，连接测试通过`)
      } else {
        toast.success(`数据库 ${form.name} 已存在，连接测试通过`)
      }
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const beginMigration = async () => {
    setBusy(true)
    setError(null)
    try {
      const next = await startDatabaseMigration({
        data_choice: choice,
        current_password: currentPassword,
        confirmation: confirmation.trim(),
      })
      lastLogSeq.current = next.logs.at(-1)?.seq ?? 0
      setMigration(next)
      setCurrentPassword("")
      setStep(4)
      toast.success("数据库迁移任务已启动")
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const downloadBackup = async () => {
    if (!migration) return
    try {
      await downloadDatabaseBackup(migration)
    } catch (reason) {
      setError(errorMessage(reason))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="grid max-h-[92dvh] w-[min(96vw,68rem)] max-w-none grid-rows-[auto_auto_minmax(0,1fr)_auto] gap-0 overflow-hidden p-0 sm:max-w-none">
        <DialogHeader className="border-b px-5 py-4 text-left sm:px-6">
          <DialogTitle>数据库切换与迁移</DialogTitle>
          <DialogDescription>
            配置目标数据库、选择保留哪一侧的数据，完成后手动重启后端激活。
          </DialogDescription>
        </DialogHeader>

        <WizardSteps current={step} />

        <ScrollArea className="min-h-0">
          <div className="space-y-7 px-5 py-5 sm:px-6">
            {status?.managed_by !== "config" ? (
              <Notice tone="warning">
                {status?.warning || "数据库连接正由外部 URL 管理。请移除覆盖项后再使用切换向导。"}
              </Notice>
            ) : null}

            {step === 1 ? <section aria-labelledby="database-target-heading" className="space-y-4">
              <SectionHeading index="1" id="database-target-heading" title="连接目标数据库" />
              <div className="flex flex-wrap items-center gap-3 rounded-lg bg-muted/45 px-4 py-3 text-sm">
                <Database className="size-4 text-muted-foreground" />
                <span>{backendLabels[status?.active.backend ?? "sqlite"]}</span>
                <ArrowRight className="size-4 text-muted-foreground" />
                <span className="font-medium">{backendLabels[form.backend]}</span>
                {connection ? <ConnectionBadge connection={connection} /> : null}
              </div>

              <FieldGroup className="grid gap-4 md:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="database-backend">数据库类型</FieldLabel>
                  <Select
                    value={form.backend}
                    disabled={!status?.editable || running || ready}
                    onValueChange={(value) => {
                      const backend = value as DatabaseBackend
                      const profile = status?.profiles.find((item) => item.backend === backend)
                      setForm(formFromProfile(profile ?? defaultProfile(backend)))
                      setConnection(null)
                    }}
                  >
                    <SelectTrigger id="database-backend" className="w-full"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sqlite">SQLite</SelectItem>
                      <SelectItem value="mysql">MySQL</SelectItem>
                      <SelectItem value="postgresql">PostgreSQL</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>

                {form.backend === "sqlite" ? (
                  <Field>
                    <FieldLabel htmlFor="database-sqlite-path">SQLite 文件路径</FieldLabel>
                    <Input id="database-sqlite-path" value={form.sqlitePath} disabled={!status?.editable || running || ready} onChange={(event) => setForm({ ...form, sqlitePath: event.target.value })} />
                  </Field>
                ) : (
                  <>
                    <Field>
                      <FieldLabel htmlFor="database-host">主机</FieldLabel>
                      <Input id="database-host" value={form.host} disabled={!status?.editable || running || ready} onChange={(event) => setForm({ ...form, host: event.target.value })} placeholder="127.0.0.1" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="database-port">端口</FieldLabel>
                      <Input id="database-port" type="number" min={1} max={65535} value={form.port} disabled={!status?.editable || running || ready} onChange={(event) => setForm({ ...form, port: event.target.value })} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="database-name">数据库名</FieldLabel>
                      <Input id="database-name" value={form.name} disabled={!status?.editable || running || ready} onChange={(event) => setForm({ ...form, name: event.target.value })} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="database-user">用户名</FieldLabel>
                      <Input id="database-user" value={form.user} disabled={!status?.editable || running || ready} onChange={(event) => setForm({ ...form, user: event.target.value })} />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="database-password">密码</FieldLabel>
                      <Input id="database-password" type="password" value={form.password} disabled={!status?.editable || running || ready} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder={selectedProfile?.password_configured ? "留空保留现有密码" : "输入数据库密码"} autoComplete="new-password" />
                    </Field>
                  </>
                )}
              </FieldGroup>

              {connection?.reachable && form.backend !== "sqlite" ? (
                <Notice tone="success">
                  {connection.database_created
                    ? `目标数据库“${form.name}”已由 Cloudrave 自动创建。`
                    : `目标数据库“${form.name}”已存在；连接测试不会覆盖其中的数据，下一步将展示数据情况。`}
                </Notice>
              ) : null}

            </section> : null}

            {step === 2 && status?.switch_pending && connection?.reachable ? (
              <section aria-labelledby="database-data-heading" className="space-y-4">
                <SectionHeading index="2" id="database-data-heading" title="选择要保留的数据" />
                <div className="grid gap-px overflow-hidden rounded-lg border bg-border md:grid-cols-2">
                  <DataSummary title="当前数据库" backend={status.active.backend} summary={status.source?.summary} />
                  <DataSummary title="目标数据库" backend={status.requested.backend} summary={connection.summary} />
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <ChoiceButton checked={choice === "source"} onClick={() => setChoice("source")} title="迁移并保留当前库数据">
                    复制全部数据库记录到目标库。{connection.summary.has_data ? "目标库中的 Cloudrave 数据会先备份，再被替换。" : "目标库当前为空。"}
                  </ChoiceButton>
                  <ChoiceButton checked={choice === "target"} disabled={!targetCanBeAdopted} onClick={() => setChoice("target")} title="不迁移，保留目标库数据">
                    不修改两边数据，重启后直接使用目标库。仅适用于这个 Cloudrave 实例曾使用过的数据库。
                  </ChoiceButton>
                </div>
              </section>
            ) : null}

            {step === 3 && status?.switch_pending && connection?.reachable && !running && !ready ? (
              <section aria-labelledby="database-confirm-heading" className="space-y-4">
                <SectionHeading index="3" id="database-confirm-heading" title="确认切换" />
                <Notice tone={choice === "source" && connection.summary.has_data ? "warning" : "neutral"}>
                  原数据库不会被删除。数据库迁移只复制元数据，不复制本地文件或对象存储中的物理文件。
                </Notice>
                <FieldGroup className="grid gap-4 md:grid-cols-2">
                  <Field>
                    <FieldLabel htmlFor="database-current-password">管理员当前密码</FieldLabel>
                    <Input id="database-current-password" type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="database-confirm-name">输入目标数据库名以确认</FieldLabel>
                    <Input id="database-confirm-name" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder={targetName} />
                    <FieldDescription>请输入：<span className="font-mono text-foreground">{targetName}</span></FieldDescription>
                  </Field>
                </FieldGroup>
              </section>
            ) : null}

            {step === 4 && migration && (running || migration.phase === "failed" || ready) ? (
              <section aria-labelledby="database-progress-heading" className="space-y-4">
                <SectionHeading index="4" id="database-progress-heading" title="迁移进度与日志" />
                <MigrationProgress migration={migration} />
                {migration.phase === "failed" ? (
                  <Notice tone="danger">迁移失败：{publicMigrationMessage(migration.error || migration.detail, migration.current_table)}。当前数据库仍在使用，可修正配置后重试。</Notice>
                ) : null}
                {ready ? (
                  <Notice tone="success">
                    数据已准备完成。请手动重启 Cloudrave 后端服务；重启成功前页面不会显示为已切换。
                  </Notice>
                ) : null}
                <MigrationLogs migration={migration} />
                <div className="flex flex-wrap gap-2">
                  {migration.backup_available ? (
                    <Button variant="outline" onClick={() => void downloadBackup()}><Download />下载目标库备份</Button>
                  ) : null}
                  {migration.phase === "failed" ? <Button variant="outline" onClick={() => void refreshStatus()}><RefreshCw />刷新状态</Button> : null}
                </div>
              </section>
            ) : null}

            {step === 4 && !migration ? (
              <section aria-labelledby="database-progress-heading" className="flex flex-col gap-4">
                <SectionHeading index="4" id="database-progress-heading" title="迁移状态" />
                <Notice tone="neutral">
                  {status?.activation_pending
                    ? "迁移数据已准备完成，请手动重启后端以激活目标数据库。"
                    : "当前切换尚未启动迁移。历史任务可在系统设置的迁移记录中查看。"}
                </Notice>
                {!status?.activation_pending ? (
                  <Button variant="outline" className="self-start" onClick={() => setStep(status?.switch_pending && connection?.reachable ? 2 : 1)}>
                    返回迁移步骤
                  </Button>
                ) : null}
              </section>
            ) : null}

            {error ? <Notice tone="danger">{error}</Notice> : null}
          </div>
        </ScrollArea>

        <DialogFooter className="flex-row flex-wrap items-center border-t px-5 py-3 sm:px-6">
          <p className="mr-auto hidden text-xs text-muted-foreground sm:block">
            {step === 4 ? "迁移进行中可关闭窗口，任务会继续在后台运行。" : `步骤 ${step} / 4`}
          </p>
          {step > 1 && step < 4 ? (
            <Button variant="outline" disabled={busy} onClick={() => { setError(null); setStep((step - 1) as WizardStep) }}>上一步</Button>
          ) : null}
          {step === 4 && migration?.phase === "failed" ? (
            <Button variant="outline" onClick={() => { setError(null); setStep(3) }}>返回确认</Button>
          ) : null}
          <Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button>
          {step === 1 && !running && !ready ? (
            <Button disabled={busy || !status?.editable || form.backend === status?.active.backend} onClick={() => void saveAndTest()}>
              {busy ? <LoaderCircle className="animate-spin" /> : <Server />}
              测试并下一步
            </Button>
          ) : null}
          {step === 2 ? (
            <Button disabled={!connection?.reachable} onClick={() => { setError(null); setStep(3) }}>下一步</Button>
          ) : null}
          {step === 3 ? (
            <Button disabled={!canStart || busy} onClick={() => void beginMigration()}>
              {busy ? <LoaderCircle className="animate-spin" /> : null}
              {choice === "source" ? "开始迁移" : "确认使用目标数据"}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function WizardSteps({ current }: { current: WizardStep }) {
  return <nav aria-label="数据库迁移步骤" className="border-b bg-muted/20 px-5 py-3 sm:px-6">
    <ol className="grid grid-cols-4 gap-2">
      {stepTitles.map((title, index) => {
        const number = (index + 1) as WizardStep
        const active = number === current
        const complete = number < current
        return <li key={title} aria-current={active ? "step" : undefined} className={cn("flex min-w-0 items-center gap-2 text-xs", active ? "font-medium text-foreground" : "text-muted-foreground")}>
          <span className={cn("flex size-5 shrink-0 items-center justify-center rounded-full border text-[11px]", active && "border-foreground bg-foreground text-background", complete && "border-emerald-600 bg-emerald-600 text-white")}>
            {complete ? <CheckCircle2 className="size-3.5" /> : number}
          </span>
          <span className="truncate">{title}</span>
        </li>
      })}
    </ol>
  </nav>
}

function SectionHeading({ index, id, title }: { index: string; id: string; title: string }) {
  return <div className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-full bg-foreground text-xs font-semibold text-background">{index}</span><h2 id={id} className="text-sm font-semibold">{title}</h2></div>
}

function Notice({ tone, children }: { tone: "neutral" | "warning" | "danger" | "success"; children: React.ReactNode }) {
  return <div role={tone === "danger" ? "alert" : undefined} className={cn("flex gap-2 rounded-lg border px-3 py-2.5 text-sm leading-6", tone === "neutral" && "bg-muted/30", tone === "warning" && "border-amber-500/35 bg-amber-500/10 text-amber-900 dark:text-amber-200", tone === "danger" && "border-destructive/35 bg-destructive/10 text-destructive", tone === "success" && "border-emerald-500/35 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200")}>
    {tone === "warning" || tone === "danger" ? <AlertTriangle className="mt-1 size-4 shrink-0" /> : tone === "success" ? <CheckCircle2 className="mt-1 size-4 shrink-0" /> : null}
    <div>{children}</div>
  </div>
}

function ConnectionBadge({ connection }: { connection: DatabaseConnection }) {
  const databaseState = connection.backend === "sqlite"
    ? ""
    : connection.database_created
      ? " · 已自动创建"
      : " · 数据库已存在"
  return <span className={cn("ml-auto inline-flex items-center gap-1 text-xs", connection.reachable ? "text-emerald-700 dark:text-emerald-300" : "text-destructive")}>
    {connection.reachable ? <CheckCircle2 className="size-3.5" /> : <AlertTriangle className="size-3.5" />}
    {connection.reachable ? `连接正常${connection.server_version ? ` · ${connection.server_version}` : ""}${databaseState}` : "连接失败"}
  </span>
}

function DataSummary({ title, backend, summary }: { title: string; backend: DatabaseBackend; summary?: DatabaseConnection["summary"] }) {
  return <div className="bg-background p-4"><p className="text-xs text-muted-foreground">{title}</p><p className="mt-1 text-sm font-medium">{backendLabels[backend]}</p><p className="mt-3 text-2xl font-semibold tabular-nums">{summary?.total_rows ?? 0}</p><p className="text-xs text-muted-foreground">条数据库记录 · {summary?.tables.length ?? 0} 张表</p><div className="mt-3 max-h-40 space-y-1 overflow-y-auto border-t pt-2 text-xs">{summary?.tables.map((item) => <div key={item.table} className="flex items-center justify-between gap-3"><span className="truncate font-mono text-muted-foreground">{item.table}</span><span className="tabular-nums">{item.rows.toLocaleString()}</span></div>)}</div></div>
}

function ChoiceButton({ checked, disabled = false, onClick, title, children }: { checked: boolean; disabled?: boolean; onClick: () => void; title: string; children: React.ReactNode }) {
  return <button type="button" role="radio" aria-checked={checked} disabled={disabled} onClick={onClick} className={cn("rounded-lg border p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50", checked ? "border-primary bg-primary/5" : "hover:bg-muted/40")}><span className="flex items-center gap-2 text-sm font-medium"><span className={cn("size-3.5 rounded-full border-4", checked ? "border-primary" : "border-muted-foreground/40")} />{title}</span><span className="mt-2 block text-xs leading-5 text-muted-foreground">{children}{disabled ? "（目标库暂无可接管用户，或属于另一实例。）" : null}</span></button>
}

function MigrationProgress({ migration }: { migration: DatabaseMigration }) {
  return <div className="space-y-2"><div className="flex items-center justify-between gap-3 text-sm"><span className="flex min-w-0 items-center gap-2">{activePhases.has(migration.phase) ? <LoaderCircle className="size-4 shrink-0 animate-spin" /> : migration.phase === "ready" ? <CheckCircle2 className="size-4 shrink-0 text-emerald-600" /> : <AlertTriangle className="size-4 shrink-0 text-destructive" />}<span className="truncate">{migration.detail}</span></span><span className="font-mono tabular-nums">{migration.progress}%</span></div><div className="h-2 overflow-hidden rounded-full bg-muted"><div className={cn("h-full transition-[width]", migration.phase === "failed" ? "bg-destructive" : "bg-primary")} style={{ width: `${migration.progress}%` }} /></div><p className="text-xs text-muted-foreground">{migration.phase !== "failed" && migration.current_table ? `当前表：${migration.current_table} · ` : ""}{migration.processed_rows.toLocaleString()} / {migration.total_rows.toLocaleString()} 行</p></div>
}

function MigrationLogs({ migration }: { migration: DatabaseMigration }) {
  const container = React.useRef<HTMLDivElement>(null)
  React.useEffect(() => {
    const viewport = container.current?.querySelector("[data-radix-scroll-area-viewport]")
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [migration.logs.length])
  return <ScrollArea ref={container} className="h-52 rounded-lg border bg-zinc-950"><div className="space-y-1 p-3 font-mono text-xs leading-5 text-zinc-300" aria-live="polite">{migration.logs.length ? migration.logs.map((entry) => <div key={entry.seq} className={cn(entry.level === "error" && "text-red-300", entry.level === "warning" && "text-amber-300")}><span className="text-zinc-500">{new Date(entry.timestamp).toLocaleTimeString()} </span>{publicMigrationMessage(entry.message, migration.current_table)}</div>) : <div className="text-zinc-500">等待日志…</div>}</div></ScrollArea>
}

function formFromStatus(status?: DatabaseStatus | null): FormState {
  return formFromProfile(status?.requested ?? defaultProfile("mysql"))
}

function formFromProfile(profile: DatabaseStatus["requested"]): FormState {
  return {
    backend: profile.backend,
    host: profile.host ?? "127.0.0.1",
    port: profile.port ? String(profile.port) : profile.backend === "postgresql" ? "5432" : "3306",
    user: profile.user ?? "cloudrave",
    password: "",
    name: profile.name || "cloudrave",
    sqlitePath: profile.backend === "sqlite" ? profile.name : "data/cloudrave.db",
  }
}

function defaultProfile(backend: DatabaseBackend): DatabaseStatus["requested"] {
  return {
    backend,
    host: backend === "sqlite" ? null : "127.0.0.1",
    port: backend === "mysql" ? 3306 : backend === "postgresql" ? 5432 : null,
    user: backend === "mysql" ? "root" : backend === "postgresql" ? "postgres" : null,
    name: backend === "sqlite" ? "data/cloudrave.db" : "cloudrave",
    password_configured: false,
  }
}

function formToInput(form: FormState): DatabaseConfigInput {
  if (form.backend === "sqlite") return { backend: "sqlite", sqlite_path: form.sqlitePath.trim() }
  return { backend: form.backend, host: form.host.trim(), port: Number(form.port), user: form.user.trim(), password: form.password || null, name: form.name.trim() }
}

function errorMessage(reason: unknown) {
  return reason instanceof Error ? reason.message : "操作失败，请稍后重试"
}

function confirmationName(backend: DatabaseBackend, name: string) {
  if (backend !== "sqlite") return name
  return name.split(/[\\/]/).filter(Boolean).at(-1) || name
}

function hasTargetUsers(connection: DatabaseConnection) {
  return (connection.summary.tables.find((item) => item.table === "users")?.rows ?? 0) > 0
}

function instancesAreCompatible(source: DatabaseConnection | null | undefined, target: DatabaseConnection) {
  return !source?.instance_id || !target.instance_id || source.instance_id === target.instance_id
}

function publicMigrationMessage(message: string, table: string | null) {
  const tableHint = table ? `（表：${table}）` : ""
  if (/data too long|string data right truncation/i.test(message)) {
    return `目标数据库字段长度不足${tableHint}，目标事务已回滚；请升级数据库结构后重试`
  }
  if (/\[SQL:|\[parameters:/i.test(message)) {
    return `写入目标数据库失败${tableHint}，目标事务已回滚；原数据库仍在使用`
  }
  return message
}
