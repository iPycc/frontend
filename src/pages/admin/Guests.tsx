import * as React from "react"
import { IconKey, IconPlus, IconSettings } from "@tabler/icons-react"
import { toast } from "sonner"

import { createGuest, listGuests, resetGuestPassword, updateGuest, type GuestAccount, type GuestCredentials } from "@/api/guests"
import { listMounts, type BucketMount } from "@/api/storage"
import { PageShell } from "@/components/shared/PageShell"
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
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/state/app"

const MIB = 1024 * 1024

export function Guests() {
  usePageTitle("访客管理")
  const { authSession, formatBytes } = useAppState()
  const token = authSession?.tokens.accessToken ?? ""
  const [guests, setGuests] = React.useState<GuestAccount[]>([])
  const [mounts, setMounts] = React.useState<BucketMount[]>([])
  const [loading, setLoading] = React.useState(true)
  const [createOpen, setCreateOpen] = React.useState(false)
  const [editing, setEditing] = React.useState<GuestAccount | null>(null)
  const [credentials, setCredentials] = React.useState<GuestCredentials | null>(null)

  const load = React.useCallback(async () => {
    if (!token) return
    setLoading(true)
    try {
      const [guestRows, mountRows] = await Promise.all([listGuests(token), listMounts(token)])
      setGuests(guestRows)
      setMounts(mountRows.filter((mount) => !mount.extra?.guest_workspace && mount.is_enabled && !mount.read_only))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "访客数据加载失败")
    } finally {
      setLoading(false)
    }
  }, [token])

  React.useEffect(() => { void load() }, [load])

  const toggleGuest = async (guest: GuestAccount, enabled: boolean) => {
    try {
      const updated = await updateGuest(token, guest.id, { enabled })
      setGuests((current) => current.map((item) => item.id === guest.id ? updated : item))
      toast.success(enabled ? "访客账号已启用" : "访客账号已停用")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "状态更新失败")
    }
  }

  const resetPassword = async (guest: GuestAccount) => {
    try {
      setCredentials(await resetGuestPassword(token, guest.id))
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "密码重置失败")
    }
  }

  return (
    <PageShell title="访客管理" description="为临时用户生成独立账号，并限制存储空间与有效期。">
      <div className="flex justify-end">
        <Button onClick={() => setCreateOpen(true)} disabled={!mounts.length}>
          <IconPlus size={16} /> 新增访客
        </Button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-xl border border-border">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>账号</TableHead>
              <TableHead>状态</TableHead>
              <TableHead>空间用量</TableHead>
              <TableHead>有效期</TableHead>
              <TableHead>隔离目录</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((guest) => (
              <TableRow key={guest.id}>
                <TableCell>
                  <div className="font-medium">{guest.username}</div>
                  <div className="text-xs text-muted-foreground">{guest.email}</div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Switch checked={guest.enabled && !guest.expired} onCheckedChange={(value) => void toggleGuest(guest, value)} />
                    <span className="text-sm">{guest.expired ? "已到期" : guest.enabled ? "已启用" : "已停用"}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-sm">{formatBytes(guest.used_bytes + guest.reserved_bytes)} / {formatBytes(guest.quota_bytes)}</div>
                  {guest.reserved_bytes ? <div className="text-xs text-muted-foreground">含进行中上传 {formatBytes(guest.reserved_bytes)}</div> : null}
                </TableCell>
                <TableCell>{guest.expires_at ? new Date(guest.expires_at).toLocaleString("zh-CN", { hour12: false }) : "长期有效"}</TableCell>
                <TableCell className="max-w-56 truncate font-mono text-xs" title={guest.workspace_prefix}>{guest.workspace_prefix}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => void resetPassword(guest)}><IconKey size={15} /> 重置密码</Button>
                    <Button variant="outline" size="sm" onClick={() => setEditing(guest)}><IconSettings size={15} /> 设置</Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && guests.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">尚未创建访客账号。</TableCell></TableRow>
            ) : null}
            {loading ? (
              <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">正在加载访客账号…</TableCell></TableRow>
            ) : null}
          </TableBody>
        </Table>
      </div>

      <GuestFormDialog
        open={createOpen}
        mounts={mounts}
        onOpenChange={setCreateOpen}
        onSubmit={async (value) => {
          const result = await createGuest(token, value)
          setGuests((current) => [...current, result.guest])
          setCredentials(result.credentials)
        }}
      />
      <GuestSettingsDialog
        guest={editing}
        onOpenChange={(open) => !open && setEditing(null)}
        onSubmit={async (value) => {
          if (!editing) return
          const updated = await updateGuest(token, editing.id, value)
          setGuests((current) => current.map((item) => item.id === updated.id ? updated : item))
          setEditing(null)
        }}
      />
      <CredentialsDialog credentials={credentials} onOpenChange={(open) => !open && setCredentials(null)} />
    </PageShell>
  )
}

