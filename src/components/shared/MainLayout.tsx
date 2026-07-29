import * as React from "react"
import { Outlet } from "react-router-dom"

import { NavbarLayout } from "@/components/navbar"
import { SidebarLayout } from "@/components/sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useAppState } from "@/state/app"
import { PropertiesPanelProvider, usePropertiesPanel } from "./PropertiesPanelContext"

const PropertiesPanel = React.lazy(() => import("./PropertiesPanel").then((module) => ({ default: module.PropertiesPanel })))
const SiteUrlMismatchAlert = React.lazy(() => import("./SiteUrlMismatchAlert").then((module) => ({ default: module.SiteUrlMismatchAlert })))

export function MainLayout() {
  const { activeBucket, formatBytes } = useAppState()

  return (
    <SidebarProvider>
      <PropertiesPanelProvider bucketName={activeBucket.name} formatBytes={formatBytes}>
        <div className="app-shell flex h-screen w-full overflow-hidden text-foreground">
          <SidebarLayout />
          <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            <NavbarLayout />
            <main className="flex min-h-0 flex-1 overflow-hidden px-1 pb-2 sm:px-2 sm:pb-3 md:px-4 md:pb-4">
              <div className="relative flex min-w-0 flex-1 flex-col gap-1.5 overflow-hidden transition-[width] duration-200 ease-out sm:gap-2">
                <Outlet />
              </div>
              <PropertiesPanelSlot />
            </main>
          </div>
        </div>
        <React.Suspense fallback={null}><SiteUrlMismatchAlert /></React.Suspense>
      </PropertiesPanelProvider>
    </SidebarProvider>
  )
}

function PropertiesPanelSlot() {
  const { node } = usePropertiesPanel()
  const [activated, setActivated] = React.useState(false)

  React.useEffect(() => {
    if (node) setActivated(true)
  }, [node])

  if (!activated) return null
  return <React.Suspense fallback={null}><PropertiesPanel /></React.Suspense>
}
