import { StatusBadge } from "../shared"

export function ActivityStatusBadge({ result }: { result: string }) {
  const success = result === "成功"
  return (
    <span
      className={
        success
          ? "inline-flex rounded-full bg-green-500/15 px-2 py-0.5 text-xs text-green-600 dark:text-green-400"
          : "inline-flex rounded-full bg-red-500/15 px-2 py-0.5 text-xs text-red-600 dark:text-red-400"
      }
    >
      {result}
    </span>
  )
}
