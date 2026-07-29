import { IconDeviceFloppy, IconRefresh } from "@tabler/icons-react"
import type { ReactNode } from "react"
import * as React from "react"
import { toast } from "sonner"

import {
  getDetectedSiteUrl,
  getWebsiteSettings,
  updateWebsiteSettings,
  type WebsiteSettings,
} from "@/api/site"
import { cacheWebsiteSettings } from "@/components/shared/useWebsiteSettings"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAppState } from "@/state/app"

const defaultSettings: WebsiteSettings = {
  site_url: "",
  site_title: "",
  site_logo_url: "",
  site_description: "",
  site_theme: "",
  site_font: "",
  site_border_radius: "0.75rem",
  footer_enabled: true,
  footer_html: "",
  filing_enabled: false,
  filing_text: "",
}

type SiteUrlAssessment = {
  valid: boolean
  secure: boolean
  scheme: string
  hostname: string
}

function assessSiteUrl(value: string): SiteUrlAssessment {
  const candidate = value.trim()
  if (!candidate) {
    return { valid: true, secure: true, scheme: "", hostname: "" }
  }

  try {
    const parsed = new URL(candidate)
    const scheme = parsed.protocol.replace(":", "").toLowerCase()
    const hostname = parsed.hostname.toLowerCase()
    const isLocal = hostname === "localhost"
      || hostname.endsWith(".localhost")
      || hostname.startsWith("127.")
      || hostname === "[::1]"
    const valid = (scheme === "http" || scheme === "https") && Boolean(hostname)
    return {
      valid,
      secure: valid && (scheme === "https" || isLocal),
      scheme,
      hostname,
    }
  } catch {
    return { valid: false, secure: false, scheme: "", hostname: "" }
  }
}

