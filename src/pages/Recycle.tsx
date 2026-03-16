import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IconRestore, IconTrashX } from "@tabler/icons-react"

export function Recycle() {
  usePageTitle("回收站")
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
