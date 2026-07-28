import { requestJson } from "@/api/client"
import type { BackgroundTask } from "@/api/file/type"

export function extractArchive(nodeId: number, targetParentId?: number | null) {
  return requestJson<BackgroundTask>(`/explorer/archive/${nodeId}/extract`, {
    method: "POST",
    body: { target_parent_id: targetParentId ?? null },
  })
}

export function listBackgroundTasks() {
  return requestJson<BackgroundTask[]>("/explorer/task")
}
