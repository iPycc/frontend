import * as React from "react"
import { useNavigate } from "react-router-dom"
import { IconPlus, IconX } from "@tabler/icons-react"
import { KeyRound } from "lucide-react"
import { toast } from "sonner"

import {
  beginPasskeyRegistration,
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
import { useAppState } from "@/state/app"
import { StatusBadge } from "./shared"
import { ActivityStatusBadge } from "./security/badge"
import { ChangePasswordDialog } from "./security/pass"
import { TwoFactorDialog } from "./security/two"
import { isPasskeyCanceled, normalizeToastDescription } from "./security/util"

export function SecuritySettingsPage() {
  const navigate = useNavigate()
  const { authSession, currentUser, logout, security, settings, updateSecurity } = useAppState()
  const isGuest = currentUser?.role === "guest"
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
    if (isGuest) {
      setLoginActivity([])
      return
    }
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
  }, [isGuest, settings.timezone, token])

  React.useEffect(() => {
    void loadLoginActivity()
  }, [loadLoginActivity])

  const loadPasskeyList = React.useCallback(async () => {
    if (isGuest) {
      updateSecurity({ passkeysEnabled: false, passkeys: [] })
      return
    }
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
  }, [isGuest, settings.timezone, token, updateSecurity])

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

  if (isGuest) {
    return (
      <div className="max-w-2xl">
        <section className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-4">
          <div>
            <div className="text-sm font-medium">修改密码</div>
            <div className="mt-1 text-sm text-muted-foreground">访客只能维护自己的登录密码，账号资料和存储空间由管理员管理。</div>
          </div>
          <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>修改密码</Button>
        </section>
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          token={token ?? ""}
          userEmail={authSession?.user.email ?? ""}
          hasPasskeys={false}
          onSuccess={handlePasswordChanged}
        />
      </div>
    )
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

        <div className="flex flex-col gap-3 @5xl/settings-content:hidden">
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

        <div className="hidden overflow-hidden rounded-xl border border-border/70 @5xl/settings-content:block">
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
