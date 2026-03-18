import { IconInfoCircle, IconPlus, IconX } from "@tabler/icons-react"
import { KeyRound } from "lucide-react"

import { Button } from "@/components/ui/button"
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
  return new Date().toLocaleString("zh-CN", { hour12: false })
}

function createPasskeyId() {
  return `passkey-${Math.random().toString(36).slice(2, 8)}`
}

export function SecuritySettingsPage() {
  const { loginActivity, security, updateSecurity } = useAppState()

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
      <section className="space-y-3">
        <div className="text-sm font-medium">密码</div>
        <div className="rounded-lg bg-primary/[0.08] px-4 py-4 text-sm text-foreground">
          <div className="flex items-center gap-2">
            <IconInfoCircle size={18} />
            <span>显示设置于 {security.passwordUpdatedAt}</span>
          </div>
        </div>
        <Button variant="outline">修改密码</Button>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <div className="text-sm font-medium">二步验证</div>
          <StatusBadge active={security.twoFactorEnabled}>
            {security.twoFactorEnabled ? "已开启" : "已关闭"}
          </StatusBadge>
        </div>
        <Button
          variant="outline"
          onClick={() => updateSecurity({ twoFactorEnabled: !security.twoFactorEnabled })}
        >
          {security.twoFactorEnabled ? "关闭二步验证" : "开启二步验证"}
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
                    passkeys: security.passkeys.filter((k) => k.id !== item.id),
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

      <section className="space-y-3">
        <div className="text-sm font-medium">最近登录活动</div>
        <div className="space-y-3 md:hidden">
          {loginActivity.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/70 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.method}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{item.device}</div>
                </div>
                <ActivityStatusBadge />
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
              </div>
            </div>
          ))}
        </div>
        <div className="hidden overflow-hidden rounded-xl border border-border/70 md:block">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>登录方式</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>设备</TableHead>
                <TableHead>IP</TableHead>
                <TableHead className="w-[180px]">时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loginActivity.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.method}</TableCell>
                  <TableCell>
                    <ActivityStatusBadge />
                  </TableCell>
                  <TableCell>{item.device}</TableCell>
                  <TableCell>{item.ip}</TableCell>
                  <TableCell>{item.time}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}

function ActivityStatusBadge() {
  return (
    <span className="inline-flex rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400">
      成功
    </span>
  )
}
