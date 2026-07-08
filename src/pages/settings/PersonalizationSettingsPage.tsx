import type { ReactNode } from "react"
import { toast } from "sonner"

import { updateUserPreferences } from "@/api/user"
import { useAppState } from "@/lib/app-state"
import {
  languageOptions,
  OptionGroup,
  SelectField,
  themeOptions,
  timezoneOptions,
} from "./shared"

export function PersonalizationSettingsPage() {
  const { authSession, settings, setThemeMode, updateSettings } = useAppState()
  const token = authSession?.tokens.accessToken ?? null

  const handleTimezoneChange = async (value: string) => {
    const previous = settings.timezone
    updateSettings({ timezone: value })

    if (!token) {
      return
    }

    try {
      await updateUserPreferences(token, { timezone: value })
      toast.success("偏好设置", {
        description: "时区已保存",
      })
    } catch (error) {
      updateSettings({ timezone: previous })
      toast.error("偏好设置", {
        description: error instanceof Error ? error.message : "时区保存失败，请稍后再试。",
      })
    }
  }

  return (
    <div className="max-w-[760px] space-y-9">
      <FieldBlock label="语言" hint="设置应用展示语言和首选邮件语言">
        <SelectField
          value={settings.language}
          onChange={(value) => updateSettings({ language: value })}
          options={languageOptions}
        />
      </FieldBlock>

      <FieldBlock label="时区" hint="设置展示时区，默认跟随系统时区">
        <SelectField
          value={settings.timezone}
          onChange={(value) => void handleTimezoneChange(value)}
          options={timezoneOptions}
        />
      </FieldBlock>

      <FieldBlock label="黑暗模式" hint="">
        <OptionGroup
          value={settings.themeMode}
          options={themeOptions}
          onChange={setThemeMode}
        />
      </FieldBlock>

      <FieldBlock
        label="树视图"
        hint="开启后，侧边栏文件树会跟随当前目录并自动展开；关闭后则保持当前展开状态。"
      >
        <OptionGroup
          value={settings.showSidebarTree ? "follow" : "static"}
          options={[
            { label: "开启", value: "follow" },
            { label: "关闭", value: "static" },
          ]}
          onChange={(value) =>
            updateSettings({ showSidebarTree: value === "follow" })
          }
        />
      </FieldBlock>
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
      {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
    </section>
  )
}