export function WebsiteSettingsPage() {
  const { authSession } = useAppState()
  const token = authSession?.tokens.accessToken ?? null
  const [settings, setSettings] = React.useState<WebsiteSettings>(defaultSettings)
  const [initialSettings, setInitialSettings] = React.useState<WebsiteSettings>(defaultSettings)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [detecting, setDetecting] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    getWebsiteSettings(controller.signal)
      .then((response) => {
        const merged = { ...defaultSettings, ...response.settings }
        setSettings(merged)
        setInitialSettings(merged)
        cacheWebsiteSettings(merged)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        toast.error("加载站点设置失败", {
          description: error instanceof Error ? error.message : "请稍后再试",
        })
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

  const isDirty = React.useMemo(() => {
    return JSON.stringify(settings) !== JSON.stringify(initialSettings)
  }, [settings, initialSettings])
  const siteUrlAssessment = React.useMemo(
    () => assessSiteUrl(settings.site_url),
    [settings.site_url],
  )
  const initialSiteUrlAssessment = React.useMemo(
    () => assessSiteUrl(initialSettings.site_url),
    [initialSettings.site_url],
  )
  const siteUrlChanged = settings.site_url.trim().replace(/\/$/, "")
    !== initialSettings.site_url.trim().replace(/\/$/, "")
  const rpIdChanged = Boolean(
    siteUrlChanged
      && initialSiteUrlAssessment.hostname
      && siteUrlAssessment.hostname
      && initialSiteUrlAssessment.hostname !== siteUrlAssessment.hostname,
  )
  const siteUrlBlocksSave = siteUrlChanged
    && (!siteUrlAssessment.valid || !siteUrlAssessment.secure)

  const updateField = <K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const handleDetectSiteUrl = async () => {
    setDetecting(true)
    try {
      const response = await getDetectedSiteUrl()
      updateField("site_url", response.site_url)
      if (!response.is_secure_context) {
        toast.warning("检测到 HTTP 地址", {
          description: "非本地站点请先启用 HTTPS，再保存网站地址。",
        })
        return
      }
      toast.success("已获取当前网站地址", {
        description: response.site_url,
      })
    } catch (error: unknown) {
      toast.error("获取网站地址失败", {
        description: error instanceof Error ? error.message : "请稍后再试",
      })
    } finally {
      setDetecting(false)
    }
  }

  const handleSave = async () => {
    if (!token) {
      toast.error("保存失败", { description: "请先登录" })
      return
    }
    if (siteUrlBlocksSave) {
      toast.error("网站地址不可用", {
        description: siteUrlAssessment.valid
          ? "非本地网站地址必须使用 HTTPS。"
          : "请输入包含 http:// 或 https:// 的有效网站地址。",
      })
      return
    }
    setSaving(true)
    try {
      const response = await updateWebsiteSettings(token, settings)
      const merged = { ...defaultSettings, ...response.settings }
      setSettings(merged)
      setInitialSettings(merged)
      cacheWebsiteSettings(merged)
      toast.success("站点设置已保存")
    } catch (error: unknown) {
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "请稍后再试",
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="relative max-w-[760px] space-y-9">
      <FieldBlock
        label="网站链接"
        hint="站点对外访问地址，用于分享链接、通行密钥与外部预览。留空则使用当前浏览器地址"
      >
        <div className="flex items-center gap-2">
          <Input
            value={settings.site_url}
            onChange={(e) => updateField("site_url", e.target.value)}
            placeholder="https://cloud.example.com"
            disabled={loading}
            aria-invalid={siteUrlChanged && (!siteUrlAssessment.valid || !siteUrlAssessment.secure)}
            className="flex-1"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => void handleDetectSiteUrl()}
            disabled={loading || detecting}
            className="gap-2"
          >
            <IconRefresh size={16} className={detecting ? "animate-spin" : ""} />
            {detecting ? "检测中..." : "自动检测"}
          </Button>
        </div>
        {siteUrlChanged && !siteUrlAssessment.valid ? (
          <p className="text-sm text-destructive">
            请输入包含 http:// 或 https:// 的完整网站地址。
          </p>
        ) : siteUrlChanged && !siteUrlAssessment.secure ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            非本地 HTTP 站点无法使用通行密钥，密码与 TOTP 验证数据也缺少传输加密。请先启用 HTTPS。
          </p>
        ) : rpIdChanged ? (
          <p className="text-sm text-amber-700 dark:text-amber-400">
            域名变更后，已有通行密钥不能在新域名使用，需要重新注册；TOTP 密钥和密码不受影响。
          </p>
        ) : siteUrlChanged && siteUrlAssessment.scheme === "https" ? (
          <p className="text-sm text-muted-foreground">
            将使用 HTTPS 作为通行密钥验证来源；保存后请重新发起尚未完成的验证挑战。
          </p>
        ) : null}
      </FieldBlock>

      <FieldBlock label="网站标题" hint="显示在浏览器标签页与顶部导航，留空使用默认名称">
        <Input
          value={settings.site_title}
          onChange={(e) => updateField("site_title", e.target.value)}
          placeholder="Cloudrave"
          disabled={loading}
        />
      </FieldBlock>

      <FieldBlock label="网站 Logo" hint="图片 URL，留空使用默认图标">
        <Input
          value={settings.site_logo_url}
          onChange={(e) => updateField("site_logo_url", e.target.value)}
          placeholder="https://example.com/logo.png"
          disabled={loading}
        />
      </FieldBlock>

      <FieldBlock label="网站简介" hint="展示在登录页与站点介绍区域">
        <Textarea
          value={settings.site_description}
          onChange={(e) => updateField("site_description", e.target.value)}
          placeholder="简洁可靠的私人云盘"
          rows={3}
          disabled={loading}
        />
      </FieldBlock>

      <FieldBlock
        label="启用页脚"
        hint="关闭后左侧边栏底部将完全隐藏自定义页脚区域"
      >
        <Switch
          checked={settings.footer_enabled}
          onCheckedChange={(checked) => updateField("footer_enabled", checked)}
          disabled={loading}
        />
      </FieldBlock>

      <FieldBlock
        label="自定义页脚 HTML"
        hint="支持 HTML 与内联样式，会显示在左侧边栏底部。可填写版权信息、联系方式或自定义链接"
      >
        <Textarea
          value={settings.footer_html}
          onChange={(e) => updateField("footer_html", e.target.value)}
          placeholder={"<p>© 2026 Cloudrave. All rights reserved.</p>\n<p><a href=\"/terms\">使用条款</a> · <a href=\"/privacy\">隐私政策</a></p>"}
          rows={4}
          disabled={loading || !settings.footer_enabled}
        />
      </FieldBlock>

      <FieldBlock
        label="展示备案信息"
        hint="开启后备案信息将固定在左侧边栏底部展示，登录页底部也会显示备案链接"
      >
        <Switch
          checked={settings.filing_enabled}
          onCheckedChange={(checked) => updateField("filing_enabled", checked)}
          disabled={loading}
        />
      </FieldBlock>

      <FieldBlock
        label="备案号"
        hint="例如：京ICP备12345678号-1 或 京公网安备11010502030143号"
      >
        <Input
          value={settings.filing_text}
          onChange={(e) => updateField("filing_text", e.target.value)}
          placeholder="输入备案号"
          disabled={loading || !settings.filing_enabled}
        />
      </FieldBlock>

      {isDirty ? (
        <div className="sticky bottom-4 z-30 flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={saving || loading || siteUrlBlocksSave}
            className="gap-2 shadow-lg"
          >
            <IconDeviceFloppy size={16} />
            {saving ? "保存中..." : "保存站点设置"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="text-sm font-medium">{label}</div>
      {children}
      <div className="text-sm text-muted-foreground">{hint}</div>
    </section>
  )
}
