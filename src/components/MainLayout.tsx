import { Outlet } from "react-router-dom"

import { Navbar } from "./Navbar"
import { AppSidebar } from "./Sidebar"
import { SidebarProvider } from "./ui/sidebar"

export function MainLayout() {
  return (
    <SidebarProvider>
      <div className="app-shell flex h-screen w-full overflow-hidden text-foreground">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Navbar />
          <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4 pt-0">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
