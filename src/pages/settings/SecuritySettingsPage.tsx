import { IconInfoCircle, IconPlus } from "@tabler/icons-react"
import { KeyRound, Trash2 } from "lucide-react"

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
        <div className="rounded-[14px] bg-[#04222e] px-4 py-4 text-sm text-[#8fd7ff] dark:bg-[#04222e]">
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
        {security.passkeys.map((item) => (
          <div
            key={item.id}
            className="flex items-center justify-between gap-4 rounded-[15px] border border-border/70 px-4 py-3"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary">
                <KeyRound size={24} />
              </div>
              <div>
                <div className="text-sm font-medium">{item.name}</div>
                <div className="text-sm text-muted-foreground">
                  创建于 {item.createdAt}
                </div>
              </div>
              <div className="text-sm text-[#70d56c]">上次使用于 {item.lastUsedAt}</div>
            </div>
            <button
              type="button"
              className="text-muted-foreground transition-colors hover:text-destructive"
              onClick={() => {
                updateSecurity({
                  passkeys: security.passkeys.filter((k) => k.id !== item.id),
                })
              }}
            >
              <Trash2 size={18} />
            </button>
          </div>
        ))}
        <Button variant="outline" onClick={addPasskey}>
          <IconPlus size={16} />
          添加新凭证
        </Button>
      </section>

      <section className="space-y-3">
        <div className="text-sm font-medium">最近登录活动</div>
        <div className="overflow-hidden rounded-[15px] border border-border/70">
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
                    <span className="inline-flex rounded-full bg-[#4caf50]/20 px-2 py-0.5 text-xs text-[#71db74]">
                      成功
                    </span>
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
