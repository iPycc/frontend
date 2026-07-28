import * as React from "react"
import { KeyRound, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { beginPasskeyLogin } from "@/api/auth"
import { changeCurrentPassword } from "@/api/user"
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
import { isPasskeyCanceled } from "./util"

type ChangePasswordDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  token: string
  userEmail: string
  hasPasskeys: boolean
  onSuccess: () => void
}

export function ChangePasswordDialog({ open, onOpenChange, token, userEmail, hasPasskeys, onSuccess }: ChangePasswordDialogProps) {
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
