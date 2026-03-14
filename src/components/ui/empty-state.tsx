import { IconFolder } from "@tabler/icons-react"
import { cn } from "@/lib/utils"

export function EmptyState({ title = "暂无数据", description = "当前目录下没有文件或文件夹", className }: { title?: string; description?: string; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center py-20 text-center", className)}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
        <IconFolder className="h-10 w-10 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
