import type {
  CreateBucketMountInput,
  CreateStoragePolicyInput,
  StorageDriverInspection,
  StorageDriverId,
} from "@/api/storage"
import type {
  LocalStorageDraft,
  AliyunStorageDraft,
  RemoteDriveDraft,
  TencentStorageDraft,
} from "@/components/storage"
import { remoteDriveCredentials } from "@/components/storage/remote/RemoteDriveForm"
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
  | { type: "cors-step"; strategy: "tencent" | "aliyun" }
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

export function createEmptyAliyunDraft(): AliyunStorageDraft {
  return {
    name: "",
    bucketName: "",
    region: "cn-hangzhou",
    endpoint: "",
    prefix: "",
    mountMode: "managed",
    readOnly: false,
    legacyPrefixedKeys: false,
    objectKeyStyle: "readable",
    accessKeyId: "",
    accessKeySecret: "",
    securityToken: "",
    concurrency: 3,
    multipartThreshold: "25 MB",
    partSize: "25 MB",
    serverSideEncryption: "none",
    kmsKeyId: "",
  }
}

const remoteDriveDefaults = {
  "139": { name: "139zhey", rootId: "/" },
  "189": { name: "189 Cloud", rootId: "-11" },
  wo: { name: "Wo Cloud", rootId: "0" },
} as const

export function createEmptyRemoteDriveDraft(provider: RemoteDriveDraft["provider"]): RemoteDriveDraft {
  const defaults = remoteDriveDefaults[provider]
  return { provider, name: defaults.name, token: "", userDomainId: "", rootId: defaults.rootId }
}

export function remoteDriveId(provider: RemoteDriveDraft["provider"]): StorageDriverId {
  if (provider === "139") return "drive_139"
  if (provider === "189") return "drive_189"
  return "drive_wo"
}

export function remoteDriveLabel(provider: RemoteDriveDraft["provider"]) {
  return remoteDriveDefaults[provider].name
}

export function buildRemoteDrivePolicyInput(
  draft: RemoteDriveDraft,
  inspection: StorageDriverInspection
): CreateStoragePolicyInput {
  const label = remoteDriveLabel(draft.provider)
  const partSizeMb = draft.provider === "189" ? 10 : draft.provider === "wo" ? 5 : 25
  return {
    name: draft.name.trim(),
    provider: remoteDriveId(draft.provider),
    bucket_name: inspection.account_id,
    credentials: remoteDriveCredentials({ ...draft, rootId: inspection.root_id }),
    status: "active",
    description: `${label} account ${inspection.account_id}`,
    multipart_threshold_mb: 25,
    part_size_mb: partSizeMb,
    presign_ttl_seconds: 900,
    is_default: false,
    cors_auto_configured: false,
    extra: {
      provider_label: label,
      storage_type: draft.provider,
      account_id: inspection.account_id,
      display_name: inspection.display_name,
      root_id: inspection.root_id,
      provider_used_bytes: inspection.used_bytes,
      provider_total_bytes: inspection.total_bytes,
      provider_free_bytes: inspection.free_bytes,
      mount_mode: "mirror",
      read_only: false,
    },
  }
}

export function buildRemoteDriveMountInput(
  draft: RemoteDriveDraft,
  inspection: StorageDriverInspection,
  fallbackSlug: string,
  policyId: number
): CreateBucketMountInput {
  const label = remoteDriveLabel(draft.provider)
  return {
    policy_id: policyId,
    name: draft.name.trim(),
    mount_slug: slugify(draft.name) || fallbackSlug,
    root_path: "",
    provider_label: label,
    is_enabled: true,
    mode: "mirror",
    read_only: false,
    quota_bytes: inspection.total_bytes,
    extra: {
      provider_label: label,
      storage_type: draft.provider,
      account_id: inspection.account_id,
      display_name: inspection.display_name,
      root_id: inspection.root_id,
      provider_used_bytes: inspection.used_bytes,
      provider_total_bytes: inspection.total_bytes,
      provider_free_bytes: inspection.free_bytes,
      mount_mode: "mirror",
      read_only: false,
      object_key_style: "readable",
    },
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
    credentials: {
      secret_id: draft.secretId.trim(),
      secret_key: draft.secretKey.trim(),
    },
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

export function buildAliyunPolicyInput(draft: AliyunStorageDraft): CreateStoragePolicyInput {
  return {
    name: draft.name.trim(),
    provider: "aliyun_oss",
    bucket_name: draft.bucketName.trim(),
    region: draft.region.trim(),
    endpoint: draft.endpoint.trim() || undefined,
    base_prefix: "",
    credentials: {
      access_key_id: draft.accessKeyId.trim(),
      access_key_secret: draft.accessKeySecret.trim(),
      ...(draft.securityToken.trim() ? { security_token: draft.securityToken.trim() } : {}),
    },
    status: "active",
    description: `Aliyun OSS bucket ${draft.bucketName.trim()}`,
    multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
    part_size_mb: parseSizeMb(draft.partSize, 25),
    presign_ttl_seconds: 900,
    is_default: false,
    cors_auto_configured: false,
    extra: {
      provider_label: "Aliyun OSS",
      storage_type: "aliyun",
      concurrency: draft.concurrency,
      multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
      part_size_mb: parseSizeMb(draft.partSize, 25),
      server_side_encryption: draft.serverSideEncryption,
      kms_key_id: draft.serverSideEncryption === "SSE-KMS" ? draft.kmsKeyId.trim() : "",
    },
  }
}

export function buildAliyunMountInput(draft: AliyunStorageDraft, fallbackSlug: string, policyId: number): CreateBucketMountInput {
  return {
    policy_id: policyId,
    name: draft.name.trim(),
    mount_slug: slugify(draft.name) || fallbackSlug,
    root_path: draft.prefix.trim().replace(/^\/+|\/+$/g, ""),
    provider_label: "Aliyun OSS",
    is_enabled: true,
    mode: draft.mountMode,
    read_only: draft.readOnly,
    legacy_prefixed_keys: draft.legacyPrefixedKeys,
    extra: {
      provider_label: "Aliyun OSS",
      storage_type: "aliyun",
      concurrency: draft.concurrency,
      multipart_threshold_mb: parseSizeMb(draft.multipartThreshold, 25),
      part_size_mb: parseSizeMb(draft.partSize, 25),
      mount_mode: draft.mountMode,
      read_only: draft.readOnly,
      object_key_style: draft.objectKeyStyle,
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
