import * as React from "react"
import { IconArrowLeft } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

export function StorageFormHeader({
  title,
  onBack,
}: {
  title: string
  onBack?: () => void
}) {
  return (
    <div className="flex items-center gap-3">
      {onBack ? (
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-3 py-2 text-[15px] text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <IconArrowLeft size={16} />
          上一步
        </Button>
      ) : null}
      <h2 className="text-xl font-semibold tracking-wide">{title}</h2>
    </div>
  )
}

export function FormCard({
  title,
  description,
  children,
  footer,
  className,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}) {
  return (
    <Card className={cn("gap-0 overflow-hidden border-none bg-muted/20 shadow-none sm:rounded-3xl", className)}>
      <CardHeader className="gap-1 border-b border-border/40 px-4 sm:px-6">
        <CardTitle className="text-[17px] tracking-wide">{title}</CardTitle>
        {description ? <CardDescription className="text-[13px] leading-relaxed">{description}</CardDescription> : null}
      </CardHeader>
      <CardContent className="px-2 py-1 sm:px-6">{children}</CardContent>
      {footer ? <CardFooter className="px-4 pb-4 pt-2 sm:px-6">{footer}</CardFooter> : null}
    </Card>
  )
}

export function FormRow({
  label,
  hint,
  children,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/40 py-4 last:border-0 sm:grid sm:grid-cols-[1fr_1.6fr] sm:items-start sm:gap-x-12 sm:py-4">
      <div className="space-y-1">
        <div className="text-[14px] font-medium tracking-wide sm:text-[15px]">{label}</div>
        {hint ? <div className="text-[13px] leading-relaxed text-muted-foreground">{hint}</div> : null}
      </div>
      <div className="mt-1 sm:mt-0">{children}</div>
    </div>
  )
}

export function PathValidator({
  isValid,
  message,
}: {
  isValid: boolean
  message: string
}) {
  return (
    <div className={cn("mt-2 text-xs", isValid ? "text-emerald-600 dark:text-emerald-400" : "text-destructive")}>
      {message}
    </div>
  )
}
