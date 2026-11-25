import * as React from "react"
import { listPathPlans } from "@/api/user-storage"
import { toast } from "sonner"

export function usePathTaskCompletion(sessionId: string | undefined) {
  const [jobs, setJobs] = React.useState<Array<{ ids: string[]; refresh: () => Promise<unknown> }>>([])

  React.useEffect(() => setJobs([]), [sessionId])

  React.useEffect(() => {
    if (!jobs.length) return
    let cancelled = false
    let timer: number
    const poll = async () => {
      try {
        const tasks = await listPathPlans()
        if (cancelled) return
        const statuses = new Map(tasks.map((task) => [task.id, task.migration?.status ?? task.status]))
        const finished = jobs.filter((job) => job.ids.every((id) => {
          const status = statuses.get(id)
          return status === "completed" || status === "failed" || status === "canceled"
        }))
        if (finished.length) {
          const results = await Promise.allSettled(finished.map((job) => job.refresh()))
          if (cancelled) return
          if (results.some((result) => result.status === "rejected")) toast.error("任务已结束，刷新文件列表失败，请刷新页面")
          setJobs((current) => current.filter((job) => !finished.includes(job)))
          return
        }
      } catch {
        // Keep watching queued work after a transient status failure.
      }
      if (!cancelled) timer = window.setTimeout(() => void poll(), 1500)
    }
    void poll()
    return () => { cancelled = true; window.clearTimeout(timer) }
  }, [jobs])

  return React.useCallback((ids: string[], refresh: () => Promise<unknown>) => {
    setJobs((current) => [...current, { ids, refresh }])
  }, [])
}
