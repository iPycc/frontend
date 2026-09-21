import * as React from "react"
import { toast } from "sonner"

import {
  listStorageDrivers,
  type StorageDriver,
  type UpdateBucketMountInput,
  type UpdateStoragePolicyInput,
} from "@/api/storage"
import {
  applyUserMountCors,
  deleteUserMount,
  getUserMountDeletePreview,
  syncUserMountPages,
  updateUserMount,
  type UserMountDeletePreview,
} from "@/api/user-storage"
import { useAppState } from "@/state/app"
import { buildLocalStoragePath, type BucketMount, type StorageStrategyKey, validateLocalStoragePath } from "@/lib/models"
import { attachStorage } from "@/lib/storage/attach"
import {
  getStorageModule,
  AliyunCorsStep,
  AliyunStorageForm,
  LocalStorageForm,
  ProviderSelector,
  resolveStorageStrategy,
  StoragePolicyList,
  TencentCorsStep,
  TencentStorageForm,
} from "@/components/storage"
import type { AliyunStorageDraft, LocalStorageDraft, TencentStorageDraft } from "@/components/storage"
import {
  MountDeleteDialog,
  type MountDeleteMode,
} from "@/components/storage/MountDeleteDialog"
import {
  buildAliyunMountInput,
  buildAliyunPolicyInput,
  buildLocalDraft,
  buildLocalMountInput,
  buildLocalPolicyInput,
  buildTencentMountInput,
  buildTencentPolicyInput,
  createEmptyAliyunDraft,
  createEmptyTencentDraft,
  normalizeStorageRoot,
  parseSizeMb,
  slugify,
  type View,
} from "./store/build"

