import { Logo } from "@/components/ui/logo"

export function ShareFooter() {
  return (
    <footer className="border-t border-border/60 bg-background/80 py-8">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Logo className="text-primary" />
          <span className="text-sm">Cloudrave</span>
        </div>
        <p className="text-center text-sm text-muted-foreground">
          安全、快速地分享你的文件与文件夹。
        </p>
        <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Cloudrave</p>
      </div>
    </footer>
  )
}
