import { requestJson } from "@/api/client"

export type BackendHealth = {
  status: string
  service: string
  timestamp: string
}

export function checkBackendHealth(signal?: AbortSignal) {
  return requestJson<BackendHealth>("/explorer/health", { signal })
}