export function StorageSettingsPage() {
  const { authSession, buckets, currentUser, profile, reloadWorkspace } = useAppState()
  const [view, setView] = React.useState<View>({ type: "list" })
  const [drivers, setDrivers] = React.useState<StorageDriver[] | null>(null)
  const [tencentDraft, setTencentDraft] = React.useState<TencentStorageDraft>(createEmptyTencentDraft)
  const [initialTencentDraft, setInitialTencentDraft] = React.useState<TencentStorageDraft | undefined>()
  const [localDraft, setLocalDraft] = React.useState<LocalStorageDraft>(buildLocalDraft(profile.uid || profile.username || "workspace"))
  const [initialLocalDraft, setInitialLocalDraft] = React.useState<LocalStorageDraft | undefined>()
  const [aliyunDraft, setAliyunDraft] = React.useState<AliyunStorageDraft>(createEmptyAliyunDraft)
  const [initialAliyunDraft, setInitialAliyunDraft] = React.useState<AliyunStorageDraft | undefined>()
  const [submitting, setSubmitting] = React.useState(false)
  const [syncingMountId, setSyncingMountId] = React.useState<number | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<BucketMount | null>(null)
  const [deletePreview, setDeletePreview] = React.useState<UserMountDeletePreview | null>(null)
  const [deletePreviewLoading, setDeletePreviewLoading] = React.useState(false)
  const [deletePreviewError, setDeletePreviewError] = React.useState<string | null>(null)
  const [deletingMode, setDeletingMode] = React.useState<MountDeleteMode | null>(null)
  const syncControllerRef = React.useRef<AbortController | null>(null)
  const deletePreviewRequestRef = React.useRef(0)

  React.useEffect(() => () => syncControllerRef.current?.abort(), [])

  const token = authSession?.tokens.accessToken ?? null
  const userSeed = profile.uid || profile.username || "workspace"
  const canManageMounts = currentUser?.role === "user" || currentUser?.role === "admin"

  React.useEffect(() => {
    if (!token || !canManageMounts) return
    let active = true
    void listStorageDrivers(token)
      .then((items) => {
        if (active) setDrivers(items)
      })
      .catch(() => {
        if (active) setDrivers(null)
      })
    return () => {
      active = false
    }
  }, [canManageMounts, token])

  const providerOptions = React.useMemo(
    () => {
      const byId = new Map((drivers ?? []).map((driver) => [driver.id, driver]))
      const option = (strategy: StorageStrategyKey, driverId: string, description: string) => ({
        strategy,
        label: byId.get(driverId)?.label ?? getStorageModule(strategy).label,
        description,
        enabled: drivers === null ? true : Boolean(byId.get(driverId)?.enabled),
      })
      return [
        option("local", "local_fs", "默认按当前用户自动生成独立本机目录，支持路径联想和合法性校验。"),
        option("tencent", "tencent_cos", "连接腾讯云 COS，支持直传、分片续传、镜像同步与服务端加密。"),
        option("aliyun", "aliyun_oss", "连接阿里云 OSS，支持直传、分片续传、镜像同步与服务端加密。"),
      ]
    },
    [drivers]
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
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "操作失败")
      } finally {
        setSubmitting(false)
      }
    },
    [submitting]
  )

  const handleAddPolicy = () => {
    if (!canManageMounts) {
      toast.error("访客账号不能创建或管理挂载。")
      return
    }
    setTencentDraft(createEmptyTencentDraft())
    setLocalDraft(buildLocalDraft(userSeed))
    setInitialTencentDraft(undefined)
    setInitialLocalDraft(undefined)
    setAliyunDraft(createEmptyAliyunDraft())
    setInitialAliyunDraft(undefined)
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
      return
    }

    setAliyunDraft(createEmptyAliyunDraft())
    setInitialAliyunDraft(undefined)
    setView({ type: "form", strategy: "aliyun" })
  }

  const handleTencentNext = () => {
    if (!tencentDraft.name.trim() || !tencentDraft.bucketName.trim()) {
      toast.error("请先填写完整的 COS 基本信息。")
      return
    }

    setView({ type: "cors-step", strategy: "tencent" })
  }

  const handleTencentSubmit = (autoConfigure: boolean) =>
    void withSubmit(async () => {
      const accessToken = requireToken()
      const fallbackSlug = slugify(`${userSeed}-${tencentDraft.name}`) || slugify(userSeed) || "tencent-cos"

      const created = await attachStorage(
        accessToken,
        buildTencentPolicyInput(tencentDraft),
        (policyId) => buildTencentMountInput(tencentDraft, fallbackSlug, policyId)
      )

      if (autoConfigure) {
        try {
          await applyUserMountCors(accessToken, created.mount.id)
        } catch (error) {
          toast.warning(error instanceof Error ? error.message : "已创建 COS 挂载，但跨域配置尚未完成。")
        }
      }

      await reloadWorkspace()
      toast.success("腾讯云 COS 存储策略已创建。")
      setView({ type: "list" })
    })

  const handleAliyunNext = () => {
    if (!aliyunDraft.name.trim() || !aliyunDraft.bucketName.trim() || !aliyunDraft.region.trim()) {
      toast.error("请先填写完整的 OSS 基本信息。")
      return
    }
    setView({ type: "cors-step", strategy: "aliyun" })
  }

  const handleAliyunSubmit = (autoConfigure: boolean) =>
    void withSubmit(async () => {
      const accessToken = requireToken()
      const fallbackSlug = slugify(`${userSeed}-${aliyunDraft.name}`) || slugify(userSeed) || "aliyun-oss"
      const created = await attachStorage(
        accessToken,
        buildAliyunPolicyInput(aliyunDraft),
        (policyId) => buildAliyunMountInput(aliyunDraft, fallbackSlug, policyId)
      )

      if (autoConfigure) {
        try {
          await applyUserMountCors(accessToken, created.mount.id)
        } catch (error) {
          toast.warning(error instanceof Error ? error.message : "已创建 OSS 挂载，但跨域配置尚未完成。")
        }
      }

      await reloadWorkspace()
      toast.success("阿里云 OSS 存储空间已创建。")
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
      await attachStorage(
        accessToken,
        buildLocalPolicyInput(localDraft, validation.normalized),
        (policyId) => buildLocalMountInput(localDraft, validation.normalized, fallbackSlug, policyId)
      )

      await reloadWorkspace()
      toast.success("本机存储策略已创建。")
      setView({ type: "list" })
    })

  const handleEditPolicy = (bucket: BucketMount) => {
    const strategy = resolveStorageStrategy(bucket)
    if (strategy === "local") {
      const draft: LocalStorageDraft = {
        name: bucket.name,
        path: bucket.basePrefix ?? bucket.bucket ?? buildLocalStoragePath(userSeed),
        pathCustomized: true,
        concurrency: bucket.strategy?.concurrency ?? 1,
        multipartThreshold: bucket.strategy?.multipartThreshold ?? "25 MB",
        partSize: bucket.strategy?.partSize ?? "25 MB",
      }
      setLocalDraft(draft)
      setInitialLocalDraft(draft)
    } else if (strategy === "tencent") {
      const draft: TencentStorageDraft = {
        name: bucket.name,
        bucketName: bucket.bucket ?? "",
        region: bucket.region ?? "ap-guangzhou",
        prefix: bucket.rootPath ?? "",
        mountMode: bucket.mountMode,
        readOnly: bucket.readOnly,
        legacyPrefixedKeys: bucket.legacyPrefixedKeys,
        objectKeyStyle: bucket.objectKeyStyle,
        accessPermission: "private" as const,
        accessDomain: bucket.endpoint ?? "",
        secretId: "",
        secretKey: "",
        concurrency: Math.max(1, Math.min(3, bucket.strategy?.concurrency ?? 3)),
        multipartThreshold: bucket.strategy?.multipartThreshold ?? "25 MB",
        partSize: bucket.strategy?.partSize ?? "25 MB",
        serverSideEncryption:
          bucket.extra?.server_side_encryption === "SSE-COS" || bucket.extra?.server_side_encryption === "SSE-KMS"
            ? bucket.extra.server_side_encryption
            : "none",
        kmsKeyId: typeof bucket.extra?.kms_key_id === "string" ? bucket.extra.kms_key_id : "",
      }
      setTencentDraft(draft)
      setInitialTencentDraft(draft)
    } else {
      const encryption = bucket.extra?.server_side_encryption
      const draft: AliyunStorageDraft = {
        name: bucket.name,
        bucketName: bucket.bucket ?? "",
        region: bucket.region ?? "cn-hangzhou",
        endpoint: bucket.endpoint ?? "",
        prefix: bucket.rootPath ?? "",
        mountMode: bucket.mountMode,
        readOnly: bucket.readOnly,
        legacyPrefixedKeys: bucket.legacyPrefixedKeys,
        objectKeyStyle: bucket.objectKeyStyle,
        accessKeyId: "",
        accessKeySecret: "",
        securityToken: "",
        concurrency: Math.max(1, Math.min(3, bucket.strategy?.concurrency ?? 3)),
        multipartThreshold: bucket.strategy?.multipartThreshold ?? "25 MB",
        partSize: bucket.strategy?.partSize ?? "25 MB",
        serverSideEncryption: encryption === "SSE-OSS" || encryption === "SSE-KMS" ? encryption : "none",
        kmsKeyId: typeof bucket.extra?.kms_key_id === "string" ? bucket.extra.kms_key_id : "",
      }
      setAliyunDraft(draft)
      setInitialAliyunDraft(draft)
    }

    setView({ type: "edit", bucket })
  }

  const handleDeletePolicy = (bucket: BucketMount) => {
    if (!bucket.canDelete || !bucket.backendId) {
      toast.info("当前挂载为系统内置或不可删除。")
      return
    }

    let accessToken: string
    try {
      accessToken = requireToken()
    } catch {
      return
    }

    const requestId = deletePreviewRequestRef.current + 1
    deletePreviewRequestRef.current = requestId
    setDeleteTarget(bucket)
    setDeletePreview(null)
    setDeletePreviewError(null)
    setDeletePreviewLoading(true)
    void getUserMountDeletePreview(accessToken, bucket.backendId)
      .then((preview) => {
        if (deletePreviewRequestRef.current === requestId) setDeletePreview(preview)
      })
      .catch((error) => {
        if (deletePreviewRequestRef.current === requestId) {
          setDeletePreviewError(error instanceof Error ? error.message : "无法检查挂载内容")
        }
      })
      .finally(() => {
        if (deletePreviewRequestRef.current === requestId) setDeletePreviewLoading(false)
      })
  }

  const closeDeleteDialog = (force = false) => {
    if (deletingMode && !force) return
    deletePreviewRequestRef.current += 1
    setDeleteTarget(null)
    setDeletePreview(null)
    setDeletePreviewError(null)
    setDeletePreviewLoading(false)
  }

  const confirmDeletePolicy = (mode: MountDeleteMode) => {
    const bucket = deleteTarget
    if (!bucket?.backendId || submitting || deletingMode) return
    setDeletingMode(mode)
    void withSubmit(async () => {
      try {
        const accessToken = requireToken()
        const result = await deleteUserMount(accessToken, bucket.backendId as number, mode === "purge")
        await reloadWorkspace()
        closeDeleteDialog(true)
        toast.success(
          mode === "purge"
            ? `已删除 ${bucket.name} 及其存储文件（清理 ${result.deleted_objects} 个存储项）`
            : `已删除 ${bucket.name}，存储文件未受影响`
        )
      } finally {
        setDeletingMode(null)
      }
    })
  }

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
            concurrency: localDraft.concurrency,
            multipart_threshold_mb: parseSizeMb(localDraft.multipartThreshold, 25),
            part_size_mb: parseSizeMb(localDraft.partSize, 25),
          },
        }

        await updateUserMount(accessToken, bucket.backendId, policyPatch, mountPatch)
        toast.success("本机存储策略已保存。")
      } else if (strategy === "tencent") {
        const policyPatch: UpdateStoragePolicyInput = {
          name: tencentDraft.name.trim(),
          bucket_name: tencentDraft.bucketName.trim(),
          region: tencentDraft.region.trim(),
          endpoint: tencentDraft.accessDomain.trim() || undefined,
          multipart_threshold_mb: parseSizeMb(tencentDraft.multipartThreshold, 25),
          part_size_mb: parseSizeMb(tencentDraft.partSize, 25),
          extra: {
            ...(bucket.extra ?? {}),
            provider_label: "Tencent COS",
            storage_type: "tencent",
            bucket_name: tencentDraft.bucketName.trim(),
            endpoint: tencentDraft.accessDomain.trim(),
            region: tencentDraft.region.trim(),
            concurrency: tencentDraft.concurrency,
            multipart_threshold_mb: parseSizeMb(tencentDraft.multipartThreshold, 25),
            part_size_mb: parseSizeMb(tencentDraft.partSize, 25),
            server_side_encryption: tencentDraft.serverSideEncryption,
            kms_key_id: tencentDraft.serverSideEncryption === "SSE-KMS" ? tencentDraft.kmsKeyId.trim() : "",
          },
        }
        if (tencentDraft.secretId.trim() || tencentDraft.secretKey.trim()) {
          policyPatch.credentials = {
            ...(tencentDraft.secretId.trim() ? { secret_id: tencentDraft.secretId.trim() } : {}),
            ...(tencentDraft.secretKey.trim() ? { secret_key: tencentDraft.secretKey.trim() } : {}),
          }
        }

        const mountPatch: UpdateBucketMountInput = {
          name: tencentDraft.name.trim(),
          root_path: tencentDraft.prefix.trim().replace(/^\/+|\/+$/g, ""),
          provider_label: "Tencent COS",
          mode: tencentDraft.mountMode,
          read_only: tencentDraft.readOnly,
          legacy_prefixed_keys: tencentDraft.legacyPrefixedKeys,
          extra: {
            ...(bucket.extra ?? {}),
            provider_label: "Tencent COS",
            storage_type: "tencent",
            bucket_name: tencentDraft.bucketName.trim(),
            endpoint: tencentDraft.accessDomain.trim(),
            region: tencentDraft.region.trim(),
            concurrency: tencentDraft.concurrency,
            multipart_threshold_mb: parseSizeMb(tencentDraft.multipartThreshold, 25),
            part_size_mb: parseSizeMb(tencentDraft.partSize, 25),
            mount_mode: tencentDraft.mountMode,
            read_only: tencentDraft.readOnly,
            object_key_style: tencentDraft.objectKeyStyle,
          },
        }

        await updateUserMount(accessToken, bucket.backendId, policyPatch, mountPatch)
        toast.success("腾讯云 COS 存储策略已保存。")
      } else {
        const policyPatch: UpdateStoragePolicyInput = {
          name: aliyunDraft.name.trim(),
          bucket_name: aliyunDraft.bucketName.trim(),
          region: aliyunDraft.region.trim(),
          endpoint: aliyunDraft.endpoint.trim() || undefined,
          multipart_threshold_mb: parseSizeMb(aliyunDraft.multipartThreshold, 25),
          part_size_mb: parseSizeMb(aliyunDraft.partSize, 25),
          extra: {
            ...(bucket.extra ?? {}),
            provider_label: "Aliyun OSS",
            storage_type: "aliyun",
            concurrency: aliyunDraft.concurrency,
            multipart_threshold_mb: parseSizeMb(aliyunDraft.multipartThreshold, 25),
            part_size_mb: parseSizeMb(aliyunDraft.partSize, 25),
            server_side_encryption: aliyunDraft.serverSideEncryption,
            kms_key_id: aliyunDraft.serverSideEncryption === "SSE-KMS" ? aliyunDraft.kmsKeyId.trim() : "",
          },
        }
        if (aliyunDraft.accessKeyId.trim() || aliyunDraft.accessKeySecret.trim() || aliyunDraft.securityToken.trim()) {
          policyPatch.credentials = {
            ...(aliyunDraft.accessKeyId.trim() ? { access_key_id: aliyunDraft.accessKeyId.trim() } : {}),
            ...(aliyunDraft.accessKeySecret.trim() ? { access_key_secret: aliyunDraft.accessKeySecret.trim() } : {}),
            ...(aliyunDraft.securityToken.trim() ? { security_token: aliyunDraft.securityToken.trim() } : {}),
          }
        }
        const mountPatch: UpdateBucketMountInput = {
          name: aliyunDraft.name.trim(),
          root_path: aliyunDraft.prefix.trim().replace(/^\/+|\/+$/g, ""),
          provider_label: "Aliyun OSS",
          mode: aliyunDraft.mountMode,
          read_only: aliyunDraft.readOnly,
          legacy_prefixed_keys: aliyunDraft.legacyPrefixedKeys,
          extra: {
            ...(bucket.extra ?? {}),
            provider_label: "Aliyun OSS",
            storage_type: "aliyun",
            concurrency: aliyunDraft.concurrency,
            multipart_threshold_mb: parseSizeMb(aliyunDraft.multipartThreshold, 25),
            part_size_mb: parseSizeMb(aliyunDraft.partSize, 25),
            mount_mode: aliyunDraft.mountMode,
            read_only: aliyunDraft.readOnly,
            object_key_style: aliyunDraft.objectKeyStyle,
          },
        }
        await updateUserMount(accessToken, bucket.backendId, policyPatch, mountPatch)
        toast.success("阿里云 OSS 存储空间已保存。")
      }

      await reloadWorkspace()
      setView({ type: "list" })
    })

  const handleSyncMount = React.useCallback(async (bucket: BucketMount) => {
    const accessToken = requireToken()
    if (!bucket.backendId || bucket.mountMode !== "mirror") {
      return
    }

    if (syncingMountId === bucket.backendId) {
      syncControllerRef.current?.abort()
      return
    }
    if (syncingMountId !== null) return

    const controller = new AbortController()
    syncControllerRef.current = controller
    setSyncingMountId(bucket.backendId)
    try {
      const result = await syncUserMountPages(accessToken, bucket.backendId, controller.signal)
      await reloadWorkspace()
      if (!result.complete) {
        toast.info(`已同步 ${result.synced_objects} 个对象，可再次继续。`)
      } else {
        toast.success(`${bucket.name} 同步完成，共 ${result.synced_objects} 个对象。`)
      }
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        toast.error(error instanceof Error ? error.message : "启动同步失败")
      }
    } finally {
      syncControllerRef.current = null
      setSyncingMountId(null)
    }
  }, [reloadWorkspace, requireToken, syncingMountId])

  const submitLabel = submitting ? "处理中..." : undefined
  const editSubmitLabel = submitting ? "处理中..." : "保存"

  return (
    <div>
      {view.type === "list" && (
        <StoragePolicyList
          buckets={buckets}
          canAddPolicy={canManageMounts}
          onAddPolicy={handleAddPolicy}
          onEditPolicy={handleEditPolicy}
          onDeletePolicy={handleDeletePolicy}
          onSyncMount={handleSyncMount}
          syncingMountId={syncingMountId}
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

      {view.type === "form" && view.strategy === "aliyun" && (
        <AliyunStorageForm
          draft={aliyunDraft}
          onChange={setAliyunDraft}
          onBack={() => setView({ type: "select-provider" })}
          onSubmit={handleAliyunNext}
          submitLabel={submitLabel}
        />
      )}

      {view.type === "cors-step" && view.strategy === "tencent" && (
        <TencentCorsStep onBack={() => setView({ type: "form", strategy: "tencent" })} onSubmit={handleTencentSubmit} />
      )}

      {view.type === "cors-step" && view.strategy === "aliyun" && (
        <AliyunCorsStep onBack={() => setView({ type: "form", strategy: "aliyun" })} onSubmit={handleAliyunSubmit} />
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

      {view.type === "edit" && resolveStorageStrategy(view.bucket) === "aliyun" && (
        <AliyunStorageForm
          draft={aliyunDraft}
          initialDraft={initialAliyunDraft}
          mode={view.bucket.canEditConnection ? "edit" : "readonly"}
          onChange={setAliyunDraft}
          onBack={() => setView({ type: "list" })}
          onSubmit={() => handleSaveEdit(view.bucket)}
          submitLabel={editSubmitLabel}
        />
      )}

      <MountDeleteDialog
        bucket={deleteTarget}
        preview={deletePreview}
        loading={deletePreviewLoading}
        error={deletePreviewError}
        deletingMode={deletingMode}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog()
        }}
        onDelete={confirmDeletePolicy}
      />
    </div>
  )
}
