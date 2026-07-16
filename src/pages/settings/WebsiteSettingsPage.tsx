import { IconDeviceFloppy, IconWorld } from "@tabler/icons-react"
import * as React from "react"
import { toast } from "sonner"

import { getWebsiteSettings, updateWebsiteSettings, type WebsiteSettings } from "@/api/site"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useAppState } from "@/lib/app-state"

const defaultSettings: WebsiteSettings = {
  site_title: "",
  site_logo_url: "",
  site_description: "",
  seo_title: "",
  seo_description: "",
  seo_keywords: "",
  site_theme: "",
  site_font: "",
  site_border_radius: "0.75rem",
  footer_enabled: true,
  footer_html: "",
  filing_enabled: false,
  filing_text: "",
}

const themeOptions = [
  { label: "默认", value: "" },
  { label: "蓝色", value: "blue" },
  { label: "紫色", value: "violet" },
  { label: "玫瑰", value: "rose" },
  { label: "绿色", value: "green" },
  { label: "橙色", value: "orange" },
]

const fontOptions = [
  { label: "默认字体", value: "" },
  { label: "系统字体", value: "system-ui" },
  { label: "无衬线", value: "sans-serif" },
  { label: "衬线", value: "serif" },
  { label: "等宽", value: "monospace" },
]

const radiusOptions = [
  { label: "无", value: "0rem" },
  { label: "小", value: "0.5rem" },
  { label: "中", value: "0.75rem" },
  { label: "大", value: "1rem" },
  { label: "超大", value: "1.5rem" },
]

export function WebsiteSettingsPage() {
  const { authSession } = useAppState()
  const token = authSession?.tokens.accessToken ?? null
  const [settings, setSettings] = React.useState<WebsiteSettings>(defaultSettings)
  const [loading, setLoading] = React.useState(false)
  const [saving, setSaving] = React.useState(false)

  React.useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    getWebsiteSettings(controller.signal)
      .then((response) => {
        setSettings({ ...defaultSettings, ...response.settings })
      })
      .catch((error: unknown) => {
        toast.error("加载站点设置失败", {
          description: error instanceof Error ? error.message : "请稍后再试",
        })
      })
      .finally(() => setLoading(false))
    return () => controller.abort()
  }, [])

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
      setSettings({ ...defaultSettings, ...response.settings })
      toast.success("站点设置已保存")
    } catch (error: unknown) {
      toast.error("保存失败", {
        description: error instanceof Error ? error.message : "请稍后再试",
      })
    } finally {
      setSaving(false)
    }
  }

  const Field = ({
    label,
    children,
    hint,
  }: {
    label: string
    children: React.ReactNode
    hint?: string
  }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
    </div>
  )

  return (
    <div className="max-w-[760px] space-y-8">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <IconWorld size={20} />
            站点信息
          </h2>
          <p className="text-sm text-muted-foreground">配置网站标题、Logo、简介与 SEO 信息</p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
          <IconDeviceFloppy size={16} />
          {saving ? "保存中..." : "保存"}
        </Button>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field label="网站标题" hint="显示在浏览器标签页与顶部导航">
          <Input
            value={settings.site_title}
            onChange={(e) => updateField("site_title", e.target.value)}
            placeholder="Cloudrave"
            disabled={loading}
          />
        </Field>

        <Field label="网站 Logo" hint="图片 URL，留空使用默认图标">
          <Input
            value={settings.site_logo_url}
            onChange={(e) => updateField("site_logo_url", e.target.value)}
            placeholder="https://example.com/logo.png"
            disabled={loading}
          />
        </Field>
      </div>

      <Field label="网站简介" hint="展示在登录页与站点介绍区域">
        <Textarea
          value={settings.site_description}
          onChange={(e) => updateField("site_description", e.target.value)}
          placeholder="简洁可靠的私人云盘"
          rows={3}
          disabled={loading}
        />
      </Field>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="SEO 标题">
          <Input
            value={settings.seo_title}
            onChange={(e) => updateField("seo_title", e.target.value)}
            placeholder="Cloudrave - 私人云盘"
            disabled={loading}
          />
        </Field>
        <Field label="SEO 描述">
          <Input
            value={settings.seo_description}
            onChange={(e) => updateField("seo_description", e.target.value)}
            placeholder="安全、高效的文件存储与分享平台"
            disabled={loading}
          />
        </Field>
        <Field label="SEO 关键词">
          <Input
            value={settings.seo_keywords}
            onChange={(e) => updateField("seo_keywords", e.target.value)}
            placeholder="云盘, 文件存储, 分享"
            disabled={loading}
          />
        </Field>
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-semibold">主题样式</h2>
        <p className="text-sm text-muted-foreground">调整站点主题色、字体与圆角风格</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Field label="主题色">
          <Select
            value={settings.site_theme}
            onValueChange={(value) => updateField("site_theme", value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择主题" />
            </SelectTrigger>
            <SelectContent>
              {themeOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="网站字体">
          <Select
            value={settings.site_font}
            onValueChange={(value) => updateField("site_font", value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择字体" />
            </SelectTrigger>
            <SelectContent>
              {fontOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field label="圆角大小">
          <Select
            value={settings.site_border_radius}
            onValueChange={(value) => updateField("site_border_radius", value)}
            disabled={loading}
          >
            <SelectTrigger>
              <SelectValue placeholder="选择圆角" />
            </SelectTrigger>
            <SelectContent>
              {radiusOptions.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <div className="space-y-1">
        <h2 className="text-lg font-semibold">页脚与备案</h2>
        <p className="text-sm text-muted-foreground">自定义页脚内容并在底部展示备案信息</p>
      </div>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">启用页脚</div>
          <div className="text-sm text-muted-foreground">关闭后整个页脚区域将隐藏</div>
        </div>
        <Switch
          checked={settings.footer_enabled}
          onCheckedChange={(checked) => updateField("footer_enabled", checked)}
          disabled={loading}
        />
      </div>

      <Field label="自定义页脚 HTML" hint="支持 HTML，会插入到页脚区域">
        <Textarea
          value={settings.footer_html}
          onChange={(e) => updateField("footer_html", e.target.value)}
          placeholder="<p>© 2026 Cloudrave. All rights reserved.</p>"
          rows={4}
          disabled={loading}
        />
      </Field>

      <div className="flex items-center justify-between rounded-xl border border-border p-4">
        <div className="space-y-0.5">
          <div className="text-sm font-medium">展示备案信息</div>
          <div className="text-sm text-muted-foreground">开启后在页面底部固定展示备案号</div>
        </div>
        <Switch
          checked={settings.filing_enabled}
          onCheckedChange={(checked) => updateField("filing_enabled", checked)}
          disabled={loading}
        />
      </div>

      <Field label="备案信息" hint="例如：京ICP备12345678号-1">
        <Input
          value={settings.filing_text}
          onChange={(e) => updateField("filing_text", e.target.value)}
          placeholder="输入备案号"
          disabled={loading || !settings.filing_enabled}
        />
      </Field>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving || loading} className="gap-2">
          <IconDeviceFloppy size={16} />
          {saving ? "保存中..." : "保存站点设置"}
        </Button>
      </div>
    </div>
  )
}
