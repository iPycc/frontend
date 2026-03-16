import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IconEdit, IconTrash } from "@tabler/icons-react"

export function Shares() {
  usePageTitle("我的分享")
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
