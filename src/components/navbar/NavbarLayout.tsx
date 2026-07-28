import { IconMoon, IconSearch, IconSettings, IconSun } from "@tabler/icons-react"
import { Menu } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { useAppState } from "@/state/app"
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
    <header className="flex shrink-0 items-center justify-between gap-4 px-4 p-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <SidebarTrigger className="text-[#666666] hover:bg-white hover:text-[#2b2b2b] md:hidden" />
        {!isMobile && !open ? (
          <button
            type="button"
            onClick={toggleSidebar}
            className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#4b4b4b] transition-colors hover:bg-[#edf3f8] hover:text-[#232323] md:flex dark:text-[#d1d1d1] dark:hover:bg-[#23282f] dark:hover:text-[#f5f5f5]"
            aria-label="展开侧边栏"
          >
            <Menu size={20} />
          </button>
        ) : null}

        <CreateMenu />
        <SearchBar />
      </div>

      <div className="flex items-center gap-2 md:gap-4">
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#2b2b2b] md:hidden dark:text-[#b7b7b7] dark:hover:bg-[#1d1d1d] dark:hover:text-[#f1f1f1]"
          aria-label="search"
        >
          <IconSearch size={20} />
        </button>
        <button
          onClick={() =>
            setThemeMode(effectiveTheme === "dark" ? "light" : "dark")
          }
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#2b2b2b] md:h-10 md:w-10 dark:text-[#b7b7b7] dark:hover:bg-[#1d1d1d] dark:hover:text-[#f1f1f1]"
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
          className="flex h-9 w-9 items-center justify-center rounded-full text-[#666666] transition-colors hover:bg-white hover:text-[#2b2b2b] md:h-10 md:w-10 dark:text-[#b7b7b7] dark:hover:bg-[#1d1d1d] dark:hover:text-[#f1f1f1]"
          aria-label="open-settings"
        >
          <IconSettings size={25} />
        </button>
        <UserMenu />
      </div>
    </header>
  )
}
