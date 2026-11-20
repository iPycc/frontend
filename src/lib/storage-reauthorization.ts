import { toast } from "sonner"

import type { BucketMount } from "@/lib/models"

export function notifyStorageReauthorization(bucket: BucketMount) {
  toast.error(`「${bucket.name}」需要重新授权`, {
    id: `storage-reauthorization:${bucket.id}`,
    description: bucket.canEditConnection
      ? "登录信息已失效，请重新登录运营商网页并更新该云盘的登录信息。"
      : "登录信息已失效，请联系此存储的管理员更新授权。",
    action: bucket.canEditConnection
      ? { label: "前往存储设置", onClick: () => window.location.assign("/settings/storage") }
      : undefined,
    duration: 10000,
  })
}
