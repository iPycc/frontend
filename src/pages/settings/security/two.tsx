import * as React from "react"
import { Check, Copy, Loader2, LockKeyhole, ScanFace, ShieldOff, X } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import { toast } from "sonner"

import { beginPasskeyLogin } from "@/api/auth"
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  initiateTwoFactorSetupWithPasskey,
  initiateTwoFactorSetupWithPassword,
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
import { isPasskeyCanceled } from "./util"

type TwoFactorDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: "setup" | "disable"
  token: string
  userEmail: string
  hasPasskeys: boolean
  onSuccess: (enabled: boolean) => void
}

export function TwoFactorDialog({ open, onOpenChange, mode, token, userEmail, hasPasskeys, onSuccess }: TwoFactorDialogProps) {
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
      ? "请输入两步验证验证码；提交后服务器会同时校验身份验证材料。"
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
                  <X data-icon="inline-start" />
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
                  {isLoading ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <LockKeyhole data-icon="inline-start" />
                  )}
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
                      <ScanFace data-icon="inline-start" />
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
              {passkeyCredential
                ? "通行密钥响应已就绪，关闭两步验证时将由服务器完成校验"
                : "密码将在关闭两步验证时由服务器校验"}
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
              {isLoading ? (
                <Loader2 data-icon="inline-start" className="animate-spin" />
              ) : (
                <ShieldOff data-icon="inline-start" />
              )}
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
                    <Copy size={16} />
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
                  {isLoading ? (
                    <Loader2 data-icon="inline-start" className="animate-spin" />
                  ) : (
                    <Check data-icon="inline-start" />
                  )}
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
                <Copy data-icon="inline-start" />
                复制备份码
              </Button>
              <Button onClick={handleFinish}>
                <Check data-icon="inline-start" />
                完成
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
