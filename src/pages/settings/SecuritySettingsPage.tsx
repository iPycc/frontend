import * as React from "react"
import { useNavigate } from "react-router-dom"
import { IconCopy, IconPlus, IconX } from "@tabler/icons-react"
import { KeyRound, Loader2 } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

import { beginPasskeyLogin } from "@/api/auth"
import {
  beginPasskeyRegistration,
  changeCurrentPassword,
  confirmTwoFactorSetup,
  deletePasskey,
  disableTwoFactor,
  finishPasskeyRegistration,
  getLoginActivity,
  initiateTwoFactorSetupWithPasskey,
  initiateTwoFactorSetupWithPassword,
  listPasskeys,
  renamePasskey,
  type UserLoginActivityEntry,
} from "@/api/user"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAppState } from "@/state/app"
import { StatusBadge } from "./shared"

function isPasskeyCanceled(error: unknown) {
  const name = error && typeof error === "object" && "name" in error ? String(error.name) : ""
  const message = error instanceof Error ? error.message.toLowerCase() : ""
  return (
    name === "AbortError" ||
    name === "NotAllowedError" ||
    message.includes("cancel") ||
    message.includes("aborted") ||
    message.includes("not allowed")
  )
}

function normalizeToastDescription(title: string, description: string | undefined, fallback: string) {
  const cleaned = (description || "").trim()
  if (!cleaned) {
    return fallback
  }

  const normalizedTitle = title.replace(/\s+/g, "")
  const normalizedDescription = cleaned.replace(/\s+/g, "")
  if (
    normalizedDescription === normalizedTitle ||
    normalizedDescription === `${normalizedTitle}失败` ||
    normalizedDescription === `${normalizedTitle}成功`
  ) {
    return fallback
  }
  return cleaned
}

