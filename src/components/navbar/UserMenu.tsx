import { useNavigate } from "react-router-dom"

import { useAppState } from "@/lib/app-state"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export function UserMenu() {
  const navigate = useNavigate()
  const { profile, logout } = useAppState()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-1 h-10 w-10 overflow-hidden rounded-full border border-[#d6d6d6] bg-white focus:outline-none dark:border-white/10 dark:bg-[#171717]">
        <img
          src={profile.avatar}
          alt={profile.username}
          className="h-full w-full object-cover"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 rounded-xl">
        <div className="relative flex items-center justify-start gap-2 p-2">
          <div className="flex w-full flex-col space-y-1 leading-none">
            {profile.username ? (
              <p className="flex w-full items-center justify-between text-sm">
                <span>{profile.username}</span>
                <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                  管理
                </span>
              </p>
            ) : null}
            {profile.email ? (
              <p className="mt-1 w-[180px] truncate text-xs leading-none text-muted-foreground">
                {profile.email}
              </p>
            ) : null}
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
          个人主页
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-red-600 focus:text-red-600"
          onClick={() => {
            logout()
            navigate("/login", { replace: true })
          }}
        >
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
