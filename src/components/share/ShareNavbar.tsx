import { useState } from "react"
import { NavLink, useNavigate } from "react-router-dom"
import { IconMenu2, IconMoon, IconSun, IconX } from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import { Button } from "@/components/ui/button"
import { Logo } from "@/components/ui/logo"
import { useAppState } from "@/lib/app-state"
import { UserMenu } from "@/components/navbar"
import { cn } from "@/lib/utils"

const navLinks = [
  { to: "/app", label: "我的文件", auth: true },
  { to: "/share", label: "我的分享", auth: true },
]

export function ShareNavbar() {
  const navigate = useNavigate()
  const { isAuthenticated, effectiveTheme, setThemeMode } = useAppState()
  const [mobileOpen, setMobileOpen] = useState(false)

  const toggleTheme = () => {
    setThemeMode(effectiveTheme === "dark" ? "light" : "dark")
  }

  const visibleLinks = navLinks.filter((link) => !link.auth || isAuthenticated)

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <NavLink
          to={isAuthenticated ? "/app" : "/"}
          className="flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Logo showText className="text-foreground" />
        </NavLink>

        <nav className="hidden items-center gap-1 md:flex">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                cn(
                  "relative rounded-full px-4 py-2 text-sm font-medium transition-colors hover:text-foreground",
                  isActive
                    ? "bg-nav-active-bg text-nav-active-fg"
                    : "text-muted-foreground"
                )
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="切换主题"
          >
            {effectiveTheme === "dark" ? <IconSun size={20} /> : <IconMoon size={20} />}
          </button>

          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <Button size="sm" onClick={() => navigate("/login")}>
              登录
            </Button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
            aria-label="切换导航"
          >
            {mobileOpen ? <IconX size={20} /> : <IconMenu2 size={20} />}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {mobileOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className="overflow-hidden border-t border-border/60 bg-background md:hidden"
          >
            <div className="flex flex-col gap-1 p-4">
              {visibleLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to}
                  onClick={() => setMobileOpen(false)}
                  className={({ isActive }) =>
                    cn(
                      "rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-nav-active-bg text-nav-active-fg"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )
                  }
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
