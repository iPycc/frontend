import type { UploadSessionPlan } from "@/api/uploads"

export function usesCloudraveTransport(plan: Pick<UploadSessionPlan, "transport">) {
  return plan.transport === "cloudrave"
}

export function requiresUploadResponseHeader(
  plan: Pick<UploadSessionPlan, "required_response_headers">,
  header: string
) {
  return plan.required_response_headers.some((item) => item.toLowerCase() === header.toLowerCase())
}
