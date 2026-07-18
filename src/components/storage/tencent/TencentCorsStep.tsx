import * as React from "react"

import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { FormCard, StorageFormHeader } from "@/components/storage/shared"

interface TencentCorsStepProps {
  onBack: () => void
  onSubmit: (autoConfigure: boolean) => void
}

const corsRule = {
  origin: typeof window === "undefined" ? "current site" : window.location.origin,
  methods: ["GET", "POST", "PUT", "HEAD"],
  allowHeaders: "*",
  exposeHeaders: "ETag, Content-Length, Content-Range",
  maxAge: 600,
}

export function TencentCorsStep({ onBack, onSubmit }: TencentCorsStepProps) {
  const [corsAction, setCorsAction] = React.useState<"auto" | "manual" | null>(null)

  return (
    <div className="flex flex-col gap-3 sm:gap-3">
      <StorageFormHeader title="跨域策略" onBack={onBack} />

      <FormCard
        title="CORS 配置"
        description="腾讯云 COS 跨域校验与配置引导。"
        footer={
          corsAction === null ? (
            <div className="flex flex-wrap gap-3 pt-5">
              <Button variant="default" size="lg" className="px-4 py-2 text-[14px]" onClick={() => setCorsAction("auto")}>
                让 Cloudrave 帮我设置
              </Button>
              <Button variant="outline" size="lg" className="px-4 py-2 text-[14px]" onClick={() => setCorsAction("manual")}>
                我自行设置
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-4 pt-5">
              <p className="text-sm text-muted-foreground">
                {corsAction === "auto" ? "Cloudrave 将在创建后自动配置跨域策略。" : "请在创建后手动前往 COS 控制台配置跨域策略。"}
              </p>
              <Button
                size="lg"
                className="px-6 py-2.5 text-[15px]"
                onClick={() => onSubmit(corsAction === "auto")}
              >
                创建
              </Button>
            </div>
          )
        }
      >
        <div className="mt-5 overflow-hidden rounded-md border border-border/60 ">
          <Table>
            <TableHeader className="bg-muted">
              <TableRow>
                <TableHead className="text-sm">来源</TableHead>
                <TableHead className="text-sm">允许 Methods</TableHead>
                <TableHead className="text-sm">允许 Headers</TableHead>
                <TableHead className="text-sm">暴露 Headers</TableHead>
                <TableHead className="w-28 text-sm">缓存时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-mono text-base">{corsRule.origin}</TableCell>
                <TableCell>
                  <div className="space-y-1 font-mono text-base">
                    {corsRule.methods.map((method) => <div key={method}>{method}</div>)}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-base">{corsRule.allowHeaders}</TableCell>
                <TableCell className="font-mono text-base">{corsRule.exposeHeaders}</TableCell>
                <TableCell className="font-mono text-base">{corsRule.maxAge}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </FormCard>
    </div>
  )
}
