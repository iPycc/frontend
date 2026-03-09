import { IconSearch, IconMoon, IconSun, IconSettings, IconPlus } from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { SidebarTrigger } from "./ui/sidebar";

export function Navbar() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [isDark]);

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-background border-b border-border/50 relative h-[65px] shrink-0">
      <div className="flex items-center gap-4">
        <SidebarTrigger className="text-muted-foreground hover:text-foreground" />
        
        <button className="flex items-center gap-1 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm">
          <IconPlus size={18} />
          新建
        </button>

        <div className="relative w-64">
          <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={16} />
          <input
            type="text"
            placeholder="按下 / 开始搜索"
            className="w-full bg-muted/50 border border-border text-foreground rounded-full pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-shadow"
          />
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={() => setIsDark(!isDark)}
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors"
        >
          {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
        </button>
        <button className="p-2 text-muted-foreground hover:text-foreground hover:bg-accent rounded-full transition-colors">
          <IconSettings size={20} />
        </button>
        <button className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-200 to-orange-400 flex items-center justify-center text-white overflow-hidden ml-2">
          <img src="https://api.dicebear.com/7.x/notionists/svg?seed=Felix" alt="avatar" className="w-full h-full object-cover" />
        </button>
      </div>
    </header>
  );
}
