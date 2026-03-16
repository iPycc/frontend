import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export function SharedWithMe() {
  usePageTitle("与我共享")
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
