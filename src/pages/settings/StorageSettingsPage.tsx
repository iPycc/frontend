import * as React from "react"
import { toast } from "sonner"

import { useAppState } from "@/lib/app-state"
import {
  getStorageModule,
  LocalStorageForm,
  ProviderSelector,
  resolveStorageStrategy,
  StoragePolicyList,
  TencentCorsStep,
  TencentStorageForm,
} from "@/components/storage"
import {
  buildLocalStoragePath,
  type BucketMount,
} from "@/lib/mock-data"
import type {
  LocalStorageDraft,
  StorageStrategyKey,
  TencentStorageDraft,
} from "@/components/storage"

type View =
  | { type: "list" }
  | { type: "select-provider" }
  | { type: "form"; strategy: StorageStrategyKey }
  | { type: "cors-step" }
  | { type: "edit"; bucket: BucketMount }

function createEmptyTencentDraft(): TencentStorageDraft {
  return {
    name: "",
    bucketName: "",
    accessPermission: "private",
    accessDomain: "",
    secretId: "",
    secretKey: "",
  }
}

function createLocalDraft(seed = "本机存储"): LocalStorageDraft {
  return {
    name: "本机存储",
    path: buildLocalStoragePath(seed),
    pathCustomized: false,
    concurrency: 1,
    multipartThreshold: "25 MB",
    partSize: "25 MB",
  }
}

