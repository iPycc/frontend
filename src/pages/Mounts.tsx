import { useEffect, useState } from "react"
import { toast } from "sonner"
import { useLocation, useNavigate } from "react-router-dom"
import { PageShell } from "@/components/shared/PageShell"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState, useAuthState } from "@/state/app"
import { Button } from "@/components/ui/button"
import { IconArrowRight } from "@tabler/icons-react"
import { MountStatus, mountCorsLabels } from "@/components/storage/MountStatus"
import { getProviderDisplayName, ProviderIcon } from "@/components/storage/ProviderIcon"
import { checkMountHealth, type MountHealth } from "@/api/storage"
import { ApiError } from "@/api/client"

export function Mounts() {
  usePageTitle("存储桶")
  const navigate = useNavigate()
  const location = useLocation()
  const { buckets } = useAppState()
  const { authSession } = useAuthState()
  const [checkingId, setCheckingId] = useState<number | null>(null)
  const [health, setHealth] = useState<Record<number, MountHealth>>({})
  const selectedMountId = Number(new URLSearchParams(location.search).get("mount"))

  const handleHealthCheck = async (mountId: number) => {
    if (!authSession || checkingId !== null) return
    setCheckingId(mountId)
    try {
      const result = await checkMountHealth(authSession.tokens.accessToken, mountId)
      setHealth((current) => ({ ...current, [mountId]: result }))
      if (result.status === "healthy") toast.success(result.message)
      else toast.error(result.message, { description: result.code })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "连接检查失败", {
        description: error instanceof ApiError ? error.code : undefined,
      })
    } finally {
      setCheckingId(null)
    }
  }

  useEffect(() => {
    if (selectedMountId && authSession && buckets.some((bucket) => bucket.backendId === selectedMountId)) {
      void handleHealthCheck(selectedMountId)
    }
    // A deep link checks once; manual refresh stays available on each mount.
  }, [selectedMountId, authSession?.tokens.accessToken])

  return (
    <PageShell
      title="连接与挂载"
      className="flex min-h-0 flex-col overflow-hidden"
      contentClassName="custom-scrollbar min-h-0 flex-1 overflow-y-auto pr-2"
      action={
        <Button variant="outline" onClick={() => navigate("/settings/storage")}>
          去管理
          <IconArrowRight size={14} />
        </Button>
      }
    >
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {buckets.map((bucket) => {
          const status = health[bucket.backendId] ?? bucket.extra?._health as MountHealth | undefined
          return <div key={bucket.id} className="min-w-0 rounded-xl border border-border/60 bg-background p-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-2">
                <ProviderIcon driverId={bucket.driverId} provider={bucket.provider} size={28} />
                <div className="min-w-0">
                  <div className="truncate font-medium" title={bucket.name}>{bucket.name}</div>
                  <div className="truncate text-sm text-muted-foreground">
                    {getProviderDisplayName(bucket.driverId, bucket.provider)}
                  </div>
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted-foreground">{mountCorsLabels[bucket.corsStatus]}</span>
            </div>
            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
              <div className="break-all">Bucket：{bucket.bucket || "local"}</div>
              <div>Region：{bucket.region || "本机"}</div>
              <div>策略：{bucket.strategy.multipartThreshold} / {bucket.strategy.partSize}</div>
              <div className="break-all">前缀：{bucket.rootPath || "存储桶根目录"}</div>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2 border-t border-border/50 pt-2">
              <MountStatus bucket={bucket} />
              <Button
                size="sm"
                variant="ghost"
                className="h-7 shrink-0 px-2 text-xs"
                disabled={checkingId !== null}
                onClick={() => void handleHealthCheck(bucket.backendId)}
              >
                {checkingId === bucket.backendId ? "检查中" : "检查连接"}
              </Button>
            </div>
            {status && status.status !== "healthy" ? (
              <div className="mt-2 flex items-start justify-between gap-2 text-xs text-destructive" role="status">
                <div className="min-w-0 [overflow-wrap:anywhere]">
                  <div>{status.message || "连接检查失败，请重新检查连接"}</div>
                  {status.code ? <div>{status.code}</div> : null}
                </div>
                {(bucket.extra?.requires_reauthorization === true ||
                  status.status === "reauthorization_required") && bucket.canEditConnection ? (
                  <Button size="sm" variant="outline" className="h-7 shrink-0" onClick={() => navigate("/settings/storage")}>重新授权</Button>
                ) : null}
              </div>
            ) : null}
          </div>
        })}
      </div>
    </PageShell>
  )
}
