import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { SearchIcon } from "lucide-react"

import { cn } from "@/lib/utils"

function BaseInput({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-1 text-base transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus:border-[color:var(--focus-border)] focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-[color:var(--focus-border)] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-0 md:text-sm dark:bg-input/30 dark:disabled:bg-input/80 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-0",
        className
      )}
      {...props}
    />
  )
}

type SearchInputProps = React.ComponentProps<"input"> & {
  trailing?: React.ReactNode
}

const Search = React.forwardRef<HTMLInputElement, SearchInputProps>(function Search(
  { className, trailing, ...props },
  ref
) {
  return (
    <div className="relative">
      <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <InputPrimitive
        ref={ref}
        data-slot="input-search"
        className={cn(
          "h-10 min-w-0 rounded-lg border border-input bg-transparent py-1 pl-9 pr-2.5 text-base transition-colors outline-none placeholder:text-muted-foreground focus:border-[color:var(--focus-border)] focus:outline-none focus:ring-0 focus:shadow-none focus-visible:border-[color:var(--focus-border)] focus-visible:outline-none focus-visible:ring-0 focus-visible:shadow-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:bg-input/50 disabled:opacity-50 aria-invalid:border-destructive md:text-sm dark:bg-input/30 dark:aria-invalid:border-destructive/50",
          trailing ? "pr-10" : "",
          className
        )}
        {...props}
      />
      {trailing ? (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
          {trailing}
        </div>
      ) : null}
    </div>
  )
})

const Input = Object.assign(BaseInput, { Search })

export { Input }