export function SecuritySettingsPage() {
  const navigate = useNavigate()
  const { authSession, logout, security, settings, updateSecurity } = useAppState()
  const token = authSession?.tokens.accessToken ?? null

  const [isLoadingActivity, setIsLoadingActivity] = React.useState(false)
  const [isLoadingPasskeys, setIsLoadingPasskeys] = React.useState(false)
  const [isRegisteringPasskey, setIsRegisteringPasskey] = React.useState(false)
  const [deletingPasskeyId, setDeletingPasskeyId] = React.useState<string | null>(null)
  const [editingPasskeyId, setEditingPasskeyId] = React.useState<string | null>(null)
  const [editingPasskeyName, setEditingPasskeyName] = React.useState("")
  const [savingPasskeyId, setSavingPasskeyId] = React.useState<string | null>(null)
  const [loginActivity, setLoginActivity] = React.useState<UserLoginActivityEntry[]>([])
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = React.useState(false)
  const [twoFactorDialogMode, setTwoFactorDialogMode] = React.useState<"setup" | "disable">("setup")
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)
  const editingContainerRef = React.useRef<HTMLDivElement | null>(null)

  const loadLoginActivity = React.useCallback(async () => {
    if (!token) {
      setLoginActivity([])
      return
    }

    setIsLoadingActivity(true)
    try {
      const activity = await getLoginActivity(token, settings.timezone)
      setLoginActivity(activity)
    } catch (error) {
      console.error("加载登录活动失败:", error)
      toast.error("加载登录活动失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
      setLoginActivity([])
    } finally {
      setIsLoadingActivity(false)
    }
  }, [settings.timezone, token])

  React.useEffect(() => {
    void loadLoginActivity()
  }, [loadLoginActivity])

  const loadPasskeyList = React.useCallback(async () => {
    if (!token) {
      updateSecurity({
        passkeysEnabled: false,
        passkeys: [],
      })
      return
    }

    setIsLoadingPasskeys(true)
    try {
      const response = await listPasskeys(token, settings.timezone)
      updateSecurity({
        passkeysEnabled: response.passkeysEnabled,
        passkeys: response.passkeys,
      })
    } catch (error) {
      console.error("加载通行密钥失败:", error)
      toast.error("通行密钥", {
        description: normalizeToastDescription(
          "通行密钥",
          error instanceof Error ? error.message : undefined,
          "加载失败，请稍后再试。"
        ),
      })
      updateSecurity({
        passkeysEnabled: false,
        passkeys: [],
      })
    } finally {
      setIsLoadingPasskeys(false)
    }
  }, [settings.timezone, token, updateSecurity])

  React.useEffect(() => {
    void loadPasskeyList()
  }, [loadPasskeyList])

  const cancelEditingPasskey = React.useCallback(() => {
    setEditingPasskeyId(null)
    setEditingPasskeyName("")
  }, [])

  React.useEffect(() => {
    if (!editingPasskeyId) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (editingContainerRef.current && target instanceof Node && !editingContainerRef.current.contains(target)) {
        cancelEditingPasskey()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [cancelEditingPasskey, editingPasskeyId])

  const activityRows = loginActivity

  const handlePasswordChanged = async () => {
    toast.success("密码已更新")
    await logout("all")
    navigate("/login", { replace: true })
  }

  const addPasskey = async () => {
    if (!token) {
      return
    }

    setIsRegisteringPasskey(true)
    try {
      const { startRegistration } = await import("@simplewebauthn/browser")
      const begin = await beginPasskeyRegistration(token)
      const credential = await startRegistration({
        optionsJSON: begin.options as unknown as Parameters<typeof startRegistration>[0]["optionsJSON"],
      })
      const result = await finishPasskeyRegistration(token, {
        ceremonyId: begin.ceremony_id,
        credential: credential as unknown as Record<string, unknown>,
      })
      await loadPasskeyList()
      toast.success("通行密钥", {
        description: `已添加：${result.passkey.name}`,
      })
    } catch (error) {
      console.error("添加通行密钥失败:", error)
      if (isPasskeyCanceled(error)) {
        toast("通行密钥", {
          description: "用户已取消创建",
        })
      } else {
        toast.error("通行密钥", {
          description: normalizeToastDescription(
            "通行密钥",
            error instanceof Error ? error.message : undefined,
            "创建失败，请稍后再试。"
          ),
        })
      }
    } finally {
      setIsRegisteringPasskey(false)
    }
  }

  const handleDeletePasskey = async (passkeyId: string, passkeyName: string) => {
    if (!token) {
      return
    }

    setDeletingPasskeyId(passkeyId)
    try {
      await deletePasskey(token, passkeyId)
      await loadPasskeyList()
      if (editingPasskeyId === passkeyId) {
        cancelEditingPasskey()
      }
      toast.success("通行密钥", {
        description: `${passkeyName} 已删除`,
      })
    } catch (error) {
      console.error("删除通行密钥失败:", error)
      toast.error("通行密钥", {
        description: normalizeToastDescription(
          "通行密钥",
          error instanceof Error ? error.message : undefined,
          "删除失败，请稍后再试。"
        ),
      })
    } finally {
      setDeletingPasskeyId(null)
    }
  }

  const startEditingPasskey = (passkeyId: string, name: string) => {
    setEditingPasskeyId(passkeyId)
    setEditingPasskeyName(name)
  }

  const handleSavePasskeyName = async (passkeyId: string) => {
    if (!token) {
      return
    }

    const nextName = editingPasskeyName.trim()
    if (!nextName) {
      toast.error("通行密钥", {
        description: "名称不能为空",
      })
      return
    }

    setSavingPasskeyId(passkeyId)
    try {
      const updated = await renamePasskey(token, passkeyId, nextName, settings.timezone)
      updateSecurity({
        passkeys: security.passkeys.map((item) => (item.id === passkeyId ? updated : item)),
      })
      cancelEditingPasskey()
      toast.success("通行密钥", {
        description: `已修改为 ${updated.name}`,
      })
    } catch (error) {
      console.error("修改通行密钥名称失败:", error)
      toast.error("通行密钥", {
        description: normalizeToastDescription(
          "通行密钥",
          error instanceof Error ? error.message : undefined,
          "修改失败，请稍后再试。"
        ),
      })
    } finally {
      setSavingPasskeyId(null)
    }
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-8">
        <section className="space-y-3">
          <div className="text-sm font-medium">修改密码</div>
          <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
            修改密码
          </Button>
          <ChangePasswordDialog
            open={passwordDialogOpen}
            onOpenChange={setPasswordDialogOpen}
            token={token ?? ""}
            userEmail={authSession?.user.email ?? ""}
            hasPasskeys={security.passkeys.length > 0}
            onSuccess={handlePasswordChanged}
          />
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">两步验证</div>
            <StatusBadge active={security.twoFactorEnabled}>
              {security.twoFactorEnabled ? "已开启" : "已关闭"}
            </StatusBadge>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setTwoFactorDialogMode(security.twoFactorEnabled ? "disable" : "setup")
              setTwoFactorDialogOpen(true)
            }}
          >
            {security.twoFactorEnabled ? "关闭两步验证" : "开启两步验证"}
          </Button>
          <TwoFactorDialog
            open={twoFactorDialogOpen}
            onOpenChange={setTwoFactorDialogOpen}
            mode={twoFactorDialogMode}
            token={token ?? ""}
            userEmail={authSession?.user.email ?? ""}
            hasPasskeys={security.passkeys.length > 0}
            onSuccess={(enabled) => {
              updateSecurity({ twoFactorEnabled: enabled })
            }}
          />
        </section>

        <section className="space-y-3">
          <div className="text-sm font-medium">通行密钥</div>
          <div className="space-y-3">
            {isLoadingPasskeys ? (
              <div className="rounded-xl border border-border/70 px-4 py-6 text-sm text-muted-foreground">
                正在加载通行密钥...
              </div>
            ) : null}
            {security.passkeys.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/70 px-4 py-4 sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <KeyRound size={22} />
                  </div>
                  <div className="min-w-0">
                    {editingPasskeyId === item.id ? (
                      <div ref={editingContainerRef} className="flex flex-wrap items-center gap-2">
                        <Input
                          autoFocus
                          value={editingPasskeyName}
                          className="h-9 w-full min-w-[220px] max-w-[320px]"
                          maxLength={128}
                          onChange={(event) => setEditingPasskeyName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              void handleSavePasskeyName(item.id)
                            }
                            if (event.key === "Escape") {
                              event.preventDefault()
                              cancelEditingPasskey()
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingPasskeyId === item.id}
                          onClick={() => void handleSavePasskeyName(item.id)}
                        >
                          {savingPasskeyId === item.id ? "修改中..." : "修改"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={savingPasskeyId === item.id}
                          onClick={cancelEditingPasskey}
                        >
                          取消
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="truncate text-left text-sm font-medium transition-colors hover:text-primary"
                        onClick={() => startEditingPasskey(item.id, item.name)}
                      >
                        {item.name}
                      </button>
                    )}
                    <div className="mt-1 text-sm text-muted-foreground">
                      创建于 {item.createdAt}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      上次使用于 {item.lastUsedAt}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  onClick={() => void handleDeletePasskey(item.id, item.name)}
                  disabled={deletingPasskeyId === item.id || savingPasskeyId === item.id}
                  aria-label={`删除 ${item.name}`}
                >
                  <IconX size={18} />
                </button>
              </div>
            ))}
            {!isLoadingPasskeys && security.passkeys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                当前还没有已绑定的通行密钥。
              </div>
            ) : null}
          </div>
          <Button variant="outline" onClick={() => void addPasskey()} disabled={isRegisteringPasskey}>
            <IconPlus size={16} />
            {isRegisteringPasskey ? "添加中..." : "添加新通行密钥"}
          </Button>
        </section>
      </div>

      <section className="space-y-3">
        <div className="text-sm font-medium">最近登录活动</div>

        <div className="space-y-3 md:hidden">
          {activityRows.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/70 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.method}</div>
                  <div className="mt-1 break-all text-sm text-muted-foreground">{item.device}</div>
                </div>
                <ActivityStatusBadge result={item.result} />
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">IP</span>
                  <span className="max-w-[60%] text-right break-all">{item.ip}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">时间</span>
                  <span className="max-w-[60%] text-right">{item.time}</span>
                </div>
                {"identifier" in item && item.identifier ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">登录账号</span>
                    <span className="max-w-[60%] text-right break-all">{item.identifier}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>登录方式</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>设备指纹</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>登录账号</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityRows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.method}</TableCell>
                  <TableCell>
                    <ActivityStatusBadge result={item.result} />
                  </TableCell>
                  <TableCell className="max-w-[320px] break-all">{item.device}</TableCell>
                  <TableCell>{item.ip}</TableCell>
                  <TableCell>{item.time}</TableCell>
                  <TableCell className="break-all">{item.identifier}</TableCell>
                </TableRow>
              ))}
              {!isLoadingActivity && activityRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    暂无登录活动
                  </TableCell>
                </TableRow>
              ) : null}
              {isLoadingActivity ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    正在加载登录活动...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

type TwoFactorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "setup" | "disable"
  token: string
  userEmail: string
  hasPasskeys: boolean
  onSuccess: (enabled: boolean) => void
}

