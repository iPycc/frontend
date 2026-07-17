import { Outlet } from "react-router-dom"

import { FilingBar } from "@/components/shared/FilingBar"
import { ShareNavbar } from "./ShareNavbar"

export function ShareLayout() {
  return (
    <div className="custom-scrollbar flex h-full min-h-0 flex-col overflow-x-hidden overflow-y-auto bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-[20%] left-1/2 aspect-square w-[120%] -translate-x-1/2 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute top-[40%] -right-[10%] aspect-square w-[60%] rounded-full bg-primary/[0.03] blur-3xl" />
      </div>
      <ShareNavbar />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <footer className="mt-auto shrink-0 px-4 pb-6 pt-2 sm:px-6 lg:px-8">
        <p className="text-center text-xs text-muted-foreground/80">
          此页面由 Cloudrave 分享服务提供。若内容涉及侵权或违规，请联系我们处理。
        </p>
        <div className="mt-2 flex justify-center">
          <FilingBar className="text-xs" />
        </div>
      </footer>
    </div>
  )
}
