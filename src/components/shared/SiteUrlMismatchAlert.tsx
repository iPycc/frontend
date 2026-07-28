import { IconAlertTriangle, IconExternalLink, IconRefresh } from "@tabler/icons-react"
import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { getSiteUrlStatus, updateSiteUrl, type SiteUrlStatusResponse } from "@/api/site"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useAppState } from "@/state/app"

const DISMISS_KEY = "cloudrave.site-url-mismatch-dismissed"

function isAdminPage(pathname: string) {
  return pathname.startsWith("/admin") || pathname === "/settings/website"
}

export function SiteUrlMismatchAlert() {
  const { authSession, currentUser } = useAppState()
  const location = useLocation()
  const navigate = useNavigate()
  const token = authSession?.tokens.accessToken ?? null
  const isAdmin = currentUser?.role === "admin"

  const [status, setStatus] = React.useState<SiteUrlStatusResponse | null>(null)
  const [open, setOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)
  const [checked, setChecked] = React.useState(false)

  React.useEffect(() => {
    if (!isAdmin || !token || !isAdminPage(location.pathname)) {
      setOpen(false)
      return
    }

    if (sessionStorage.getItem(DISMISS_KEY) === "1") {
      return
    }

    let cancelled = false
    const controller = new AbortController()

    const check = async () => {
      try {
        const result = await getSiteUrlStatus(token, controller.signal)
        if (cancelled) return
        setStatus(result)
        if (!result.matches) {
          setOpen(true)
        }
      } catch {
        // Fail silently; this alert is best-effort.
      } finally {
        if (!cancelled) setChecked(true)
      }
    }

    void check()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [isAdmin, token, location.pathname])

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1")
    setOpen(false)
  }

  const handleUseNew = async () => {
    if (!token || !status) return
    setLoading(true)
    try {
      await updateSiteUrl(token, status.detected_site_url)
      toast.success("网站链接已更新", {
        description: status.detected_site_url,
      })
      sessionStorage.setItem(DISMISS_KEY, "1")
      setOpen(false)
    } catch (error: unknown) {
      toast.error("更新网站链接失败", {
        description: error instanceof Error ? error.message : "请稍后再试",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleGoToSettings = () => {
    sessionStorage.setItem(DISMISS_KEY, "1")
    setOpen(false)
    navigate("/settings/website")
  }

  if (!isAdmin || !checked || !status || status.matches) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[28rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconAlertTriangle size={20} className="text-amber-500" />
            网站地址不一致
          </DialogTitle>
          <DialogDescription className="space-y-2 pt-1">
            <p>当前访问地址与数据库中保存的网站链接不一致，可能会影响分享链接、通行密钥等功能。</p>
            <div className="rounded-xl bg-muted/50 px-3 py-2 text-sm">
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">数据库保存</span>
                <span className="font-medium">{status.saved_site_url || "未设置"}</span>
              </div>
              <div className="flex justify-between gap-2">
                <span className="text-muted-foreground">当前检测到</span>
                <span className="font-medium">{status.detected_site_url}</span>
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            onClick={handleDismiss}
            disabled={loading}
            className="w-full sm:w-auto"
          >
            保留当前设置
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleGoToSettings}
            disabled={loading}
            className="w-full gap-1.5 sm:w-auto"
          >
            <IconExternalLink size={16} />
            前往站点设置
          </Button>
          <Button
            type="button"
            onClick={() => void handleUseNew()}
            disabled={loading}
            className="w-full gap-1.5 sm:w-auto"
          >
            <IconRefresh size={16} className={loading ? "animate-spin" : ""} />
            {loading ? "更新中..." : "使用新地址"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
