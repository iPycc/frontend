import { IconDeviceFloppy } from "@tabler/icons-react"
import type { ReactNode } from "react"
import * as React from "react"
import { toast } from "sonner"

import { getWebsiteSettings, updateWebsiteSettings, type WebsiteSettings } from "@/api/site"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAppState } from "@/lib/app-state"

const defaultSettings: WebsiteSettings = {
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

export function WebsiteSettingsPage() {
  const { authSession } = useAppState()
  const token = authSession?.tokens.accessToken ?? null
  const [settings, setSettings] = React.useState<WebsiteSettings>(defaultSettings)
  const [initialSettings, setInitialSettings] = React.useState<WebsiteSettings>(defaultSettings)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    getWebsiteSettings(controller.signal)
      .then((response) => {
        const merged = { ...defaultSettings, ...response.settings }
        setSettings(merged)
        setInitialSettings(merged)
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

  const updateField = <K extends keyof WebsiteSettings>(key: K, value: WebsiteSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }))
  }

  const handleSave = async () => {
    if (!token) {
      toast.error("保存失败", { description: "请先登录" })
      return
    }
    setSaving(true)
    try {
      const response = await updateWebsiteSettings(token, settings)
      const merged = { ...defaultSettings, ...response.settings }
      setSettings(merged)
      setInitialSettings(merged)
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
            disabled={saving || loading}
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
