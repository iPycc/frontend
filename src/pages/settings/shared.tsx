import * as React from "react"
import { UserRoundCog } from "lucide-react"
import {
  IconBucket,
  IconEyeOff,
  IconMoon,
  IconPalette,
  IconShieldLock,
  IconSun,
  IconTree,
  IconUserCircle,
  IconWorld,
} from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { ButtonGroup } from "@/components/ui/button-group"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ThemeMode } from "@/lib/models"
import { formatTimeZoneOffset, getSystemTimeZone } from "@/lib/datetime"
import { cn } from "@/lib/utils"

export type SettingsTabId =
  | "profile"
  | "personalization"
  | "security"
  | "storage"
  | "guests"
  | "website"

export const settingsTabs: Array<{
  id: SettingsTabId
  label: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
}> = [
  {
    id: "profile",
    label: "个人资料",
    description: "账户身份与公开信息",
    icon: IconUserCircle,
  },
  {
    id: "personalization",
    label: "偏好",
    description: "语言、时区与界面偏好",
    icon: IconPalette,
  },
  {
    id: "security",
    label: "账号与安全",
    description: "密码、登录方式与登录记录",
    icon: IconShieldLock,
  },
  {
    id: "storage",
    label: "存储空间",
    description: "COS 连接策略与挂载配置",
    icon: IconBucket,
  },
  {
    id: "guests",
    label: "访客管理",
    description: "临时账号、空间配额与有效期",
    icon: UserRoundCog,
  },
  {
    id: "website",
    label: "站点设置",
    description: "网站标题、页脚、备案与主题样式",
    icon: IconWorld,
  },
]

export const languageOptions = [
  { label: "简体中文", value: "zh-CN" },
  { label: "English", value: "en-US" },
  { label: "日本語", value: "ja-JP" },
]

const namedTimezones = [
  { name: "北京时间", value: "Asia/Shanghai" },
  { name: "东京时间", value: "Asia/Tokyo" },
  { name: "首尔时间", value: "Asia/Seoul" },
  { name: "新加坡时间", value: "Asia/Singapore" },
  { name: "香港时间", value: "Asia/Hong_Kong" },
  { name: "台北时间", value: "Asia/Taipei" },
  { name: "柏林时间", value: "Europe/Berlin" },
  { name: "伦敦时间", value: "Europe/London" },
  { name: "纽约时间", value: "America/New_York" },
  { name: "洛杉矶时间", value: "America/Los_Angeles" },
  { name: "悉尼时间", value: "Australia/Sydney" },
  { name: "协调世界时", value: "UTC" },
]

const systemTimezone = getSystemTimeZone()
const configuredTimezones = namedTimezones.map((item) => ({
  label: `${item.name} (${formatTimeZoneOffset(item.value)})`,
  value: item.value,
}))

export const timezoneOptions = configuredTimezones.some((item) => item.value === systemTimezone)
  ? configuredTimezones
  : [
      {
        label: `系统时区 · ${systemTimezone} (${formatTimeZoneOffset(systemTimezone)})`,
        value: systemTimezone,
      },
      ...configuredTimezones,
    ]

export function timezoneOptionsFor(value: string) {
  if (!value || timezoneOptions.some((item) => item.value === value)) return timezoneOptions
  return [
    { label: `${value} (${formatTimeZoneOffset(value)})`, value },
    ...timezoneOptions,
  ]
}

export const themeOptions: Array<{ label: string; value: ThemeMode }> = [
  { label: "浅色", value: "light" },
  { label: "系统", value: "system" },
  { label: "深色", value: "dark" },
]

export function SettingsRow({
  title,
  description,
  children,
  badge,
}: {
  title: string
  description: string
  children: React.ReactNode
  badge?: React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-medium">{title}</h2>
          {badge}
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

export function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="grid gap-2 py-4 md:grid-cols-[180px_minmax(0,1fr)] md:items-center">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/70">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  )
}

export function StatusBadge({
  active = false,
  children,
}: {
  active?: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs",
        active
          ? "bg-primary/10 text-primary"
          : "bg-muted text-muted-foreground"
      )}
    >
      {children}
    </span>
  )
}

export function SelectField({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (value: string) => void
  options: Array<{ label: string; value: string }>
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full rounded-xl border-input">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((item) => (
          <SelectItem key={item.value} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

const themeIcons: Record<string, React.ReactNode> = {
  light: <IconSun size={14} />,
  system: null,
  dark: <IconMoon size={14} />,
}

const treeIcons: Record<string, React.ReactNode> = {
  follow: <IconTree size={14} />,
  static: <IconEyeOff size={14} />,
}

export function OptionGroup<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: Array<{ label: string; value: T }>
  onChange: (value: T) => void
}) {
  return (
    <ButtonGroup>
      {options.map((item) => {
        const icon = themeIcons[item.value] ?? treeIcons[item.value] ?? null
        const isActive = value === item.value
        return (
          <Button
            key={item.value}
            variant="outline"
            size="sm"
            className={cn(
              "gap-1.5",
              isActive && "!border-primary !bg-primary !text-primary-foreground hover:!bg-primary/90 hover:!text-primary-foreground"
            )}
            onClick={() => onChange(item.value)}
          >
            {icon}
            {item.label}
          </Button>
        )
      })}
    </ButtonGroup>
  )
}

export function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string
  hint: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <div className="text-sm font-medium">{label}</div>
        <div className="text-sm text-muted-foreground">{hint}</div>
      </div>
      {children}
    </div>
  )
}

export function CheckboxRow({
  checked,
  label,
  description,
  onToggle,
}: {
  checked: boolean
  label: string
  description: string
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
        checked ? "border-primary/25 bg-primary/10" : "border-border bg-background"
      )}
    >
      <span
        className={cn(
          "mt-1 h-3 w-3 rounded-full",
          checked ? "bg-primary" : "bg-muted-foreground"
        )}
      />
      <span className="space-y-1">
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-sm text-muted-foreground">{description}</span>
      </span>
    </button>
  )
}

export function BucketMeta({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div
      className="space-y-1 rounded-xl px-3 py-3"
      style={{ backgroundColor: "var(--app-panel)" }}
    >
      <dt className="text-xs uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">{value}</dd>
    </div>
  )
}
