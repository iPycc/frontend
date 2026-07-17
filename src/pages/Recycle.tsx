import * as React from "react"

import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { IconRestore, IconTrashX } from "@tabler/icons-react"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"

export function Recycle() {
  usePageTitle("回收站")
  const { getRecycleNodes, loadRecycle, recycleLoading, restoreNodes, permanentlyDeleteNodes, formatBytes } = useAppState()
  const items = getRecycleNodes()

  React.useEffect(() => {
    void loadRecycle().catch((error: unknown) => {
      toast.error(error instanceof Error ? error.message : "回收站加载失败")
    })
  }, [loadRecycle])

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
          {recycleLoading && items.length === 0
            ? Array.from({ length: 4 }, (_, index) => (
                <TableRow key={index}>
                  {Array.from({ length: 5 }, (__, cellIndex) => (
                    <TableCell key={cellIndex}>
                      <Skeleton className="h-5 w-full rounded-md" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            : null}
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
