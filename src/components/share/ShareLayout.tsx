import { Outlet } from "react-router-dom"

import { ShareFooter } from "./ShareFooter"
import { ShareNavbar } from "./ShareNavbar"

export function ShareLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 aspect-square w-[120%] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute top-[40%] -right-[10%] aspect-square w-[60%] rounded-full bg-primary/[0.03] blur-3xl" />
      </div>
      <ShareNavbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <ShareFooter />
    </div>
  )
}
