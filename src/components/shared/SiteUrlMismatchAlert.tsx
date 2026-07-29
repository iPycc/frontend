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
import { cacheWebsiteSettings } from "@/components/shared/useWebsiteSettings"
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
        if (!result.matches || !result.detected_is_secure_context) {
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
      const response = await updateSiteUrl(token, status.detected_site_url)
      cacheWebsiteSettings(response.settings)
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

  if (
    !isAdmin
    || !checked
    || !status
    || (status.matches && status.detected_is_secure_context)
  ) {
    return null
  }

  const schemeChanged = Boolean(
    status.saved_scheme
      && status.detected_scheme
      && status.saved_scheme !== status.detected_scheme,
  )
  const canUseDetectedUrl = status.detected_is_secure_context

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[28rem]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <IconAlertTriangle size={20} className="text-amber-500" />
            {status.matches ? "当前网站正在使用 HTTP" : "网站地址不一致"}
          </DialogTitle>
          <DialogDescription render={<div />} className="space-y-2 pt-1">
            <p>
              {status.matches
                ? "当前网站地址与设置一致，但连接不满足公网安全验证要求。"
                : "当前访问地址与数据库中保存的网站链接不一致。通行密钥会严格校验协议、域名和端口。"}
            </p>
            <div className="space-y-2 rounded-xl bg-muted/50 px-3 py-2.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">数据库保存</span>
                <span className="min-w-0 break-all text-right font-medium">
                  {status.saved_site_url || "未设置"}
                  {status.saved_scheme ? (
                    <span className="ml-2 text-xs uppercase text-muted-foreground">
                      {status.saved_scheme}
                    </span>
                  ) : null}
                </span>
              </div>
              <div className="flex items-start justify-between gap-3">
                <span className="text-muted-foreground">当前检测到</span>
                <span className="min-w-0 break-all text-right font-medium">
                  {status.detected_site_url}
                  <span className="ml-2 text-xs uppercase text-muted-foreground">
                    {status.detected_scheme}
                  </span>
                </span>
              </div>
            </div>
            {!canUseDetectedUrl ? (
              <p className="text-amber-700 dark:text-amber-400">
                当前是 HTTP。非本地环境无法使用通行密钥，密码和 TOTP 验证数据也缺少 HTTPS 传输保护；请先为站点启用 HTTPS。
              </p>
            ) : null}
            {status.passkey_rp_id_changed ? (
              <p className="text-amber-700 dark:text-amber-400">
                域名变更会改变通行密钥的 RP ID，已有通行密钥不能在新域名继续使用；TOTP 密钥和密码本身不受影响。
              </p>
            ) : schemeChanged && canUseDetectedUrl ? (
              <p>
                协议将切换为 HTTPS，但域名未变，已有通行密钥无需重建；尚未提交的验证挑战需要重新发起。
              </p>
            ) : null}
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
            disabled={loading || !canUseDetectedUrl}
            title={canUseDetectedUrl ? undefined : "请先启用 HTTPS"}
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
