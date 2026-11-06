import * as React from "react"
import { toast } from "sonner"

import { manageOssDomains, type OssDomainResult } from "@/api/user-storage"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AliyunDomains({ mountId, accessToken, domain, onUseDomain }: {
  mountId: number
  accessToken: string
  domain: string
  onUseDomain: (domain: string) => void
}) {
  const [name, setName] = React.useState(domain)
  const [listing, setListing] = React.useState<OssDomainResult | null>(null)
  const [verification, setVerification] = React.useState<OssDomainResult | null>(null)
  const [check, setCheck] = React.useState<OssDomainResult | null>(null)
  const [busy, setBusy] = React.useState(false)
  const [error, setError] = React.useState("")

  async function run(action: "list" | "token" | "bind" | "unbind" | "check", target = name) {
    setBusy(true)
    setError("")
    setCheck(null)
    try {
      const result = await manageOssDomains(accessToken, mountId, action, target)
      if (action === "list") setListing(result)
      if (action === "token") setVerification(result)
      if (action === "check") setCheck(result)
      if (action === "bind" || action === "unbind") {
        setVerification(null)
        toast.success(action === "bind" ? "域名已绑定，请配置 CNAME 解析后保存下载域名。" : "域名已解绑，请到 DNS 服务商删除对应解析。")
        try {
          setListing(await manageOssDomains(accessToken, mountId, "list"))
        } catch {
          setListing(null)
          setError("域名操作已成功，但列表刷新失败，请重新查询绑定。")
        }
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : "域名操作失败")
    } finally {
      setBusy(false)
    }
  }

  return <section className="flex flex-col gap-4 px-4 py-6 sm:px-6">
    <div className="flex items-center justify-between gap-4">
      <h3 className="text-lg font-semibold">Bucket 域名</h3>
      <Button variant="outline" size="sm" disabled={busy} onClick={() => void run("list", "")}>查询绑定</Button>
    </div>
    <p className="text-sm text-muted-foreground">操作使用已保存的连接配置，影响整个 Bucket。DNS 解析和 HTTPS 证书在云控制台配置。</p>
    <div className="flex flex-wrap gap-2">
      <Input className="min-w-48 flex-1" aria-label="待绑定域名" placeholder="files.example.com" value={name} disabled={busy} onChange={(event) => { setName(event.target.value); setVerification(null); setCheck(null) }} />
      <Button variant="outline" disabled={busy || !name.trim()} onClick={() => void run("token")}>获取验证记录</Button>
      <Button disabled={busy || !name.trim()} onClick={() => void run("bind")}>绑定域名</Button>
      <Button variant="outline" disabled={busy || !name.trim()} onClick={() => void run("check")}>检查域名</Button>
    </div>
    {error ? <p role="alert" className="text-sm text-destructive">{error}</p> : null}
    {check ? <div role="status" className="flex flex-col gap-2 text-sm">
      <p>{check.domain}：{check.bound ? `已绑定（${check.status}）` : "尚未绑定到此 Bucket"}</p>
      <p className="text-muted-foreground">DNS 和 HTTPS 请通过实际访问验证。{check.test_url ? "测试链接有效期 5 分钟。" : "当前挂载没有可用于测试的文件。"}</p>
      {check.test_url ? <a className="text-primary underline" href={check.test_url} target="_blank" rel="noreferrer">打开文件测试下载</a> : null}
    </div> : null}
    {verification ? <dl className="grid gap-2 text-sm sm:grid-cols-[6rem_1fr]">
      <dt>TXT 记录名</dt><dd className="break-all font-mono select-all">{verification.txt_name}</dd>
      <dt>记录值</dt><dd className="break-all font-mono select-all">{verification.token}</dd>
      <dt>有效期至</dt><dd>{verification.expires_at}</dd>
      <dt>CNAME 目标</dt><dd className="break-all font-mono select-all">{verification.cname_target}</dd>
    </dl> : null}
    {listing ? <div className="flex flex-col gap-3">
      <p className="break-all text-sm">CNAME 目标：<span className="font-mono select-all">{listing.cname_target}</span></p>
      {listing.domains?.length ? listing.domains.map((item) => <div key={item.domain} className="flex flex-wrap items-center gap-3 border-b pb-3 text-sm">
        <span className="min-w-0 flex-1 break-all">{item.domain}</span>
        <span className="text-muted-foreground">{item.status}</span>
        <Button size="sm" variant="outline" disabled={busy} onClick={() => { setName(item.domain); setVerification(null); setCheck(null); onUseDomain(item.domain) }}>用于下载</Button>
        <Button size="sm" variant="ghost" disabled={busy} onClick={() => { if (window.confirm(`解绑 ${item.domain}？此 Bucket 下使用该域名的链接将无法访问。`)) void run("unbind", item.domain) }}>解绑</Button>
      </div>) : <p className="text-sm text-muted-foreground">此 Bucket 尚未绑定域名。</p>}
    </div> : null}
  </section>
}
