import { requestJson } from "@/api/client"
import type { BackgroundTask } from "@/api/file/type"

export function extractArchive(nodeId: number, targetParentId?: number | null, paths?: string[]) {
  return requestJson<BackgroundTask>(`/explorer/archive/${nodeId}/extract`, {
    method: "POST",
    body: { target_parent_id: targetParentId ?? null, paths: paths?.length ? paths : null },
  })
}

export function listBackgroundTasks() {
  return requestJson<BackgroundTask[]>("/explorer/task")
}
