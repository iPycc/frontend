import * as React from "react"
import { IconArrowLeft } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface CorsStepProps {
  onBack: () => void
  onSubmit: () => void
}

const corsRule = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "HEAD"],
  allowHeaders: "*",
  exposeHeaders: "ETag",
  maxAge: 3600,
}

export function CorsStep({ onBack, onSubmit }: CorsStepProps) {
  const [corsAction, setCorsAction] = React.useState<"auto" | "manual" | null>(null)

  return (
    <div className="flex flex-col gap-8">
      {/* Back + Title */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-3 py-2 text-[15px] text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <IconArrowLeft size={16} />
          上一步
        </Button>
        <h2 className="text-xl font-semibold tracking-wide">跨域策略</h2>
      </div>

      <div className="overflow-hidden rounded-md border border-border/60">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20 text-sm">来源</TableHead>
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
                  {corsRule.methods.map((m) => <div key={m}>{m}</div>)}
                </div>
              </TableCell>
              <TableCell className="font-mono text-base">{corsRule.allowHeaders}</TableCell>
              <TableCell className="font-mono text-base">{corsRule.exposeHeaders}</TableCell>
              <TableCell className="font-mono text-base">{corsRule.maxAge}</TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <p className="text-sm leading-relaxed text-muted-foreground">
        此存储策略需要正确配置如上跨域策略后才能使用 Web 端上传文件，Cloudrave 可以帮你自动设置，你也可以手动设置。如果你已设置过此 Bucket 的跨域策略，此步骤可以跳过。
      </p>

      {corsAction === null ? (
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" size="lg" className="px-5 py-2.5 text-[15px]" onClick={() => setCorsAction("auto")}>
            让 Cloudrave 帮我设置
          </Button>
          <Button variant="outline" size="lg" className="px-5 py-2.5 text-[15px]" onClick={() => setCorsAction("manual")}>
            我自行设置
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            {corsAction === "auto" ? "Cloudrave 将在创建后自动配置跨域策略。" : "请在创建后手动前往 COS 控制台配置跨域策略。"}
          </p>
          <Button size="lg" className="px-6 py-2.5 text-[15px]" onClick={onSubmit}>创建</Button>
        </div>
      )}
    </div>
  )
}
