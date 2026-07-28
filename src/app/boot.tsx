import { Skeleton } from "@/components/ui/skeleton"

export function Boot() {
  return (
    <div className="app-shell flex h-screen w-full overflow-hidden text-foreground">
      <aside className="hidden h-full w-64 border-r border-border/60 bg-background/95 p-4 md:flex md:flex-col md:gap-4">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <div className="space-y-3">
          <Skeleton className="h-9 w-full rounded-xl" />
          <Skeleton className="h-9 w-11/12 rounded-xl" />
          <Skeleton className="h-9 w-10/12 rounded-xl" />
          <Skeleton className="h-9 w-full rounded-xl" />
        </div>
        <div className="mt-auto space-y-3">
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-10 w-full rounded-xl" />
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="border-b border-border/60 bg-background/95 px-3 py-3 sm:px-4 md:px-6">
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-28 rounded-xl md:hidden" />
            <Skeleton className="h-10 flex-1 rounded-xl" />
            <Skeleton className="h-10 w-10 rounded-full" />
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </header>
        <main className="flex min-h-0 flex-1 overflow-hidden px-1 pb-2 sm:px-2 sm:pb-3 md:px-4 md:pb-4">
          <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden rounded-2xl border border-border/50 bg-background/70 p-4 md:p-5">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-8 w-28 rounded-lg" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
                <Skeleton className="h-8 w-16 rounded-lg" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
              <Skeleton className="h-40 rounded-2xl" />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
