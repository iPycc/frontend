import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useUploadState } from "@/lib/upload/provider"

export function Offline() {
  usePageTitle("离线下载")
  const { offlineTasks } = useUploadState()

  return (
    <PageShell title="离线下载" description="保留与其他页面一致的容器风格，展示下载队列状态。">
      <div className="space-y-4">
        {offlineTasks.map((task) => (
          <div key={task.id} className="rounded-xl border border-border/60 bg-background p-4">
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
