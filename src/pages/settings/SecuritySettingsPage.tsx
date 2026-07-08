import * as React from "react"
import { useNavigate } from "react-router-dom"
import { IconPlus, IconX } from "@tabler/icons-react"
import { KeyRound } from "lucide-react"
import { toast } from "sonner"

import {
  beginPasskeyRegistration,
  changeCurrentPassword,
  deletePasskey,
  finishPasskeyRegistration,
  getLoginActivity,
  listPasskeys,
  renamePasskey,
  type UserLoginActivityEntry,
} from "@/api/user"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAppState } from "@/lib/app-state"
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

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [isLoadingActivity, setIsLoadingActivity] = React.useState(false)
  const [isLoadingPasskeys, setIsLoadingPasskeys] = React.useState(false)
  const [isRegisteringPasskey, setIsRegisteringPasskey] = React.useState(false)
  const [deletingPasskeyId, setDeletingPasskeyId] = React.useState<string | null>(null)
  const [editingPasskeyId, setEditingPasskeyId] = React.useState<string | null>(null)
  const [editingPasskeyName, setEditingPasskeyName] = React.useState("")
  const [savingPasskeyId, setSavingPasskeyId] = React.useState<string | null>(null)
  const [loginActivity, setLoginActivity] = React.useState<UserLoginActivityEntry[]>([])
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

  const handleChangePassword = async () => {
    if (!token) {
      return
    }

    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error("修改密码失败", {
        description: "请完整填写旧密码、新密码和重复密码。",
      })
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error("修改密码失败", {
        description: "两次输入的新密码不一致。",
      })
      return
    }

    setIsChangingPassword(true)
    try {
      await changeCurrentPassword(token, {
        currentPassword,
        newPassword,
        confirmPassword,
      })
      toast.success("密码已更新，请重新登录")
      await logout()
      navigate("/login", { replace: true })
    } catch (error) {
      console.error("修改密码失败:", error)
      toast.error("修改密码失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setIsChangingPassword(false)
    }
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
          <div className="rounded-xl border border-border/70 bg-card px-4 py-4">
            <div className="grid gap-4">
              <Input
                type="password"
                placeholder="输入旧密码"
                value={currentPassword}
                minLength={8}
                maxLength={128}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
              <Input
                type="password"
                placeholder="输入新密码"
                value={newPassword}
                minLength={8}
                maxLength={128}
                onChange={(event) => setNewPassword(event.target.value)}
              />
              <Input
                type="password"
                placeholder="再次输入新密码"
                value={confirmPassword}
                minLength={8}
                maxLength={128}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" onClick={handleChangePassword} disabled={isChangingPassword}>
            {isChangingPassword ? "提交中..." : "修改密码"}
          </Button>
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
            onClick={() => updateSecurity({ twoFactorEnabled: !security.twoFactorEnabled })}
          >
            {security.twoFactorEnabled ? "关闭两步验证" : "开启两步验证"}
          </Button>
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
