import { StatusBadge } from "../shared"

export function ActivityStatusBadge({ result }: { result: string }) {
  const success = result === "成功"
  return success ? (
    <StatusBadge active>{result}</StatusBadge>
  ) : (
    <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
      {result}
    </span>
  )
}
