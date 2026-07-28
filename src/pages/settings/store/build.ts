import type {
  CreateBucketMountInput,
  CreateStoragePolicyInput,
} from "@/api/storage"
import type {
  LocalStorageDraft,
  TencentStorageDraft,
} from "@/components/storage"
import {
  buildLocalStoragePath,
  type BucketMount,
  type StorageStrategyKey,
  validateLocalStoragePath,
} from "@/lib/models"

export type View =
  | { type: "list" }
  | { type: "select-provider" }
  | { type: "form"; strategy: StorageStrategyKey }
  | { type: "cors-step" }
  | { type: "edit"; bucket: BucketMount }

export function createEmptyTencentDraft(): TencentStorageDraft {
  return {
    name: "",
    bucketName: "",
    region: "ap-guangzhou",
    prefix: "",
    mountMode: "managed",
    readOnly: false,
    legacyPrefixedKeys: false,
    objectKeyStyle: "readable",
    accessPermission: "private",
    accessDomain: "",
    secretId: "",
    secretKey: "",
    concurrency: 3,
    multipartThreshold: "25 MB",
    partSize: "25 MB",
    serverSideEncryption: "none",
    kmsKeyId: "",
  }
}

export function parseSizeMb(value: string, fallback: number) {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function normalizeStorageRoot(path: string, fallbackSeed: string) {
  const candidate = path.trim() || buildLocalStoragePath(fallbackSeed)
  const validation = validateLocalStoragePath(candidate)
  const normalized = validation.normalized.endsWith("/") ? validation.normalized : `${validation.normalized}/`
  return {
    ...validation,
    normalized,
  }
}

export function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
}

export function buildLocalDraft(seed: string): LocalStorageDraft {
  return {
    name: "本机存储",
    path: buildLocalStoragePath(seed),
    pathCustomized: false,
    concurrency: 1,
    multipartThreshold: "25 MB",
    partSize: "25 MB",
  }
}

export function buildLocalPolicyInput(draft: LocalStorageDraft, storageRoot: string): CreateStoragePolicyInput {
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

export function buildLocalMountInput(
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
      concurrency: draft.concurrency,
      multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
      part_size_mb: parseSizeMb(draft.partSize, 25),
    },
  }
}

export function buildTencentPolicyInput(draft: TencentStorageDraft): CreateStoragePolicyInput {
  return {
    name: draft.name.trim(),
    provider: "tencent_cos",
    bucket_name: draft.bucketName.trim(),
    region: draft.region.trim(),
    endpoint: draft.accessDomain.trim() || undefined,
    base_prefix: "",
    secret_id: draft.secretId.trim(),
    secret_key: draft.secretKey.trim(),
    status: "active",
    description: `Tencent COS bucket ${draft.bucketName.trim()}`,
    multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
    part_size_mb: parseSizeMb(draft.partSize, 25),
    presign_ttl_seconds: 900,
    is_default: false,
    cors_auto_configured: false,
    extra: {
      provider_label: "Tencent COS",
      storage_type: "tencent",
      bucket_name: draft.bucketName.trim(),
      endpoint: draft.accessDomain.trim(),
      region: draft.region.trim(),
      concurrency: draft.concurrency,
      multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
      part_size_mb: parseSizeMb(draft.partSize, 25),
      server_side_encryption: draft.serverSideEncryption,
      kms_key_id: draft.serverSideEncryption === "SSE-KMS" ? draft.kmsKeyId.trim() : "",
    },
  }
}

export function buildTencentMountInput(draft: TencentStorageDraft, fallbackSlug: string, policyId: number): CreateBucketMountInput {
  return {
    policy_id: policyId,
    name: draft.name.trim(),
    mount_slug: slugify(draft.name) || fallbackSlug,
    root_path: draft.prefix.trim().replace(/^\/+|\/+$/g, ""),
    provider_label: "Tencent COS",
    is_enabled: true,
    mode: draft.mountMode,
    read_only: draft.readOnly,
    legacy_prefixed_keys: draft.legacyPrefixedKeys,
    extra: {
      provider_label: "Tencent COS",
      storage_type: "tencent",
      bucket_name: draft.bucketName.trim(),
      endpoint: draft.accessDomain.trim(),
      region: draft.region.trim(),
      concurrency: draft.concurrency,
      multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
      part_size_mb: parseSizeMb(draft.partSize, 25),
      mount_mode: draft.mountMode,
      read_only: draft.readOnly,
      object_key_style: draft.objectKeyStyle,
    },
  }
}