function TwoFactorDialog({ open, onOpenChange, mode, token, userEmail, hasPasskeys, onSuccess }: TwoFactorDialogProps) {
  const [step, setStep] = React.useState<"auth" | "verify" | "backup" | "confirm">("auth")
  const [authMethod, setAuthMethod] = React.useState<"password" | "passkey" | null>(null)
  const [password, setPassword] = React.useState("")
  const [otpCode, setOtpCode] = React.useState("")
  const [setupData, setSetupData] = React.useState<{ setupToken: string; secret: string; qrUri: string } | null>(null)
  const [backupCodes, setBackupCodes] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [resultEnabled, setResultEnabled] = React.useState(false)
  const [passkeyCredential, setPasskeyCredential] = React.useState<{ ceremonyId: string; credential: Record<string, unknown> } | null>(null)

  React.useEffect(() => {
    if (!open) {
      setStep("auth")
      setAuthMethod(null)
      setPassword("")
      setOtpCode("")
      setSetupData(null)
      setBackupCodes([])
      setIsLoading(false)
      setResultEnabled(false)
      setPasskeyCredential(null)
      return
    }

    if (hasPasskeys) {
      void tryPasskeyAuth()
    }
  }, [open, hasPasskeys])

  const handlePasswordVerify = async () => {
    if (!token || !password.trim()) {
      toast.error("请输入当前密码")
      return
    }

    if (mode === "setup") {
      setIsLoading(true)
      try {
        const response = await initiateTwoFactorSetupWithPassword(token, password.trim())
        setSetupData({
          setupToken: response.setup_token,
          secret: response.secret,
          qrUri: response.qr_uri,
        })
        setAuthMethod("password")
        setStep("verify")
      } catch (error) {
        console.error("两步验证操作失败:", error)
        toast.error("验证失败", {
          description: error instanceof Error ? error.message : "请稍后再试。",
        })
      } finally {
        setIsLoading(false)
      }
      return
    }

    setAuthMethod("password")
    setStep("confirm")
  }

  const tryPasskeyAuth = async () => {
    if (!token || !userEmail || isLoading) {
      return
    }

    setIsLoading(true)
    setAuthMethod("passkey")
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser")
      const begin = await beginPasskeyLogin(userEmail)
      const credential = await startAuthentication({
        optionsJSON: begin.options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"],
      })

      if (mode === "setup") {
        const response = await initiateTwoFactorSetupWithPasskey(
          token,
          begin.ceremony_id,
          credential as unknown as Record<string, unknown>
        )
        setSetupData({
          setupToken: response.setup_token,
          secret: response.secret,
          qrUri: response.qr_uri,
        })
        setStep("verify")
        return
      }

      setPasskeyCredential({
        ceremonyId: begin.ceremony_id,
        credential: credential as unknown as Record<string, unknown>,
      })
      setStep("confirm")
    } catch (error) {
      if (isPasskeyCanceled(error)) {
        toast("通行密钥", { description: "用户已取消验证" })
      } else {
        console.error("通行密钥验证失败:", error)
        toast.error("通行密钥验证失败", {
          description: error instanceof Error ? error.message : "请稍后再试。",
        })
      }
      setAuthMethod(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmDisable = async () => {
    if (!token || otpCode.length !== 6) {
      toast.error("请输入 6 位两步验证验证码")
      return
    }

    setIsLoading(true)
    try {
      if (passkeyCredential) {
        await disableTwoFactor(token, {
          code: otpCode,
          ceremonyId: passkeyCredential.ceremonyId,
          credential: passkeyCredential.credential,
        })
      } else {
        await disableTwoFactor(token, {
          code: otpCode,
          password: password.trim(),
        })
      }
      toast.success("两步验证已关闭")
      setResultEnabled(false)
      onSuccess(false)
      onOpenChange(false)
    } catch (error) {
      console.error("关闭两步验证失败:", error)
      toast.error("关闭失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirmSetup = async () => {
    if (!token || !setupData || otpCode.length !== 6) {
      return
    }

    setIsLoading(true)
    try {
      const response = await confirmTwoFactorSetup(token, {
        setupToken: setupData.setupToken,
        secret: setupData.secret,
        code: otpCode,
      })
      setBackupCodes(response.backupCodes)
      setResultEnabled(response.enabled)
      setStep("backup")
      toast.success(response.enabled ? "两步验证已开启" : "开启失败，请重试")
    } catch (error) {
      console.error("确认两步验证失败:", error)
      toast.error("验证码错误", {
        description: error instanceof Error ? error.message : "请检查验证码后重试。",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyBackupCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join("\n"))
      toast.success("备份码已复制到剪贴板")
    } catch {
      toast.error("复制失败", { description: "请手动复制备份码。" })
    }
  }

  const handleFinish = () => {
    onSuccess(resultEnabled)
    onOpenChange(false)
  }

  const dialogTitle = mode === "setup" ? "开启两步验证" : "关闭两步验证"
  const dialogDescription =
    step === "confirm" && mode === "disable"
      ? "身份已验证，请输入两步验证验证码后关闭。"
      : mode === "setup"
        ? "为了保护你的账号安全，请先验证当前密码或通行密钥。"
        : "请输入当前两步验证验证码，并验证账号密码或通行密钥。"

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,32rem)]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {step === "auth" ? (
          <div className="flex flex-col gap-4">
            {isLoading && authMethod === "passkey" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">正在等待通行密钥验证...</p>
                <Button variant="outline" size="sm" onClick={() => setIsLoading(false)} disabled={!isLoading}>
                  取消并使用密码验证
                </Button>
              </div>
            ) : (
              <>
                {mode === "disable" ? (
                  <FieldGroup>
                    <Field>
                      <FieldLabel>两步验证验证码</FieldLabel>
                      <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                        <InputOTPGroup>
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                    </Field>
                  </FieldGroup>
                ) : null}
                <FieldGroup>
                  <Field>
                    <FieldLabel>当前密码</FieldLabel>
                    <Input
                      type="password"
                      placeholder="输入当前密码"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isLoading}
                    />
                  </Field>
                </FieldGroup>
                <Button onClick={handlePasswordVerify} disabled={isLoading || !password.trim()}>
                  {isLoading ? "验证中..." : "验证密码"}
                </Button>
                {hasPasskeys ? (
                  <div className="flex flex-col gap-2">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <span className="relative bg-background px-2 text-xs text-muted-foreground">或者</span>
                    </div>
                    <Button variant="outline" onClick={() => void tryPasskeyAuth()} disabled={isLoading}>
                      <KeyRound data-icon="inline-start" />
                      使用通行密钥验证
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {step === "confirm" && mode === "disable" ? (
          <div className="flex flex-col gap-4">
            <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
              {passkeyCredential ? "已通过通行密钥验证身份" : "已通过密码验证身份"}
            </div>
            <FieldGroup>
              <Field>
                <FieldLabel>两步验证验证码</FieldLabel>
                <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                  <InputOTPGroup>
                    <InputOTPSlot index={0} />
                    <InputOTPSlot index={1} />
                    <InputOTPSlot index={2} />
                    <InputOTPSlot index={3} />
                    <InputOTPSlot index={4} />
                    <InputOTPSlot index={5} />
                  </InputOTPGroup>
                </InputOTP>
              </Field>
            </FieldGroup>
            <Button onClick={handleConfirmDisable} disabled={isLoading || otpCode.length !== 6}>
              {isLoading ? "关闭中..." : "关闭两步验证"}
            </Button>
          </div>
        ) : null}

        {step === "verify" && setupData ? (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col items-center gap-3">
                <div className="rounded-xl border border-border/70 bg-background p-3">
                  <QRCodeSVG value={setupData.qrUri} size={180} level="M" />
                </div>
                <div className="flex w-full items-center gap-2">
                  <Input readOnly value={setupData.secret} className="font-mono text-sm" />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(setupData.secret)
                        toast.success("密钥已复制")
                      } catch {
                        toast.error("复制失败")
                      }
                    }}
                  >
                    <IconCopy size={16} />
                  </Button>
                </div>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <h4 className="text-sm font-medium">在验证应用中完成绑定</h4>
                  <p className="text-sm text-muted-foreground">
                    推荐使用 Microsoft Authenticator、Google Authenticator 或 Authy 等应用扫描左侧二维码，或点击下方密钥手动添加账号。
                  </p>
                </div>
                <FieldGroup>
                  <Field>
                    <FieldLabel>输入应用生成的 6 位验证码</FieldLabel>
                    <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                      <InputOTPGroup>
                        <InputOTPSlot index={0} />
                        <InputOTPSlot index={1} />
                        <InputOTPSlot index={2} />
                        <InputOTPSlot index={3} />
                        <InputOTPSlot index={4} />
                        <InputOTPSlot index={5} />
                      </InputOTPGroup>
                    </InputOTP>
                  </Field>
                </FieldGroup>
                <Button onClick={handleConfirmSetup} disabled={isLoading || otpCode.length !== 6}>
                  {isLoading ? "确认中..." : "确认绑定"}
                </Button>
              </div>
            </div>
          </div>
        ) : null}

        {step === "backup" ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              请妥善保存以下备用验证码。如果你无法使用验证应用，可用任意一个备用码登录。
            </p>
            <div className="grid grid-cols-2 gap-2 rounded-xl border border-border/70 bg-muted/30 p-4">
              {backupCodes.map((code) => (
                <div key={code} className="font-mono text-sm">
                  {code}
                </div>
              ))}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={handleCopyBackupCodes}>
                <IconCopy data-icon="inline-start" />
                复制备份码
              </Button>
              <Button onClick={handleFinish}>完成</Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

type ChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  userEmail: string
  hasPasskeys: boolean
  onSuccess: () => void
}

function ChangePasswordDialog({ open, onOpenChange, token, userEmail, hasPasskeys, onSuccess }: ChangePasswordDialogProps) {
  const [step, setStep] = React.useState<"auth" | "change">("auth")
  const [authMethod, setAuthMethod] = React.useState<"password" | "passkey" | null>(null)
  const [password, setPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)
  const [passkeyCredential, setPasskeyCredential] = React.useState<{ ceremonyId: string; credential: Record<string, unknown> } | null>(null)

  React.useEffect(() => {
    if (!open) {
      setStep("auth")
      setAuthMethod(null)
      setPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setIsLoading(false)
      setPasskeyCredential(null)
      return
    }

    if (hasPasskeys) {
      void tryPasskeyAuth()
    }
  }, [open, hasPasskeys])

  const resetAndClose = () => {
    onOpenChange(false)
  }

  const tryPasskeyAuth = async () => {
    if (!token || !userEmail || isLoading) {
      return
    }

    setIsLoading(true)
    setAuthMethod("passkey")
    try {
      const { startAuthentication } = await import("@simplewebauthn/browser")
      const begin = await beginPasskeyLogin(userEmail)
      const credential = await startAuthentication({
        optionsJSON: begin.options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"],
      })
      setPasskeyCredential({
        ceremonyId: begin.ceremony_id,
        credential: credential as unknown as Record<string, unknown>,
      })
      setStep("change")
    } catch (error) {
      if (isPasskeyCanceled(error)) {
        toast("通行密钥", { description: "用户已取消验证" })
      } else {
        console.error("通行密钥验证失败:", error)
        toast.error("通行密钥验证失败", {
          description: error instanceof Error ? error.message : "请稍后再试。",
        })
      }
      setAuthMethod(null)
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordAuth = () => {
    if (!password.trim()) {
      toast.error("请输入当前密码")
      return
    }

    setAuthMethod("password")
    setStep("change")
  }

  const handleChangePassword = async () => {
    if (!token) {
      return
    }

    if (!newPassword || !confirmPassword) {
      toast.error("修改密码失败", {
        description: "请完整填写新密码和重复密码。",
      })
      return
    }

    if (newPassword.length < 8 || confirmPassword.length < 8) {
      toast.error("修改密码失败", {
        description: "新密码长度不能少于 8 位。",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("修改密码失败", {
        description: "两次输入的新密码不一致。",
      })
      return
    }

    setIsLoading(true)
    try {
      await changeCurrentPassword(token, {
        currentPassword: password.trim() || undefined,
        newPassword,
        confirmPassword,
        ceremonyId: passkeyCredential?.ceremonyId,
        credential: passkeyCredential?.credential,
      })
      onSuccess()
      resetAndClose()
    } catch (error) {
      console.error("修改密码失败:", error)
      toast.error("修改密码失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[min(92vw,28rem)]">
        <DialogHeader>
          <DialogTitle>{step === "auth" ? "验证身份" : "修改密码"}</DialogTitle>
          <DialogDescription>
            {step === "auth"
              ? "为了保护你的账号安全，请先验证当前密码或通行密钥。"
              : "请输入新密码并确认。"}
          </DialogDescription>
        </DialogHeader>

        {step === "auth" ? (
          <div className="flex flex-col gap-4">
            {isLoading && authMethod === "passkey" ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <Loader2 className="size-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">正在等待通行密钥验证...</p>
                <Button variant="outline" size="sm" onClick={() => setIsLoading(false)} disabled={!isLoading}>
                  取消并使用密码验证
                </Button>
              </div>
            ) : (
              <>
                <FieldGroup>
                  <Field>
                    <FieldLabel>当前密码</FieldLabel>
                    <Input
                      type="password"
                      placeholder="输入当前密码"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      disabled={isLoading}
                    />
                  </Field>
                </FieldGroup>
                <Button onClick={handlePasswordAuth} disabled={isLoading || !password.trim()}>
                  验证密码并继续
                </Button>
                {hasPasskeys ? (
                  <div className="flex flex-col gap-2">
                    <div className="relative flex items-center justify-center">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <span className="relative bg-background px-2 text-xs text-muted-foreground">或者</span>
                    </div>
                    <Button variant="outline" onClick={() => void tryPasskeyAuth()} disabled={isLoading}>
                      <KeyRound data-icon="inline-start" />
                      使用通行密钥验证
                    </Button>
                  </div>
                ) : null}
              </>
            )}
          </div>
        ) : null}

        {step === "change" ? (
          <div className="flex flex-col gap-4">
            {authMethod === "passkey" ? (
              <div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-primary">
                已通过通行密钥验证身份
              </div>
            ) : null}
            <FieldGroup>
              <Field>
                <FieldLabel>新密码</FieldLabel>
                <Input
                  type="password"
                  placeholder="输入新密码"
                  value={newPassword}
                  minLength={8}
                  maxLength={128}
                  onChange={(event) => setNewPassword(event.target.value)}
                  disabled={isLoading}
                />
              </Field>
              <Field>
                <FieldLabel>确认新密码</FieldLabel>
                <Input
                  type="password"
                  placeholder="再次输入新密码"
                  value={confirmPassword}
                  minLength={8}
                  maxLength={128}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  disabled={isLoading}
                />
              </Field>
            </FieldGroup>
            <Button onClick={handleChangePassword} disabled={isLoading || !newPassword || !confirmPassword}>
              {isLoading ? "提交中..." : "确认修改"}
            </Button>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ActivityStatusBadge({ result }: { result: string }) {
  const success = result === "成功"
  return (
    <span
      className={
        success
          ? "inline-flex rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400"
          : "inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-600 dark:text-red-400"
      }
    >
      {result}
    </span>
  )
}
