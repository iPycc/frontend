import type { BucketMount } from "@/lib/mock-data"

import { AliyunStorageForm } from "@/components/storage/aliyun/AliyunStorageForm"
import { LocalStorageForm } from "@/components/storage/local/LocalStorageForm"
import { ProviderSelector } from "@/components/storage/ProviderSelector"
import { StoragePolicyCard } from "@/components/storage/StoragePolicyCard"
import { StoragePolicyList } from "@/components/storage/StoragePolicyList"
import { TencentCorsStep } from "@/components/storage/tencent/TencentCorsStep"
import { TencentStorageForm } from "@/components/storage/tencent/TencentStorageForm"
import type {
  LocalStorageDraft,
  StorageModuleDefinition,
  StorageStrategyKey,
  TencentStorageDraft,
} from "@/components/storage/types"

export {
  AliyunStorageForm,
  LocalStorageForm,
  ProviderSelector,
  StoragePolicyCard,
  StoragePolicyList,
  TencentCorsStep,
  TencentStorageForm,
}

export type {
  LocalStorageDraft,
  StorageStrategyKey,
  TencentStorageDraft,
}

const storageModules: Record<StorageStrategyKey, StorageModuleDefinition> = {
  tencent: {
    strategy: "tencent",
    label: "腾讯云 COS",
    canCreate: true,
    canEdit: (bucket: BucketMount) => bucket.storageType === "tencent" || !bucket.storageType,
  },
  local: {
    strategy: "local",
    label: "Local Storage（本机存储）",
    canCreate: true,
    canEdit: (bucket: BucketMount) => bucket.storageType === "local" || bucket.isLocal,
  },
  aliyun: {
    strategy: "aliyun",
    label: "阿里云 OSS",
    canCreate: false,
    canEdit: () => false,
  },
}

export function getStorageModule(strategy: StorageStrategyKey) {
  return storageModules[strategy]
}

export function resolveStorageStrategy(bucket: BucketMount): StorageStrategyKey {
  if (bucket.storageType) {
    return bucket.storageType
  }

  if (bucket.isLocal) {
    return "local"
  }

  const provider = bucket.provider.toLowerCase()
  if (provider.includes("local") || provider.includes("本机")) {
    return "local"
  }
  if (provider.includes("aliyun") || provider.includes("阿里") || provider.includes("oss")) {
    return "aliyun"
  }

  return "tencent"
}