export function StorageSettingsPage() {
  const { buckets, addBucket, currentUser, profile, updateBucket } = useAppState()
  const [view, setView] = React.useState<View>({ type: "list" })
  const [tencentDraft, setTencentDraft] = React.useState<TencentStorageDraft>(createEmptyTencentDraft)
  const [initialTencentDraft, setInitialTencentDraft] = React.useState<TencentStorageDraft | undefined>()
  const [localDraft, setLocalDraft] = React.useState<LocalStorageDraft>(createLocalDraft(profile.username))
  const [initialLocalDraft, setInitialLocalDraft] = React.useState<LocalStorageDraft | undefined>()

  const currentLocalBucket = React.useMemo(
    () => buckets.find((bucket) => resolveStorageStrategy(bucket) === "local" && !bucket.canDelete),
    [buckets]
  )

  const providerOptions = React.useMemo(() => [
    {
      strategy: "local" as const,
      label: getStorageModule("local").label,
      description: "默认按当前用户独立生成本机目录，支持路径联想和合法性校验。",
      enabled: true,
    },
    {
      strategy: "tencent" as const,
      label: getStorageModule("tencent").label,
      description: "保留原有腾讯云 COS 新增、编辑和跨域配置流程。",
      enabled: true,
    },
    {
      strategy: "aliyun" as const,
      label: getStorageModule("aliyun").label,
      description: "已预留接入位，后续扩展时零侵入主页面。",
      enabled: false,
    },
  ], [])

  const handleAddPolicy = () => {
    setTencentDraft(createEmptyTencentDraft())
    setLocalDraft(createLocalDraft(profile.username))
    setView({ type: "select-provider" })
  }

  const handleProviderSelect = (strategy: StorageStrategyKey) => {
    if (strategy === "local") {
      setLocalDraft(createLocalDraft(profile.username))
      setInitialLocalDraft(undefined)
      setView({ type: "form", strategy: "local" })
      return
    }

    if (strategy === "tencent") {
      setTencentDraft(createEmptyTencentDraft())
      setInitialTencentDraft(undefined)
      setView({ type: "form", strategy: "tencent" })
    }
  }

  const handleTencentNext = () => {
    setView({ type: "cors-step" })
  }

  const handleTencentSubmit = () => {
    addBucket({
      name: tencentDraft.name,
      provider: "Tencent COS",
      storageType: "tencent",
      bucket: tencentDraft.bucketName,
      region: "ap-guangzhou",
      endpoint: tencentDraft.accessDomain,
      secretId: tencentDraft.secretId,
      secretKey: tencentDraft.secretKey,
      basePrefix: "",
      sessionToken: "",
      multipartThreshold: "25 MB",
      partSize: "25 MB",
      presignTtl: "900",
      concurrency: 3,
      protocol: "https",
      pathStyle: false,
      accelerate: false,
      corsConfigured: true,
      advancedMode: false,
      canEditConnection: true,
      canDelete: true,
      canRename: true,
    })
    toast.success("腾讯云 COS 存储策略已创建。")
    setView({ type: "list" })
  }

  const handleLocalSubmit = () => {
    addBucket({
      name: localDraft.name.trim(),
      provider: "Local Storage",
      storageType: "local",
      ownerId: currentUser?.id,
      isLocal: true,
      bucket: localDraft.path,
      region: "",
      endpoint: undefined,
      secretId: "",
      secretKey: "",
      basePrefix: localDraft.path,
      sessionToken: "",
      multipartThreshold: localDraft.multipartThreshold,
      partSize: localDraft.partSize,
      presignTtl: "900",
      concurrency: localDraft.concurrency,
      protocol: "https",
      pathStyle: false,
      accelerate: false,
      corsConfigured: true,
      advancedMode: false,
      canEditConnection: true,
      canDelete: true,
      canRename: true,
    })
    toast.success("本机存储策略已创建。")
    setView({ type: "list" })
  }

  const handleEditPolicy = (bucket: BucketMount) => {
    const strategy = resolveStorageStrategy(bucket)
    if (strategy === "local") {
      const draft = {
        name: bucket.name,
        path: bucket.basePrefix ?? bucket.bucket ?? buildLocalStoragePath(profile.username),
        pathCustomized: true,
        concurrency: bucket.strategy?.concurrency ?? 1,
        multipartThreshold: bucket.strategy?.multipartThreshold ?? "25 MB",
        partSize: bucket.strategy?.partSize ?? "25 MB",
      }
      setLocalDraft(draft)
      setInitialLocalDraft(draft)
    } else {
      const draft = {
        name: bucket.name,
        bucketName: bucket.bucket ?? "",
        accessPermission: "private" as const,
        accessDomain: bucket.endpoint ?? "",
        secretId: bucket.secretId ?? "",
        secretKey: bucket.secretKey ?? "",
      }
      setTencentDraft(draft)
      setInitialTencentDraft(draft)
    }
    setView({ type: "edit", bucket })
  }

  const handleDeletePolicy = (bucket: BucketMount) => {
    toast.info(`暂未接入删除逻辑：${bucket.name}`)
  }

  const handleSaveEdit = (bucket: BucketMount) => {
    const strategy = resolveStorageStrategy(bucket)

    if (strategy === "local") {
      updateBucket(bucket.id, {
        name: localDraft.name.trim(),
        provider: "Local Storage",
        storageType: "local",
        ownerId: bucket.ownerId ?? currentUser?.id,
        bucket: localDraft.path,
        basePrefix: localDraft.path,
        corsMessage: `本机目录已绑定：${localDraft.path}`,
        isLocal: true,
        strategy: {
          multipartThreshold: localDraft.multipartThreshold,
          partSize: localDraft.partSize,
          presignTtl: bucket.strategy?.presignTtl ?? "900",
          concurrency: localDraft.concurrency,
          protocol: bucket.strategy?.protocol ?? "https",
          pathStyle: bucket.strategy?.pathStyle ?? false,
          accelerate: bucket.strategy?.accelerate ?? false,
        },
      })
      toast.success("本机存储策略已保存。")
    } else {
      updateBucket(bucket.id, {
        name: tencentDraft.name,
        provider: "Tencent COS",
        storageType: "tencent",
        bucket: tencentDraft.bucketName,
        endpoint: tencentDraft.accessDomain,
        secretId: tencentDraft.secretId,
        secretKey: tencentDraft.secretKey,
      })
      toast.success("腾讯云 COS 存储策略已保存。")
    }

    setView({ type: "list" })
  }

  return (
    <div>
      {view.type === "list" && (
        <StoragePolicyList
          buckets={buckets}
          onAddPolicy={handleAddPolicy}
          onEditPolicy={handleEditPolicy}
          onDeletePolicy={handleDeletePolicy}
        />
      )}

      {view.type === "select-provider" && (
        <ProviderSelector
          onBack={() => setView({ type: "list" })}
          options={providerOptions}
          onSelect={handleProviderSelect}
        />
      )}

      {view.type === "form" && view.strategy === "tencent" && (
        <TencentStorageForm
          draft={tencentDraft}
          onChange={setTencentDraft}
          onBack={() => setView({ type: "select-provider" })}
          onSubmit={handleTencentNext}
        />
      )}

      {view.type === "form" && view.strategy === "local" && (
        <LocalStorageForm
          draft={localDraft}
          onChange={setLocalDraft}
          onBack={() => setView({ type: "select-provider" })}
          onSubmit={handleLocalSubmit}
        />
      )}

      {view.type === "cors-step" && (
        <TencentCorsStep
          onBack={() => setView({ type: "form", strategy: "tencent" })}
          onSubmit={handleTencentSubmit}
        />
      )}

      {view.type === "edit" && resolveStorageStrategy(view.bucket) === "tencent" && (
        <TencentStorageForm
          draft={tencentDraft}
          initialDraft={initialTencentDraft}
          mode={view.bucket.canEditConnection ? "edit" : "readonly"}
          onChange={setTencentDraft}
          onBack={() => setView({ type: "list" })}
          onSubmit={() => handleSaveEdit(view.bucket)}
          submitLabel="保存"
        />
      )}

      {view.type === "edit" && resolveStorageStrategy(view.bucket) === "local" && (
        <LocalStorageForm
          draft={localDraft}
          initialDraft={initialLocalDraft}
          mode={view.bucket.canEditConnection ? "edit" : "readonly"}
          onChange={setLocalDraft}
          onBack={() => setView({ type: "list" })}
          onSubmit={() => handleSaveEdit(view.bucket)}
          submitLabel="保存"
        />
      )}
    </div>
  )
}
