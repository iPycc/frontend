import * as React from "react"

import { cn } from "@/lib/utils"
import { useAppState } from "@/state/app"

export function ThemeToggleGlyph({
  isDark,
  size = 22,
  className,
}: {
  isDark: boolean
  size?: number
  className?: string
}) {
  return (
    <span
      className={cn("relative inline-flex items-center justify-center select-none", className)}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* 太阳图标：在亮色模式或暗黑悬停切换时展现光芒旋转与缩放 */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn(
          "absolute inset-0 size-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          isDark
            ? "scale-100 rotate-0 text-amber-400 opacity-100"
            : "scale-0 -rotate-90 text-amber-500 opacity-0"
        )}
      >
        <circle
          cx="12"
          cy="12"
          r="4.5"
          fill="currentColor"
          fillOpacity="0.2"
          stroke="currentColor"
          strokeWidth="1.8"
        />
        <g
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          className={cn(
            "origin-center transition-transform duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            isDark ? "scale-100 rotate-0" : "scale-50 -rotate-45"
          )}
        >
          <path d="M12 2.5V4.5" />
          <path d="M12 19.5V21.5" />
          <path d="M4.5 12H2.5" />
          <path d="M21.5 12H19.5" />
          <path d="M5.99 5.99L4.58 4.58" />
          <path d="M19.42 19.42L18.01 18.01" />
          <path d="M18.01 5.99L19.42 4.58" />
          <path d="M4.58 19.42L5.99 18.01" />
        </g>
      </svg>

      {/* 月亮与星辰图标 */}
      <svg
        viewBox="0 0 24 24"
        fill="none"
        className={cn(
          "absolute inset-0 size-full transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
          !isDark
            ? "scale-100 rotate-0 text-current opacity-100"
            : "scale-0 rotate-90 text-sky-300 opacity-0"
        )}
      >
        <path
          d="M20.354 15.354A9 9 0 0 1 8.646 3.646 9.003 9.003 0 0 0 12 21a9.003 9.003 0 0 0 8.354-5.646Z"
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <g
          fill="currentColor"
          className={cn(
            "origin-center transition-all duration-500 delay-75",
            !isDark ? "scale-100 opacity-90" : "scale-0 opacity-0"
          )}
        >
          <circle cx="17.5" cy="5.5" r="1" />
          <circle cx="20" cy="9" r="0.75" />
        </g>
      </svg>
    </span>
  )
}

export function ThemeToggleButton({
  className,
  iconSize = 22,
}: {
  className?: string
  iconSize?: number
}) {
  const { effectiveTheme, setThemeMode } = useAppState()
  const isDark = effectiveTheme === "dark"

  const handleToggle = (event: React.MouseEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const x = event.clientX || rect.left + rect.width / 2
    const y = event.clientY || rect.top + rect.height / 2
    setThemeMode(isDark ? "light" : "dark", { x, y })
  }

  return (
    <button
      type="button"
      onClick={handleToggle}
      className={cn(
        "group relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full text-[#666666] transition-all duration-300 hover:bg-white hover:text-[#2b2b2b] active:scale-92 md:h-10 md:w-10 dark:text-[#b7b7b7] dark:hover:bg-[#1d1d1d] dark:hover:text-[#f1f1f1]",
        className
      )}
      aria-label={isDark ? "切换为浅色模式" : "切换为暗黑模式"}
      title={isDark ? "切换为浅色模式" : "切换为暗黑模式"}
    >
      <span
        className={cn(
          "pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100",
          isDark
            ? "bg-radial from-amber-400/18 via-amber-400/5 to-transparent"
            : "bg-radial from-primary/16 via-primary/5 to-transparent"
        )}
        aria-hidden="true"
      />
      <ThemeToggleGlyph
        isDark={isDark}
        size={iconSize}
        className="transition-transform duration-300 group-hover:scale-110"
      />
    </button>
  )
}
