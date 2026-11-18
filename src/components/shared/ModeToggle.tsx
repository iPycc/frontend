import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAppState } from "@/state/app"
import { ThemeToggleGlyph } from "./ThemeToggleButton"

export function ModeToggle() {
  const { settings, effectiveTheme, setThemeMode } = useAppState()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="outline" size="icon" className="group relative overflow-hidden" />}>
        <ThemeToggleGlyph
          isDark={effectiveTheme === "dark"}
          size={19}
          className="transition-transform duration-300 group-hover:scale-110"
        />
        <span className="sr-only">切换主题</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setThemeMode("light")}>
          {settings.themeMode === "light" ? "Light · 当前" : "Light"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemeMode("dark")}>
          {settings.themeMode === "dark" ? "Dark · 当前" : "Dark"}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setThemeMode("system")}>
          {settings.themeMode === "system" ? "System · 当前" : "System"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