function GuestFormDialog({ open, mounts, onOpenChange, onSubmit }: {
  open: boolean
  mounts: BucketMount[]
  onOpenChange: (open: boolean) => void
  onSubmit: (value: { source_mount_id: number; quota_bytes: number; expires_at?: string | null }) => Promise<void>
}) {
  const [mountId, setMountId] = React.useState("")
  const [quotaMb, setQuotaMb] = React.useState("1024")
  const [expiresAt, setExpiresAt] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => { if (open && !mountId && mounts[0]) setMountId(String(mounts[0].id)) }, [mountId, mounts, open])

  const submit = async () => {
    setSaving(true)
    try {
      await onSubmit({
        source_mount_id: Number(mountId),
        quota_bytes: Math.max(1, Number(quotaMb)) * MIB,
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      })
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "访客创建失败")
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[30rem]">
        <DialogHeader><DialogTitle>新增访客</DialogTitle><DialogDescription>系统会生成 guestXX@cloudrave.cn 账号和一次性显示的初始密码。</DialogDescription></DialogHeader>
        <FieldGroup>
          <Field><FieldLabel>来源存储挂载</FieldLabel><Select value={mountId} onValueChange={setMountId}><SelectTrigger><SelectValue placeholder="选择挂载" /></SelectTrigger><SelectContent><SelectGroup>{mounts.map((mount) => <SelectItem key={mount.id} value={String(mount.id)}>{mount.name}</SelectItem>)}</SelectGroup></SelectContent></Select><FieldDescription>访客数据会自动写入该挂载下的 guest/UID/ 隔离目录。</FieldDescription></Field>
          <Field><FieldLabel htmlFor="guest-quota">空间配额（MB）</FieldLabel><Input id="guest-quota" type="number" min={1} value={quotaMb} onChange={(event) => setQuotaMb(event.target.value)} /><FieldDescription>可输入任意数值，例如 50 MB 或 1024 MB。</FieldDescription></Field>
          <Field><FieldLabel htmlFor="guest-expiry">到期时间（可选）</FieldLabel><Input id="guest-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /></Field>
        </FieldGroup>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button><Button disabled={saving || !mountId || Number(quotaMb) < 1} onClick={() => void submit()}>{saving ? "创建中…" : "创建账号"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GuestSettingsDialog({ guest, onOpenChange, onSubmit }: {
  guest: GuestAccount | null
  onOpenChange: (open: boolean) => void
  onSubmit: (value: { quota_bytes: number; expires_at?: string | null; clear_expiry?: boolean }) => Promise<void>
}) {
  const [quotaMb, setQuotaMb] = React.useState("")
  const [expiresAt, setExpiresAt] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  React.useEffect(() => {
    if (!guest) return
    setQuotaMb(String(Math.ceil(guest.quota_bytes / MIB)))
    setExpiresAt(guest.expires_at ? new Date(guest.expires_at).toISOString().slice(0, 16) : "")
  }, [guest])

  const submit = async () => {
    setSaving(true)
    try {
      await onSubmit({ quota_bytes: Math.max(1, Number(quotaMb)) * MIB, ...(expiresAt ? { expires_at: new Date(expiresAt).toISOString() } : { clear_expiry: true }) })
      toast.success("访客设置已保存")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "设置保存失败")
    } finally { setSaving(false) }
  }

  return <Dialog open={Boolean(guest)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[28rem]"><DialogHeader><DialogTitle>访客设置</DialogTitle><DialogDescription>调整 {guest?.email} 的空间配额和有效期。</DialogDescription></DialogHeader><FieldGroup><Field><FieldLabel htmlFor="edit-guest-quota">空间配额（MB）</FieldLabel><Input id="edit-guest-quota" type="number" min={1} value={quotaMb} onChange={(event) => setQuotaMb(event.target.value)} /></Field><Field><FieldLabel htmlFor="edit-guest-expiry">到期时间</FieldLabel><Input id="edit-guest-expiry" type="datetime-local" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} /><FieldDescription>留空表示长期有效。</FieldDescription></Field></FieldGroup><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>取消</Button><Button disabled={saving || Number(quotaMb) < 1} onClick={() => void submit()}>{saving ? "保存中…" : "保存"}</Button></DialogFooter></DialogContent></Dialog>
}

function CredentialsDialog({ credentials, onOpenChange }: { credentials: GuestCredentials | null; onOpenChange: (open: boolean) => void }) {
  const copy = async () => {
    if (!credentials) return
    await navigator.clipboard.writeText(`账号：${credentials.email}\n密码：${credentials.password}`)
    toast.success("账号和密码已复制")
  }
  return <Dialog open={Boolean(credentials)} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-[28rem]"><DialogHeader><DialogTitle>保存访客凭据</DialogTitle><DialogDescription>密码只在这里显示一次，请先安全地发送给访客。</DialogDescription></DialogHeader><div className="rounded-xl border border-border bg-muted/30 p-4 font-mono text-sm"><div>{credentials?.email}</div><div className="mt-2 break-all">{credentials?.password}</div></div><DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)}>关闭</Button><Button onClick={() => void copy()}>复制凭据</Button></DialogFooter></DialogContent></Dialog>
}
