import { ApiError } from "@/api/client"

export function previewFailure(reason: unknown) {
  if (reason instanceof ApiError) {
    if (reason.status === 403) {
      if (reason.message === "Preview is unavailable for download-limited shares; use download") {
        return { message: "此分享限制下载次数，请使用下载。", retryable: false }
      }
      return {
        message: reason.message === "Share download limit reached"
          ? "此分享已达到下载次数上限。请联系分享者。"
          : "没有权限预览此文件。请联系文件所有者。",
        retryable: false,
      }
    }
    if (reason.status >= 500) {
      return { message: "文件暂时无法预览，请稍后重试。", retryable: true }
    }
  }
  return { message: reason instanceof Error ? reason.message : "预览加载失败", retryable: true }
}
