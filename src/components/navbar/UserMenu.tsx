import { useNavigate } from "react-router-dom"

import { useAppState } from "@/state/app"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

function getInitials(name?: string) {
  if (!name) return "?"
  return name.slice(0, 2).toUpperCase()
}

export function UserMenu() {
  const navigate = useNavigate()
  const { currentUser, logout, profile } = useAppState()
  const roleLabel = currentUser?.role === "admin" ? "Admin" : "User"
  const hasAvatar = Boolean(profile.avatar?.trim())

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="ml-1 flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-[#d6d6d6] bg-white focus:outline-none dark:border-white/10 dark:bg-[#171717]">
        {hasAvatar ? (
          <img
            src={profile.avatar}
            alt={profile.username}
            className="h-full w-full object-cover"
          />
        ) : (
          <span className="text-xs font-medium text-foreground/80">
            {getInitials(profile.username || currentUser?.username)}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64 rounded-xl p-1">
        <div className="flex items-start gap-3 px-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium text-foreground">{profile.username}</p>
              {currentUser ? (
                <span className="shrink-0 rounded-md bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
                  {roleLabel}
                </span>
              ) : null}
            </div>

            {profile.email ? (
              <p className="mt-1 break-all text-xs leading-5 text-muted-foreground">
                {profile.email}
              </p>
            ) : null}
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => navigate("/settings/profile")}>
            个人资料
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem
            className="text-red-600 focus:text-red-600"
            onClick={async () => {
              await logout()
              navigate("/login", { replace: true })
            }}
          >
            退出登录
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
