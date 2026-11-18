import * as React from "react"
import {
  ArrowLeft,
  ArrowRight,
  Download,
  Loader2,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

import {
  currentMigrationFromStatus,
  wizardStepFromStatus,
  type WizardStep,
} from "@/components/database/migrationState"
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import "@/styles/slide-transition.css"

const backendLabels: Record<DatabaseBackend, string> = {
  sqlite: "SQLite",
  mysql: "MySQL",
  postgresql: "PostgreSQL",
}

const activePhases = new Set([
  "queued",
  "connecting",
  "inventory",
  "backup",
  "schema",
  "copying",
  "verifying",
])

type FormState = {
  backend: DatabaseBackend
  host: string
  port: string
  user: string
  password: string
  name: string
  sqlitePath: string
}

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
  const [connection, setConnection] = React.useState<DatabaseConnection | null>(
    initialStatus?.target ?? null
  )
  const [migration, setMigration] = React.useState<DatabaseMigration | null>(() =>
    currentMigrationFromStatus(initialStatus)
  )
  const [choice, setChoice] = React.useState<DatabaseDataChoice>("source")
  const [currentPassword, setCurrentPassword] = React.useState("")
  const [confirmation, setConfirmation] = React.useState("")
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [step, setStep] = React.useState<WizardStep>(() => wizardStepFromStatus(initialStatus))

  const [slideTransition, setSlideTransition] = React.useState<{
    isAnimating: boolean
    isGoingBack: boolean
    leavingStep: WizardStep
    enteringStep: WizardStep
  } | null>(null)
  const [containerHeight, setContainerHeight] = React.useState<number | "auto">("auto")
  const [enableHeightTransition, setEnableHeightTransition] = React.useState(false)
  const contentRef = React.useRef<HTMLDivElement>(null)
  const hasMeasuredHeight = React.useRef(false)
  const lastLogSeq = React.useRef(0)

  const changeStep = React.useCallback(
    (nextStep: WizardStep, goingBack = nextStep < step) => {
      if (step === nextStep || slideTransition?.isAnimating) return
      setError(null)
      setEnableHeightTransition(true)
      setSlideTransition({
        isAnimating: true,
        isGoingBack: goingBack,
        leavingStep: step,
        enteringStep: nextStep,
      })
      window.setTimeout(() => {
        setStep(nextStep)
        window.setTimeout(() => setSlideTransition(null), 50)
      }, 280)
    },
    [slideTransition?.isAnimating, step]
  )

  React.useLayoutEffect(() => {
    if (!open || !contentRef.current) return
    const content = contentRef.current

    const syncHeight = () => {
      const nextHeight = content.offsetHeight
      if (nextHeight > 0) {
        setContainerHeight(nextHeight)
        if (hasMeasuredHeight.current) {
          setEnableHeightTransition(true)
        }
        hasMeasuredHeight.current = true
      }
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(content)
    return () => observer.disconnect()
  }, [open, step, form.backend, error, migration?.phase, readyStateKey(status, migration)])

  React.useEffect(() => {
    if (!open) {
      hasMeasuredHeight.current = false
      setEnableHeightTransition(false)
      setContainerHeight("auto")
      setSlideTransition(null)
    }
  }, [open])

  const publishStatus = React.useCallback(
    (next: DatabaseStatus) => {
      setStatus(next)
      onStatusChange?.(next)
    },
    [onStatusChange]
  )

  const refreshStatus = React.useCallback(
    async (signal?: AbortSignal, syncWizardStep = true) => {
      const next = await getDatabaseStatus(0, signal)
      publishStatus(next)
      const current = currentMigrationFromStatus(next)
      lastLogSeq.current = current?.logs.at(-1)?.seq ?? 0
      setMigration(current)
      if (syncWizardStep) {
        setStep(wizardStepFromStatus(next))
      }
      if (next.switch_pending) {
        setConnection(next.target)
      }
      return next
    },
    [publishStatus]
  )

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
  }, [initialStatus, open, refreshStatus])

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
        if (!activePhases.has(next.phase)) await refreshStatus(undefined, false)
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
    status?.switch_pending
      ? status.requested.name
      : form.backend === "sqlite"
        ? form.sqlitePath
        : form.name
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

  const saveAndTest = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (busy || !status?.editable || form.backend === status?.active.backend) return
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
      const next = await refreshStatus(undefined, false)
      setForm(formFromStatus(next))
      if (next.target) {
        setConnection({ ...next.target, database_created: tested.database_created })
      }
      toast.success(tested.database_created ? `已创建并连接 ${form.name}` : "连接测试通过")
      changeStep(2, false)
    } catch (reason) {
      setError(errorMessage(reason))
    } finally {
      setBusy(false)
    }
  }

  const beginMigration = async (event?: React.FormEvent) => {
    event?.preventDefault()
    if (!canStart || busy) return
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
      changeStep(4, false)
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

  const activeBackend = status?.active.backend ?? "sqlite"
  const targetBackend = status?.switch_pending ? status.requested.backend : form.backend
  const sourceRows = status?.source?.summary.total_rows ?? 0
  const targetRows = connection?.summary.total_rows ?? 0

  const stepTitle =
    step === 1
      ? "连接目标数据库"
      : step === 2
        ? "选择数据保留方式"
        : step === 3
          ? "验证管理员身份"
          : ready
            ? "等待重启生效"
            : migration?.phase === "failed"
              ? "迁移未完成"
              : "正在迁移数据"

  const stepDescription =
    step === 1
      ? `当前为 ${backendLabels[activeBackend]}，选择要切换到的目标数据库`
      : step === 2
        ? `${backendLabels[activeBackend]} (${sourceRows.toLocaleString()} 行) → ${backendLabels[targetBackend]} (${targetRows.toLocaleString()} 行)`
        : step === 3
          ? `确认将数据库切换至 ${backendLabels[targetBackend]} (${targetName})`
          : `${backendLabels[activeBackend]} → ${backendLabels[targetBackend]}`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,29rem)] max-w-none gap-5 rounded-2xl border border-border bg-card p-6 text-card-foreground shadow-xl sm:max-w-none">
        <DialogHeader className="space-y-1 text-left">
          <div className="text-xs font-medium text-muted-foreground tabular-nums">
            步骤 {step} / 4
          </div>
          <DialogTitle className="text-xl font-semibold tracking-tight">
            {stepTitle}
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground">
            {stepDescription}
          </DialogDescription>
        </DialogHeader>

        <div
          className="slide-container"
          style={{
            height: containerHeight === "auto" ? "auto" : `${containerHeight + 6}px`,
            transition: enableHeightTransition
              ? "height 260ms cubic-bezier(0.4, 0, 0.2, 1)"
              : "none",
          }}
        >
          <div
            ref={contentRef}
            className={cn(
              "slide-phase space-y-4",
              slideTransition?.isAnimating &&
                !slideTransition.isGoingBack &&
                slideTransition.leavingStep === step &&
                "slide-exit slide-exit-active",
              slideTransition?.isAnimating &&
                !slideTransition.isGoingBack &&
                slideTransition.enteringStep === step &&
                "slide-enter slide-enter-active",
              slideTransition?.isAnimating &&
                slideTransition.isGoingBack &&
                slideTransition.leavingStep === step &&
                "slide-back-exit slide-back-exit-active",
              slideTransition?.isAnimating &&
                slideTransition.isGoingBack &&
                slideTransition.enteringStep === step &&
                "slide-back-enter slide-back-enter-active"
            )}
          >
            {status && status.managed_by !== "config" ? (
              <p className="rounded-lg bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
                {status.warning || "当前由外部配置接管，请先移除环境变量或 URL 覆盖。"}
              </p>
            ) : null}

            {/* Step 1: 连接目标数据库 */}
            {step === 1 ? (
              <form onSubmit={saveAndTest} className="space-y-4">
                <div className="grid grid-cols-3 gap-1 rounded-lg bg-muted p-1">
                  {(["sqlite", "mysql", "postgresql"] as DatabaseBackend[]).map((backend) => {
                    const selected = form.backend === backend
                    return (
                      <button
                        key={backend}
                        type="button"
                        disabled={!status?.editable || running || ready}
                        onClick={() => {
                          setEnableHeightTransition(true)
                          const profile = status?.profiles.find((item) => item.backend === backend)
                          setForm(formFromProfile(profile ?? defaultProfile(backend)))
                          setConnection(null)
                          setError(null)
                        }}
                        className={cn(
                          "h-8 rounded-md text-xs font-medium transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:opacity-50",
                          selected
                            ? "bg-card text-foreground shadow-xs"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {backendLabels[backend]}
                      </button>
                    )
                  })}
                </div>

                {form.backend === "sqlite" ? (
                  <FieldGroup>
                    <Field>
                      <FieldLabel htmlFor="database-sqlite-path">文件路径</FieldLabel>
                      <Input
                        id="database-sqlite-path"
                        className="w-full font-mono"
                        value={form.sqlitePath}
                        disabled={!status?.editable || running || ready}
                        onChange={(event) => setForm({ ...form, sqlitePath: event.target.value })}
                        placeholder="data/cloudrave.db"
                      />
                    </Field>
                  </FieldGroup>
                ) : (
                  <FieldGroup className="gap-3">
                    <div className="grid grid-cols-[minmax(0,1fr)_6.5rem] gap-3">
                      <Field>
                        <FieldLabel htmlFor="database-host">主机</FieldLabel>
                        <Input
                          id="database-host"
                          className="w-full"
                          value={form.host}
                          disabled={!status?.editable || running || ready}
                          onChange={(event) => setForm({ ...form, host: event.target.value })}
                          placeholder="127.0.0.1"
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="database-port">端口</FieldLabel>
                        <Input
                          id="database-port"
                          className="w-full tabular-nums"
                          type="number"
                          min={1}
                          max={65535}
                          value={form.port}
                          disabled={!status?.editable || running || ready}
                          onChange={(event) => setForm({ ...form, port: event.target.value })}
                        />
                      </Field>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <Field>
                        <FieldLabel htmlFor="database-name">数据库名</FieldLabel>
                        <Input
                          id="database-name"
                          className="w-full"
                          value={form.name}
                          disabled={!status?.editable || running || ready}
                          onChange={(event) => setForm({ ...form, name: event.target.value })}
                        />
                      </Field>
                      <Field>
                        <FieldLabel htmlFor="database-user">用户名</FieldLabel>
                        <Input
                          id="database-user"
                          className="w-full"
                          value={form.user}
                          disabled={!status?.editable || running || ready}
                          onChange={(event) => setForm({ ...form, user: event.target.value })}
                        />
                      </Field>
                    </div>

                    <Field>
                      <FieldLabel htmlFor="database-password">密码</FieldLabel>
                      <Input
                        id="database-password"
                        className="w-full"
                        type="password"
                        value={form.password}
                        disabled={!status?.editable || running || ready}
                        onChange={(event) => setForm({ ...form, password: event.target.value })}
                        placeholder={selectedProfile?.password_configured ? "留空保留现有密码" : "输入密码"}
                        autoComplete="new-password"
                      />
                    </Field>
                  </FieldGroup>
                )}

                {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

                <div className="flex items-center justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
                    取消
                  </Button>
                  <Button
                    type="submit"
                    disabled={busy || !status?.editable || form.backend === status?.active.backend}
                  >
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        连接中...
                      </>
                    ) : (
                      <>
                        下一步
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : null}

            {/* Step 2: 选择数据保留方式 */}
            {step === 2 ? (
              <div className="space-y-4">
                <div className="space-y-2.5" role="radiogroup" aria-label="数据保留方式">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={choice === "source"}
                    onClick={() => setChoice("source")}
                    className={cn(
                      "flex w-full flex-col rounded-xl border px-4 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                      choice === "source"
                        ? "border-primary bg-primary/[0.06]"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">迁移当前库数据</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {sourceRows.toLocaleString()} 行
                      </span>
                    </div>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {connection?.summary.has_data
                        ? "自动备份目标库旧数据，并将当前数据完整写入"
                        : "将当前全部记录复制到目标数据库"}
                    </span>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={choice === "target"}
                    disabled={!targetCanBeAdopted}
                    onClick={() => setChoice("target")}
                    className={cn(
                      "flex w-full flex-col rounded-xl border px-4 py-3.5 text-left transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-45",
                      choice === "target"
                        ? "border-primary bg-primary/[0.06]"
                        : "border-border hover:bg-muted/40"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-foreground">直接使用目标库数据</span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {targetRows.toLocaleString()} 行
                      </span>
                    </div>
                    <span className="mt-1 text-xs text-muted-foreground">
                      {targetCanBeAdopted
                        ? "不覆盖数据，重启后直接切换至目标数据库"
                        : "目标库为空或实例不兼容，不可直接启用"}
                    </span>
                  </button>
                </div>

                {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => changeStep(1, true)}
                  >
                    <ArrowLeft className="size-4" />
                    上一步
                  </Button>
                  <Button
                    type="button"
                    disabled={!connection?.reachable}
                    onClick={() => changeStep(3, false)}
                  >
                    下一步
                    <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            ) : null}

            {/* Step 3: 验证管理员身份 */}
            {step === 3 ? (
              <form onSubmit={beginMigration} className="space-y-4">
                <FieldGroup className="gap-3.5">
                  <Field>
                    <FieldLabel htmlFor="database-current-password">管理员密码</FieldLabel>
                    <Input
                      id="database-current-password"
                      className="w-full"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      placeholder="输入当前登录密码"
                      autoComplete="current-password"
                      autoFocus
                    />
                  </Field>

                  <Field>
                    <FieldLabel htmlFor="database-confirm-name">
                      输入目标库名 <span className="font-mono text-foreground">{targetName}</span> 确认
                    </FieldLabel>
                    <Input
                      id="database-confirm-name"
                      className="w-full font-mono"
                      value={confirmation}
                      onChange={(event) => setConfirmation(event.target.value)}
                      placeholder={targetName}
                    />
                  </Field>
                </FieldGroup>

                {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={busy}
                    onClick={() => changeStep(2, true)}
                  >
                    <ArrowLeft className="size-4" />
                    上一步
                  </Button>
                  <Button type="submit" disabled={!canStart || busy}>
                    {busy ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        启动中...
                      </>
                    ) : (
                      <>
                        {choice === "source" ? "开始迁移" : "确认切换"}
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </Button>
                </div>
              </form>
            ) : null}

            {/* Step 4: 执行迁移 */}
            {step === 4 ? (
              <div className="space-y-4">
                {migration ? (
                  <>
                    <div className="relative overflow-hidden rounded-xl border border-border bg-muted/30 px-4 py-3">
                      <div
                        className={cn(
                          "pointer-events-none absolute inset-y-0 left-0 transition-[width] duration-300 ease-out",
                          migration.phase === "failed"
                            ? "bg-destructive/15"
                            : migration.phase === "ready"
                              ? "bg-emerald-500/15"
                              : "bg-primary/15"
                        )}
                        style={{ width: `${Math.max(0, Math.min(100, migration.progress || 0))}%` }}
                        aria-hidden="true"
                      />
                      <div className="relative z-10 flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">
                            {migration.detail || "正在迁移..."}
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                            {migration.current_table ? `${migration.current_table} · ` : ""}
                            {migration.processed_rows.toLocaleString()} /{" "}
                            {migration.total_rows.toLocaleString()} 行
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-sm font-semibold text-foreground tabular-nums">
                          {migration.progress}%
                        </span>
                      </div>
                    </div>

                    {migration.phase === "failed" ? (
                      <p role="alert" className="text-xs text-destructive">
                        {publicMigrationMessage(
                          migration.error || migration.detail,
                          migration.current_table
                        )}
                      </p>
                    ) : null}

                    {ready ? (
                      <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300">
                        数据已就绪，请手动重启 Cloudrave 后端服务生效。
                      </p>
                    ) : null}

                    <MigrationLogs migration={migration} />
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {status?.activation_pending
                      ? "数据已准备就绪，请重启后端服务以激活目标数据库。"
                      : "尚未启动迁移任务。"}
                  </p>
                )}

                {error ? <p role="alert" className="text-xs text-destructive">{error}</p> : null}

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-2">
                    {migration?.phase === "failed" ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => changeStep(3, true)}
                      >
                        <ArrowLeft className="size-4" />
                        上一步
                      </Button>
                    ) : !migration && !status?.activation_pending ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          changeStep(
                            status?.switch_pending && connection?.reachable ? 2 : 1,
                            true
                          )
                        }
                      >
                        <ArrowLeft className="size-4" />
                        返回
                      </Button>
                    ) : null}
                    {migration?.backup_available ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void downloadBackup()}
                      >
                        <Download className="size-3.5" />
                        下载备份
                      </Button>
                    ) : null}
                    {migration?.phase === "failed" ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void refreshStatus(undefined, false)}
                      >
                        <RefreshCw className="size-3.5" />
                        刷新
                      </Button>
                    ) : null}
                  </div>

                  <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                    关闭
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function MigrationLogs({ migration }: { migration: DatabaseMigration }) {
  const container = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    const viewport = container.current?.querySelector("[data-radix-scroll-area-viewport]")
    if (viewport) viewport.scrollTop = viewport.scrollHeight
  }, [migration.logs.length])

  return (
    <ScrollArea ref={container} className="h-36 rounded-xl border border-border bg-muted/25">
      <div className="space-y-1 p-3 font-mono text-[11px] leading-5 text-foreground/85" aria-live="polite">
        {migration.logs.length ? (
          migration.logs.map((entry) => (
            <div
              key={entry.seq}
              className={cn(
                "break-words",
                entry.level === "error" && "font-medium text-destructive",
                entry.level === "warning" && "text-amber-600 dark:text-amber-400"
              )}
            >
              <span className="mr-2 text-muted-foreground select-none">
                {new Date(entry.timestamp).toLocaleTimeString()}
              </span>
              {publicMigrationMessage(entry.message, migration.current_table)}
            </div>
          ))
        ) : (
          <div className="text-muted-foreground">等待日志...</div>
        )}
      </div>
    </ScrollArea>
  )
}

function readyStateKey(status: DatabaseStatus | null, migration: DatabaseMigration | null) {
  return `${status?.activation_pending ?? false}:${migration?.id ?? "none"}:${migration?.backup_available ?? false}`
}

function formFromStatus(status?: DatabaseStatus | null): FormState {
  return formFromProfile(status?.requested ?? defaultProfile("mysql"))
}

function formFromProfile(profile: DatabaseStatus["requested"]): FormState {
  return {
    backend: profile.backend,
    host: profile.host ?? "127.0.0.1",
    port: profile.port
      ? String(profile.port)
      : profile.backend === "postgresql"
        ? "5432"
        : "3306",
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
  if (form.backend === "sqlite") {
    return { backend: "sqlite", sqlite_path: form.sqlitePath.trim() }
  }
  return {
    backend: form.backend,
    host: form.host.trim(),
    port: Number(form.port),
    user: form.user.trim(),
    password: form.password || null,
    name: form.name.trim(),
  }
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

function instancesAreCompatible(
  source: DatabaseConnection | null | undefined,
  target: DatabaseConnection
) {
  return !source?.instance_id || !target.instance_id || source.instance_id === target.instance_id
}

function publicMigrationMessage(message: string, table: string | null) {
  const tableHint = table ? `（表：${table}）` : ""
  if (/data too long|string data right truncation/i.test(message)) {
    return `目标数据库字段长度不足${tableHint}，事务已回滚`
  }
  if (/\[SQL:|\[parameters:/i.test(message)) {
    return `写入目标数据库失败${tableHint}，事务已回滚`
  }
  return message
}
