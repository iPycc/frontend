import * as React from "react"
import { toast } from "sonner"

import {
  applyMountCors,
  createMount,
  createPolicy,
  deleteMount,
  deletePolicy,
  updateMount,
  updatePolicy,
  type CreateBucketMountInput,
  type CreateStoragePolicyInput,
  type UpdateBucketMountInput,
  type UpdateStoragePolicyInput,
} from "@/api/storage"
import { useAppState } from "@/lib/app-state"
import { buildLocalStoragePath, type BucketMount, type StorageStrategyKey, validateLocalStoragePath } from "@/lib/models"
import {
  getStorageModule,
  LocalStorageForm,
  ProviderSelector,
  resolveStorageStrategy,
  StoragePolicyList,
  TencentCorsStep,
  TencentStorageForm,
} from "@/components/storage"
import type { LocalStorageDraft, TencentStorageDraft } from "@/components/storage"

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

function parseSizeMb(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

function normalizeStorageRoot(path: string, fallbackSeed: string) {
  const candidate = path.trim() || buildLocalStoragePath(fallbackSeed)
  const validation = validateLocalStoragePath(candidate)
  const normalized = validation.normalized.endsWith("/") ? validation.normalized : `${validation.normalized}/`
  return {
    ...validation,
    normalized,
  }
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

function buildLocalDraft(seed: string): LocalStorageDraft {
  return {
    name: "本机存储",
    path: buildLocalStoragePath(seed),
    pathCustomized: false,
    concurrency: 1,
    multipartThreshold: "25 MB",
    partSize: "25 MB",
  }
}

function buildLocalPolicyInput(draft: LocalStorageDraft, storageRoot: string): CreateStoragePolicyInput {
  return {
    name: draft.name.trim(),
    provider: "local_fs",
    bucket_name: draft.name.trim(),
    base_prefix: storageRoot.replace(/^\/+/, "").replace(/\/+$/, ""),
    description: `Local storage mounted at ${storageRoot}`,
    multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
    part_size_mb: parseSizeMb(draft.partSize, 25),
    presign_ttl_seconds: 900,
    is_default: false,
    cors_auto_configured: true,
    extra: {
      provider_label: "Local Storage",
      storage_type: "local",
      storage_root: storageRoot,
      concurrency: draft.concurrency,
      multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
      part_size_mb: parseSizeMb(draft.partSize, 25),
      presign_ttl_seconds: 900,
    },
  }
}

function buildLocalMountInput(
  draft: LocalStorageDraft,
  storageRoot: string,
  fallbackSlug: string,
  policyId: number
): CreateBucketMountInput {
  return {
    policy_id: policyId,
    name: draft.name.trim(),
    mount_slug: slugify(draft.name) || fallbackSlug,
    root_path: "",
    provider_label: "Local Storage",
    is_enabled: true,
    extra: {
      provider_label: "Local Storage",
      storage_type: "local",
      storage_root: storageRoot,
    },
  }
}

function buildTencentPolicyInput(draft: TencentStorageDraft): CreateStoragePolicyInput {
  return {
    name: draft.name.trim(),
    provider: "tencent_cos",
    bucket_name: draft.bucketName.trim(),
    region: "ap-guangzhou",
    endpoint: draft.accessDomain.trim() || undefined,
    base_prefix: "",
    secret_id: draft.secretId.trim(),
    secret_key: draft.secretKey.trim(),
    status: "active",
    description: `Tencent COS bucket ${draft.bucketName.trim()}`,
    multipart_threshold_mb: 25,
    part_size_mb: 25,
    presign_ttl_seconds: 900,
    is_default: false,
    cors_auto_configured: false,
    extra: {
      provider_label: "Tencent COS",
      storage_type: "tencent",
      bucket_name: draft.bucketName.trim(),
      endpoint: draft.accessDomain.trim(),
      region: "ap-guangzhou",
    },
  }
}

function buildTencentMountInput(draft: TencentStorageDraft, fallbackSlug: string, policyId: number): CreateBucketMountInput {
  return {
    policy_id: policyId,
    name: draft.name.trim(),
    mount_slug: slugify(draft.name) || fallbackSlug,
    root_path: "",
    provider_label: "Tencent COS",
    is_enabled: true,
    extra: {
      provider_label: "Tencent COS",
      storage_type: "tencent",
      bucket_name: draft.bucketName.trim(),
      endpoint: draft.accessDomain.trim(),
      region: "ap-guangzhou",
    },
  }
}

export function StorageSettingsPage() {
  const { authSession, buckets, profile, reloadWorkspace } = useAppState()
  const [view, setView] = React.useState<View>({ type: "list" })
  const [tencentDraft, setTencentDraft] = React.useState<TencentStorageDraft>(createEmptyTencentDraft)
  const [initialTencentDraft, setInitialTencentDraft] = React.useState<TencentStorageDraft | undefined>()
  const [localDraft, setLocalDraft] = React.useState<LocalStorageDraft>(buildLocalDraft(profile.uid || profile.username || "workspace"))
  const [initialLocalDraft, setInitialLocalDraft] = React.useState<LocalStorageDraft | undefined>()
  const [submitting, setSubmitting] = React.useState(false)

  const token = authSession?.tokens.accessToken ?? null
  const userSeed = profile.uid || profile.username || "workspace"

  const providerOptions = React.useMemo(
    () => [
      {
        strategy: "local" as const,
        label: getStorageModule("local").label,
        description: "默认按当前用户自动生成独立本机目录，支持路径联想和合法性校验。",
        enabled: true,
      },
      {
        strategy: "tencent" as const,
        label: getStorageModule("tencent").label,
        description: "保留腾讯云 COS 的真实创建、编辑与跨域配置流程。",
        enabled: true,
      },
      {
        strategy: "aliyun" as const,
        label: getStorageModule("aliyun").label,
        description: "已预留接入位，后续扩展时无需侵入主页面。",
        enabled: false,
      },
    ],
    []
  )

  const requireToken = React.useCallback(() => {
    if (!token) {
      toast.error("当前会话已失效，请重新登录。")
      throw new Error("Missing access token")
    }
    return token
  }, [token])

  const withSubmit = React.useCallback(
    async (task: () => Promise<void>) => {
      if (submitting) {
        return
      }

      setSubmitting(true)
      try {
        await task()
      } finally {
        setSubmitting(false)
      }
    },
    [submitting]
  )

  const handleAddPolicy = () => {
    setTencentDraft(createEmptyTencentDraft())
    setLocalDraft(buildLocalDraft(userSeed))
    setInitialTencentDraft(undefined)
    setInitialLocalDraft(undefined)
    setView({ type: "select-provider" })
  }

  const handleProviderSelect = (strategy: StorageStrategyKey) => {
    if (strategy === "local") {
      setLocalDraft(buildLocalDraft(userSeed))
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
    if (!tencentDraft.name.trim() || !tencentDraft.bucketName.trim()) {
      toast.error("请先填写完整的 COS 基本信息。")
      return
    }

    setView({ type: "cors-step" })
  }

  const handleTencentSubmit = () =>
    void withSubmit(async () => {
      const accessToken = requireToken()
      const fallbackSlug = slugify(`${userSeed}-${tencentDraft.name}`) || slugify(userSeed) || "tencent-cos"

      const createdPolicy = await createPolicy(accessToken, buildTencentPolicyInput(tencentDraft))
      const createdMount = await createMount(accessToken, buildTencentMountInput(tencentDraft, fallbackSlug, createdPolicy.id))

      try {
        await applyMountCors(accessToken, createdMount.id)
      } catch (error) {
        toast.warning(error instanceof Error ? error.message : "已创建 COS 挂载，但跨域配置尚未完成。")
      }

      await reloadWorkspace()
      toast.success("腾讯云 COS 存储策略已创建。")
      setView({ type: "list" })
    })

  const handleLocalSubmit = () =>
    void withSubmit(async () => {
      const accessToken = requireToken()
      const validation = normalizeStorageRoot(localDraft.path, userSeed)
      if (!validation.isValid) {
        toast.error(validation.message)
        return
      }

      const fallbackSlug = slugify(`${userSeed}-${localDraft.name}`) || slugify(userSeed) || "local-storage"
      const createdPolicy = await createPolicy(accessToken, buildLocalPolicyInput(localDraft, validation.normalized))
      await createMount(accessToken, buildLocalMountInput(localDraft, validation.normalized, fallbackSlug, createdPolicy.id))

      await reloadWorkspace()
      toast.success("本机存储策略已创建。")
      setView({ type: "list" })
    })

  const handleEditPolicy = (bucket: BucketMount) => {
    const strategy = resolveStorageStrategy(bucket)
    if (strategy === "local") {
      const draft = {
        name: bucket.name,
        path: bucket.basePrefix ?? bucket.bucket ?? buildLocalStoragePath(userSeed),
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
        secretId: "",
        secretKey: "",
      }
      setTencentDraft(draft)
      setInitialTencentDraft(draft)
    }

    setView({ type: "edit", bucket })
  }

  const handleDeletePolicy = (bucket: BucketMount) =>
    void withSubmit(async () => {
      const accessToken = requireToken()

      if (!bucket.canDelete || !bucket.backendId || !bucket.policyId) {
        toast.info("当前挂载为系统内置或不可删除。")
        return
      }

      await deleteMount(accessToken, bucket.backendId)
      await deletePolicy(accessToken, bucket.policyId)
      await reloadWorkspace()
      toast.success(`已删除 ${bucket.name}`)
    })

  const handleSaveEdit = (bucket: BucketMount) =>
    void withSubmit(async () => {
      const accessToken = requireToken()
      const strategy = resolveStorageStrategy(bucket)

      if (!bucket.backendId || !bucket.policyId) {
        toast.error("当前挂载缺少后端标识，无法保存。")
        return
      }

      if (strategy === "local") {
        const validation = normalizeStorageRoot(localDraft.path, userSeed)
        if (!validation.isValid) {
          toast.error(validation.message)
          return
        }

        const policyPatch: UpdateStoragePolicyInput = {
          name: localDraft.name.trim(),
          bucket_name: localDraft.name.trim(),
          base_prefix: validation.normalized.replace(/^\/+/, "").replace(/\/+$/, ""),
          multipart_threshold_mb: parseSizeMb(localDraft.multipartThreshold, 25),
          part_size_mb: parseSizeMb(localDraft.partSize, 25),
          presign_ttl_seconds: 900,
          cors_auto_configured: true,
          extra: {
            ...(bucket.extra ?? {}),
            provider_label: "Local Storage",
            storage_type: "local",
            storage_root: validation.normalized,
            concurrency: localDraft.concurrency,
            multipart_threshold_mb: parseSizeMb(localDraft.multipartThreshold, 25),
            part_size_mb: parseSizeMb(localDraft.partSize, 25),
            presign_ttl_seconds: 900,
          },
        }
        const mountPatch: UpdateBucketMountInput = {
          name: localDraft.name.trim(),
          provider_label: "Local Storage",
          extra: {
            ...(bucket.extra ?? {}),
            provider_label: "Local Storage",
            storage_type: "local",
            storage_root: validation.normalized,
          },
        }

        await updatePolicy(accessToken, bucket.policyId, policyPatch)
        await updateMount(accessToken, bucket.backendId, mountPatch)
        toast.success("本机存储策略已保存。")
      } else {
        const policyPatch: UpdateStoragePolicyInput = {
          name: tencentDraft.name.trim(),
          bucket_name: tencentDraft.bucketName.trim(),
          region: "ap-guangzhou",
          endpoint: tencentDraft.accessDomain.trim() || undefined,
          extra: {
            ...(bucket.extra ?? {}),
            provider_label: "Tencent COS",
            storage_type: "tencent",
            bucket_name: tencentDraft.bucketName.trim(),
            endpoint: tencentDraft.accessDomain.trim(),
            region: "ap-guangzhou",
          },
        }
        if (tencentDraft.secretId.trim()) {
          policyPatch.secret_id = tencentDraft.secretId.trim()
        }
        if (tencentDraft.secretKey.trim()) {
          policyPatch.secret_key = tencentDraft.secretKey.trim()
        }

        const mountPatch: UpdateBucketMountInput = {
          name: tencentDraft.name.trim(),
          provider_label: "Tencent COS",
          extra: {
            ...(bucket.extra ?? {}),
            provider_label: "Tencent COS",
            storage_type: "tencent",
            bucket_name: tencentDraft.bucketName.trim(),
            endpoint: tencentDraft.accessDomain.trim(),
            region: "ap-guangzhou",
          },
        }

        await updatePolicy(accessToken, bucket.policyId, policyPatch)
        await updateMount(accessToken, bucket.backendId, mountPatch)
        toast.success("腾讯云 COS 存储策略已保存。")
      }

      await reloadWorkspace()
      setView({ type: "list" })
    })

  const submitLabel = submitting ? "处理中..." : undefined
  const editSubmitLabel = submitting ? "处理中..." : "保存"

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
        <ProviderSelector onBack={() => setView({ type: "list" })} options={providerOptions} onSelect={handleProviderSelect} />
      )}

      {view.type === "form" && view.strategy === "tencent" && (
        <TencentStorageForm
          draft={tencentDraft}
          onChange={setTencentDraft}
          onBack={() => setView({ type: "select-provider" })}
          onSubmit={handleTencentNext}
          submitLabel={submitLabel}
        />
      )}

      {view.type === "form" && view.strategy === "local" && (
        <LocalStorageForm
          draft={localDraft}
          onChange={setLocalDraft}
          onBack={() => setView({ type: "select-provider" })}
          onSubmit={handleLocalSubmit}
          submitLabel={submitLabel}
        />
      )}

      {view.type === "cors-step" && (
        <TencentCorsStep onBack={() => setView({ type: "form", strategy: "tencent" })} onSubmit={handleTencentSubmit} />
      )}

      {view.type === "edit" && resolveStorageStrategy(view.bucket) === "tencent" && (
        <TencentStorageForm
          draft={tencentDraft}
          initialDraft={initialTencentDraft}
          mode={view.bucket.canEditConnection ? "edit" : "readonly"}
          onChange={setTencentDraft}
          onBack={() => setView({ type: "list" })}
          onSubmit={() => handleSaveEdit(view.bucket)}
          submitLabel={editSubmitLabel}
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
          submitLabel={editSubmitLabel}
        />
      )}
    </div>
  )
}
