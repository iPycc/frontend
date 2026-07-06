import * as React from "react"
import { IconArrowLeft, IconExternalLink } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import type { BucketMount } from "@/lib/models"

interface PolicyEditPageProps {
  bucket: BucketMount
  onBack: () => void
  onSave: () => void
}

// 响应式行：移动端单列（标签上，控件下），桌面端两列
function Row({
  label,
  hint,
  children,
}: {
  label: string
  hint?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-border/40 py-4 last:border-0 sm:grid sm:grid-cols-[1fr_1.4fr] sm:items-start sm:gap-x-10 sm:py-5">
      <div className="space-y-1">
        <div className="text-[15px] font-semibold tracking-wide">{label}</div>
        {hint && (
          <div className="text-sm leading-relaxed tracking-wide text-muted-foreground">{hint}</div>
        )}
      </div>
      <div>{children}</div>
    </div>
  )
}

const corsRule = {
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "HEAD"],
  allowHeaders: "*",
  exposeHeaders: "ETag",
  maxAge: 3600,
}

export function PolicyEditPage({ bucket, onBack, onSave }: PolicyEditPageProps) {
  const [policyName, setPolicyName] = React.useState(bucket.name)
  const [bucketName, setBucketName] = React.useState(bucket.bucket ?? "")
  const [accessPermission, setAccessPermission] = React.useState<"private" | "public-read">("private")
  const [accessDomain, setAccessDomain] = React.useState(bucket.endpoint ?? "")
  const [secretId, setSecretId] = React.useState(bucket.secretId ?? "")
  const [secretKey, setSecretKey] = React.useState(bucket.secretKey ?? "")
  const [blobDir, setBlobDir] = React.useState("uploads/{uid}/{path}")
  const [blobName, setBlobName] = React.useState("{uuid}_{originname}")
  const [chunkSize, setChunkSize] = React.useState("25")
  const [chunkSizeUnit, setChunkSizeUnit] = React.useState("MB")
  const [parallelChunks, setParallelChunks] = React.useState("3")

  return (
    <div className="flex flex-col gap-8">
      {/* 返回 + 标题同一行 */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 px-3 py-2 text-[15px] text-muted-foreground hover:text-foreground"
          onClick={onBack}
        >
          <IconArrowLeft size={16} />
          返回
        </Button>
        <h2 className="text-xl font-semibold tracking-wide">编辑 {bucket.name}</h2>
      </div>

      {/* 基本信息 */}
      <section>
        <h3 className="mb-2 text-lg font-semibold tracking-wide">基本信息</h3>
        <div className="rounded-md px-4">
          <Row label="名称" hint="存储策略的展示名，也会用于向用户展示。">
            <Input
              className="h-10 w-full text-[15px]"
              value={policyName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPolicyName(e.target.value)}
            />
          </Row>

          <Row
            label="存储桶名称"
            hint={
              <>
                前往{" "}
                <a
                  href="https://console.cloud.tencent.com/cos/bucket"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
                >
                  COS 管理控制台<IconExternalLink size={12} />
                </a>{" "}
                创建存储桶，转到所创建存储桶的基础配置页面，将{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">存储桶名称</code>{" "}
                填写到上方。
              </>
            }
          >
            <Input
              className="h-10 w-full text-[15px]"
              value={bucketName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBucketName(e.target.value)}
            />
          </Row>

          <Row label="访问权限" hint="请选择你创建的存储空间的读写权限类型。">
            <Select
              value={accessPermission}
              onValueChange={(v: string) => setAccessPermission(v as "private" | "public-read")}
            >
              <SelectTrigger className="h-10 w-full text-[15px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private">私有读写</SelectItem>
                <SelectItem value="public-read">公有读私有写</SelectItem>
              </SelectContent>
            </Select>
          </Row>

          <Row
            label="访问域名"
            hint={
              <>
                在所创建 Bucket 的概况页面，填写{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">域名信息</code>{" "}
                栏目下给出的{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">访问域名</code>
                。你也可以使用自己绑定的源站域名或 CDN 加速域名。
              </>
            }
          >
            <Input
              className="h-10 w-full text-[15px]"
              value={accessDomain}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setAccessDomain(e.target.value)}
            />
          </Row>

          <Row
            label="访问凭证"
            hint={
              <>
                填写在腾讯云{" "}
                <a
                  href="https://console.cloud.tencent.com/cam/capi"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-0.5 text-primary hover:underline"
                >
                  访问密钥<IconExternalLink size={12} />
                </a>{" "}
                页面获取一对访问密钥。请确保这对密钥拥有 COS 服务的访问权限。
              </>
            }
          >
            <div className="flex gap-3">
              <Input
                className="h-10 flex-1 text-[15px]"
                value={secretId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecretId(e.target.value)}
                placeholder="SecretId"
              />
              <Input
                type="password"
                className="h-10 flex-1 text-[15px]"
                value={secretKey}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSecretKey(e.target.value)}
                placeholder="SecretKey"
              />
            </div>
          </Row>
        </div>
      </section>

      {/* 跨域策略 */}
      <section className="space-y-4">
        <h3 className="text-lg font-semibold tracking-wide">跨域策略</h3>
        <div className="overflow-hidden rounded-md border border-border/50">
          <Table>
            <TableHeader className="bg-muted">
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
                <TableCell className="font-mono text-[15px]">{corsRule.origin}</TableCell>
                <TableCell>
                  <div className="space-y-0.5 font-mono text-[15px]">
                    {corsRule.methods.map((m: string) => <div key={m}>{m}</div>)}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-[15px]">{corsRule.allowHeaders}</TableCell>
                <TableCell className="font-mono text-[15px]">{corsRule.exposeHeaders}</TableCell>
                <TableCell className="font-mono text-[15px]">{corsRule.maxAge}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          此存储策略需要正确配置如上跨域策略后才能使用 Web 端上传文件，Cloudrave 可以帮你自动设置，你也可以手动设置。如果你已设置过此 Bucket 的跨域策略，此步骤可以跳过。
        </p>
        <Button variant="default" className="px-5 py-2.5 text-[15px]">
          让 Cloudrave 帮我设置
        </Button>
      </section>

      {/* 存储与上传 */}
      <section>
        <h3 className="mb-2 text-lg font-semibold tracking-wide">存储与上传</h3>
        <div className="rounded-md px-4">
          <Row
            label="Blob 存储目录"
            hint="文件 Blob 的存放目录，可以使用魔法变量。修改此设置不会影响存储策略下已有文件。"
          >
            <Input
              className="h-10 w-full text-[15px]"
              value={blobDir}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBlobDir(e.target.value)}
            />
          </Row>

          <Row
            label="Blob 名称"
            hint="文件 Blob 的名称，可以使用魔法变量，需要确保为绝对唯一。修改此设置不会影响存储策略下已有文件。"
          >
            <Input
              className="h-10 w-full text-[15px]"
              value={blobName}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setBlobName(e.target.value)}
            />
          </Row>

          <Row
            label="上传分片大小"
            hint="允许范围：1 MB ~ 1 GB，通过分片上传，用户上传的文件将会被切分成分片逐个上传到存储端。"
          >
            <div className="flex h-10 w-48 overflow-hidden rounded-md border border-input bg-transparent focus-within:ring-1 focus-within:ring-ring">
              <input
                className="h-full min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none"
                value={chunkSize}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setChunkSize(e.target.value)}
              />
              <div className="flex items-center border-l border-input">
                <Select value={chunkSizeUnit} onValueChange={setChunkSizeUnit}>
                  <SelectTrigger className="h-full w-20 rounded-none border-0 text-[15px] shadow-none focus:ring-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="B">B</SelectItem>
                    <SelectItem value="KB">KB</SelectItem>
                    <SelectItem value="MB">MB</SelectItem>
                    <SelectItem value="GB">GB</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Row>

          <Row label="并行上传分片数">
            <Input
              className="h-10 w-28 text-[15px]"
              value={parallelChunks}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setParallelChunks(e.target.value)}
            />
          </Row>
        </div>
      </section>

      {/* 保存 */}
      <div>
        <Button className="px-6 py-2.5 text-[15px]" onClick={onSave}>
          保存
        </Button>
      </div>
    </div>
  )
}

