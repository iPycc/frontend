import type { ReactNode } from "react"
import { useNavigate } from "react-router-dom"
import { IconArrowRight, IconRestore, IconTrashX, IconEdit, IconTrash } from "@tabler/icons-react"

import { useAppState } from "@/lib/app-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

function PageShell({
  title,
  description,
  action,
  children,
}: {
  title: string
  description: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="app-panel flex-1 rounded-[15px] border border-border/60 p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[15px] font-semibold">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
        {action}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  )
}

export function Buckets() {
  const navigate = useNavigate()
  return (
    <PageShell
      title="存储桶"
      description="统一从设置中心管理存储桶、连接策略与 CORS 检测。"
      action={<Button onClick={() => navigate("/settings/storage")}>打开设置中心</Button>}
    >
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-6 text-sm text-muted-foreground">
        存储桶新建、命名和策略参数都已经迁移到右上角设置页的「存储桶管理」Tab。
      </div>
    </PageShell>
  )
}

export function Shares() {
  const { getShareRecords } = useAppState()
  const shares = getShareRecords()

  return (
    <PageShell title="我的分享" description="展示当前账号发出的分享链接、访问级别和统计数据。">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>文件名</TableHead>
            <TableHead>访问方式</TableHead>
            <TableHead>有效期</TableHead>
            <TableHead>访问量</TableHead>
            <TableHead>下载</TableHead>
            <TableHead className="w-[180px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {shares.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.node?.name || "已删除文件"}</TableCell>
              <TableCell>
                <span className="bg-muted px-2 py-1 rounded-md text-xs">{item.access}</span>
              </TableCell>
              <TableCell>{item.expiresAt}</TableCell>
              <TableCell>{item.views}</TableCell>
              <TableCell>{item.downloads}</TableCell>
              <TableCell className="flex gap-2">
                <Button variant="outline" size="sm">
                  <IconEdit size={14} className="mr-1" />
                  修改
                </Button>
                <Button variant="destructive" size="sm">
                  <IconTrash size={14} className="mr-1" />
                  删除
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageShell>
  )
}

export function Recycle() {
  const { getRecycleNodes, restoreNodes, permanentlyDeleteNodes, formatBytes } = useAppState()
  const items = getRecycleNodes()

  return (
    <PageShell title="回收站" description="已删除对象会先进入回收站，可恢复或彻底删除。">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>大小</TableHead>
            <TableHead>删除时间</TableHead>
            <TableHead className="w-[180px]">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.kind === "folder" ? "文件夹" : item.ext?.toUpperCase() || "文件"}</TableCell>
              <TableCell>{formatBytes(item.size)}</TableCell>
              <TableCell>{item.deletedAt}</TableCell>
              <TableCell className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => restoreNodes([item.id])}>
                  <IconRestore size={14} />
                  恢复
                </Button>
                <Button variant="destructive" size="sm" onClick={() => permanentlyDeleteNodes([item.id])}>
                  <IconTrashX size={14} />
                  删除
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageShell>
  )
}

export function Tasks() {
  const { offlineTasks } = useAppState()

  return (
    <PageShell title="后台任务" description="展示离线下载、打包下载等后台任务的执行状态。">
      <div className="space-y-4">
        {offlineTasks.map((task) => (
          <div key={task.id} className="rounded-[15px] border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{task.name}</div>
                <div className="text-sm text-muted-foreground">{task.url}</div>
              </div>
              <div className="text-sm text-muted-foreground">{task.status}</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

export function SharedWithMe() {
  const { getSharedWithMeNodes, formatBytes } = useAppState()
  const items = getSharedWithMeNodes()

  return (
    <PageShell title="与我共享" description="来自团队成员的共享内容统一汇总在这里。">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名称</TableHead>
            <TableHead>类型</TableHead>
            <TableHead>大小</TableHead>
            <TableHead>更新时间</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>{item.name}</TableCell>
              <TableCell>{item.ext?.toUpperCase() || "文件"}</TableCell>
              <TableCell>{formatBytes(item.size)}</TableCell>
              <TableCell>{item.updatedAt}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </PageShell>
  )
}

export function Mounts() {
  const navigate = useNavigate()
  const { buckets } = useAppState()

  return (
    <PageShell
      title="连接与挂载"
      description="挂载列表、CORS 检测结果和存储策略参数从同一数据源派生。"
      action={
        <Button variant="outline" onClick={() => navigate("/settings/storage")}>
          去管理
          <IconArrowRight size={14} />
        </Button>
      }
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {buckets.map((bucket) => (
          <div key={bucket.id} className="rounded-[15px] border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{bucket.name}</div>
                <div className="text-sm text-muted-foreground">{bucket.provider}</div>
              </div>
              <span className="text-sm text-muted-foreground">{bucket.corsStatus === "healthy" ? "CORS 正常" : "待处理"}</span>
            </div>
            <div className="mt-3 space-y-1 text-sm text-muted-foreground">
              <div>Bucket：{bucket.bucket || "local"}</div>
              <div>Region：{bucket.region || "本机"}</div>
              <div>策略：{bucket.strategy.multipartThreshold} / {bucket.strategy.partSize}</div>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

export function Offline() {
  const { offlineTasks } = useAppState()

  return (
    <PageShell title="离线下载" description="保留与其他页面一致的容器风格，展示下载队列状态。">
      <div className="space-y-4">
        {offlineTasks.map((task) => (
          <div key={task.id} className="rounded-[15px] border border-border/60 bg-background p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-medium">{task.name}</div>
                <div className="text-sm text-muted-foreground">{task.url}</div>
              </div>
              <div className="text-sm text-muted-foreground">{task.status}</div>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress}%` }} />
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  )
}

export function Store() {
  return (
    <PageShell title="商店" description="应用商店位于后续版本，这里先保留页面框架。">
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        当前版本专注于文件系统与设置中心，插件商店稍后接入。
      </div>
    </PageShell>
  )
}

export function Discussions() {
  return (
    <PageShell title="讨论" description="团队讨论入口预留。">
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        讨论区尚未接入实际会话数据。
      </div>
    </PageShell>
  )
}

export function Users() {
  return (
    <PageShell title="用户管理" description="管理后台页面预留。">
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        当前任务聚焦于用户端文件系统和设置页。
      </div>
    </PageShell>
  )
}

export function Guests() {
  return (
    <PageShell title="访客管理" description="管理后台页面预留。">
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        访客权限页面仍为预留布局。
      </div>
    </PageShell>
  )
}

export function System() {
  return (
    <PageShell title="系统设置" description="管理后台系统配置预留。">
      <div className="rounded-[15px] border border-dashed border-border/70 bg-muted/20 p-8 text-sm text-muted-foreground">
        系统级配置后续将独立接入。
      </div>
    </PageShell>
  )
}
