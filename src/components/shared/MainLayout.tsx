import { Outlet } from "react-router-dom"

import { NavbarLayout } from "@/components/navbar"
import { SidebarLayout } from "@/components/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useAppState } from "@/lib/app-state"
import { PropertiesPanelProvider, PropertiesPanel } from "./PropertiesPanel"

export function MainLayout() {
  const { activeBucket, formatBytes } = useAppState()

  return (
    <SidebarProvider>
      <PropertiesPanelProvider bucketName={activeBucket.name} formatBytes={formatBytes}>
        <div className="app-shell flex h-screen w-full overflow-hidden text-foreground">
          <SidebarLayout />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <NavbarLayout />
            <main className="flex min-h-0 flex-1 gap-1.5 overflow-hidden px-1 pb-2 sm:gap-2 sm:px-2 sm:pb-3 md:px-4 md:pb-4">
              <div className="flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden sm:gap-2">
                <Outlet />
              </div>
              <PropertiesPanel />
            </main>
          </div>
        </div>
      </PropertiesPanelProvider>
    </SidebarProvider>
  )
}
