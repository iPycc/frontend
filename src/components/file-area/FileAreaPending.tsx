import { Skeleton } from "@/components/ui/skeleton"

export function FileAreaPending() {
  return (
    <div className="app-panel relative flex flex-1 flex-col overflow-hidden rounded-xl border border-border p-3 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:shadow-none md:p-5">
      <FileAreaPendingContent />
    </div>
  )
}

export function FileAreaPendingContent() {
  return (
    <div className="flex flex-col gap-8" role="status" aria-label="正在读取目录内容">
      <PendingSection title="文件夹" lines={1} />
      <PendingSection title="文件" lines={2} />
    </div>
  )
}

function PendingSection({ title, lines }: { title: string; lines: number }) {
  return (
    <section aria-label={title}>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      <div className="mt-3 flex max-w-2xl flex-col gap-2" aria-hidden="true">
        {Array.from({ length: lines }, (_, index) => (
          <Skeleton key={index} className={index === 0 ? "h-3 w-full" : "h-3 w-4/5"} />
        ))}
      </div>
    </section>
  )
}
