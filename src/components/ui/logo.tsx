import { cn } from "@/lib/utils"

export function Logo({
  showText = false,
  className,
}: {
  showText?: boolean
  className?: string
}) {
  return (
    <div className={cn("flex items-center gap-2 text-primary", className)}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="h-8 w-8 shrink-0">
        <circle cx="12" cy="12" r="12" fill="#0ea5e9" />
        <path d="M6.5 9 v4 a5.5 5.5 0 0 0 11 0 v-4" stroke="#fff" strokeWidth="2" strokeLinecap="round" fill="none" />
        <path d="M12 11.5 14.5 14 12 16.5 9.5 14Z" fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
        <g opacity="0.6">
          <path d="M12 5.5 14.5 8 12 10.5 9.5 8Z" fill="#fff" stroke="#fff" strokeWidth="1" strokeLinejoin="round" />
        </g>
      </svg>
      {showText && <span className="text-xl tracking-tight text-current font-[600] ">Cloudrave</span>}
    </div>
  )
}
