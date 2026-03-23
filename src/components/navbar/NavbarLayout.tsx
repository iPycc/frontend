import { IconMoon, IconSearch, IconSettings, IconSun } from "@tabler/icons-react"
import { Menu } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useAppState } from "@/lib/app-state"
import { useIsMobile } from "@/hooks/use-mobile"
import { SidebarTrigger, useSidebar } from "@/components/ui/sidebar"
import { CreateMenu } from "./CreateMenu"
import { SearchBar } from "./SearchBar"
import { UserMenu } from "./UserMenu"

export function NavbarLayout() {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const { open, toggleSidebar } = useSidebar()
  const { effectiveTheme, setThemeMode } = useAppState()

  return (
    <header className="flex shrink-0 items-center justify-between gap-3 px-2 py-2 md:gap-4 md:px-4 md:py-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTrigger className="text-muted-foreground hover:bg-card hover:text-foreground md:hidden" />
        {!isMobile && !open ? (
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-nav-hover-bg hover:text-foreground md:flex"
            aria-label="展开侧边栏"
          >
            <Menu size={20} />
          </button>
        ) : null}

        <CreateMenu />
        <SearchBar />
      </div>

      <div className="flex items-center gap-1.5 md:gap-4">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:hidden"
          aria-label="search"
        >
          <IconSearch size={20} />
        </button>
        <button
          onClick={() =>
            setThemeMode(effectiveTheme === "dark" ? "light" : "dark")
          }
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:h-10 md:w-10"
          aria-label="toggle-theme"
        >
          {effectiveTheme === "dark" ? (
            <IconSun size={25} />
          ) : (
            <IconMoon size={25} />
          )}
        </button>
        <button
          onClick={() => navigate("/settings/profile")}
          className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-card hover:text-foreground md:h-10 md:w-10"
          aria-label="open-settings"
        >
          <IconSettings size={25} />
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
