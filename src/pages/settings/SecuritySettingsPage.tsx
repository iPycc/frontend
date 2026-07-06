import * as React from "react"
import { useNavigate } from "react-router-dom"
import { IconPlus, IconX } from "@tabler/icons-react"
import { KeyRound } from "lucide-react"
import { toast } from "sonner"

import { changeCurrentPassword, getLoginActivity, type UserLoginActivityEntry } from "@/api/user"
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

function nowLabel() {
  return new Date().toLocaleString("zh-CN", { hour12: false }).replace(/\//g, "-")
}

function createPasskeyId() {
  return `passkey-${Math.random().toString(36).slice(2, 8)}`
}

export function SecuritySettingsPage() {
  const navigate = useNavigate()
  const { authSession, logout, security, updateSecurity } = useAppState()
  const token = authSession?.tokens.accessToken ?? null

  const [currentPassword, setCurrentPassword] = React.useState("")
  const [newPassword, setNewPassword] = React.useState("")
  const [confirmPassword, setConfirmPassword] = React.useState("")
  const [isChangingPassword, setIsChangingPassword] = React.useState(false)
  const [isLoadingActivity, setIsLoadingActivity] = React.useState(false)
  const [loginActivity, setLoginActivity] = React.useState<UserLoginActivityEntry[]>([])

  const loadLoginActivity = React.useCallback(async () => {
    if (!token) {
      setLoginActivity([])
      return
    }

    setIsLoadingActivity(true)
    try {
      const activity = await getLoginActivity(token)
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
  }, [token])

  React.useEffect(() => {
    void loadLoginActivity()
  }, [loadLoginActivity])

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

  const addPasskey = () => {
    updateSecurity({
      passkeysEnabled: true,
      passkeys: [
        ...security.passkeys,
        {
          id: createPasskeyId(),
          name: `安全密钥 ${security.passkeys.length + 1}`,
          createdAt: nowLabel(),
          lastUsedAt: "刚刚添加",
        },
      ],
    })
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
                    <div className="truncate text-sm font-medium">{item.name}</div>
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
                  onClick={() => {
                    updateSecurity({
                      passkeys: security.passkeys.filter((passkey) => passkey.id !== item.id),
                    })
                  }}
                  aria-label={`删除 ${item.name}`}
                >
                  <IconX size={18} />
                </button>
              </div>
            ))}
          </div>
          <Button variant="outline" onClick={addPasskey}>
            <IconPlus size={16} />
            添加新凭证
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
