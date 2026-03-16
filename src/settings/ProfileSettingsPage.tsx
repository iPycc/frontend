import * as React from "react"
import {
  IconChevronDown,
  IconPencil,
} from "@tabler/icons-react"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { useAppState } from "@/lib/app-state"

export function ProfileSettingsPage() {
  const { profile, updateProfile } = useAppState()
  const [username, setUsername] = React.useState(profile.username)
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setUsername(profile.username)
  }, [profile.username])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const result = e.target?.result as string
      if (result) {
        updateProfile({ avatar: result })
      }
    }
    reader.readAsDataURL(file)
  }

  const triggerUpload = () => {
    fileInputRef.current?.click()
  }

  const commitUsername = () => {
    const nextValue = username.trim()
    if (nextValue && nextValue !== profile.username) {
      updateProfile({ username: nextValue })
    }
  }

  return (
    <div className="space-y-10">
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileChange}
      />
      <div className="flex flex-col-reverse gap-y-8 lg:grid lg:max-w-[920px] lg:grid-cols-[minmax(0,1fr)_220px] lg:items-start lg:gap-x-8">
        <div className="space-y-8">
          <FieldBlock label="电子邮箱">
            <Input value={profile.email} className="w-full" readOnly />
          </FieldBlock>

          <FieldBlock label="昵称" hint="用于公开展示的名字，可使用真实姓名或昵称">
            <Input
              className="w-full"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onBlur={commitUsername}
            />
          </FieldBlock>

          <div className="grid gap-x-10 gap-y-7 sm:grid-cols-2">
            <MetaItem label="UID" value={profile.uid} />
            <MetaItem label="注册时间" value={profile.registeredAt} />
            <MetaItem label="用户组" value={profile.group} />
            <MetaItem
              label="个人主页"
              value={
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1 text-left text-foreground transition-colors hover:text-primary outline-none"
                    >
                      <span>仅展示无密码分享链接</span>
                      <IconChevronDown size={14} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start">
                    <DropdownMenuItem>仅展示无密码分享链接</DropdownMenuItem>
                    <DropdownMenuItem>展示所有链接</DropdownMenuItem>
                    <DropdownMenuItem>不展示</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              }
            />
          </div>
        </div>

        <div className="flex flex-col items-center space-y-3 lg:items-start lg:justify-self-start">
          <div className="hidden text-sm font-medium lg:block">头像</div>
          <button
            type="button"
            onClick={triggerUpload}
            className="block h-[180px] w-[180px] overflow-hidden rounded-[15px] transition-opacity hover:opacity-90"
          >
            <Avatar className="h-full w-full rounded-[15px] after:hidden">
              <AvatarImage src={profile.avatar} alt={profile.username} className="object-cover" />
              <AvatarFallback className="rounded-[15px] text-3xl">
                {profile.username.slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </button>
          <Button variant="outline" size="sm" onClick={triggerUpload}>
            <IconPencil size={15} />
            编辑
          </Button>
        </div>
      </div>
    </div>
  )
}

function FieldBlock({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-medium">{label}</div>
      {children}
      {hint ? <div className="text-sm text-muted-foreground">{hint}</div> : null}
    </div>
  )
}

function MetaItem({
  label,
  value,
}: {
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  )
}

