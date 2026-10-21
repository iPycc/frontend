﻿import type { BucketMount } from "@/lib/models"

import { AliyunStorageForm } from "@/components/storage/aliyun/AliyunStorageForm"
import { AliyunCorsStep } from "@/components/storage/aliyun/AliyunCorsStep"
import { LocalStorageForm } from "@/components/storage/local/LocalStorageForm"
import { ProviderSelector } from "@/components/storage/ProviderSelector"
import { StoragePolicyCard } from "@/components/storage/StoragePolicyCard"
import { StoragePolicyList } from "@/components/storage/StoragePolicyList"
import { TencentCorsStep } from "@/components/storage/tencent/TencentCorsStep"
import { TencentStorageForm } from "@/components/storage/tencent/TencentStorageForm"
import { RemoteDriveForm } from "@/components/storage/remote/RemoteDriveForm"
import type {
  RemoteDriveDraft,
  LocalStorageDraft,
  AliyunStorageDraft,
  StorageModuleDefinition,
  StorageStrategyKey,
  TencentStorageDraft,
} from "@/components/storage/types"

export {
  AliyunStorageForm,
  AliyunCorsStep,
  LocalStorageForm,
  ProviderSelector,
  StoragePolicyCard,
  StoragePolicyList,
  TencentCorsStep,
  TencentStorageForm,
  RemoteDriveForm,
}

export type {
  LocalStorageDraft,
  AliyunStorageDraft,
  StorageStrategyKey,
  TencentStorageDraft,
  RemoteDriveDraft,
}

const storageModules: Record<StorageStrategyKey, StorageModuleDefinition> = {
  tencent: {
    strategy: "tencent",
    label: "Tencent COS",
    canCreate: true,
    canEdit: (bucket: BucketMount) => bucket.storageType === "tencent" || !bucket.storageType,
  },
  local: {
    strategy: "local",
    label: "Local Storage",
    canCreate: true,
    canEdit: (bucket: BucketMount) => bucket.storageType === "local" || bucket.isLocal,
  },
  aliyun: {
    strategy: "aliyun",
    label: "Aliyun OSS",
    canCreate: true,
    canEdit: (bucket: BucketMount) => bucket.driverId === "aliyun_oss" || bucket.storageType === "aliyun",
  },
  "139": {
    strategy: "139",
    label: "139zhey",
    canCreate: true,
    canEdit: (bucket) => bucket.driverId === "drive_139",
  },
  "189": {
    strategy: "189",
    label: "189 Cloud",
    canCreate: true,
    canEdit: (bucket) => bucket.driverId === "drive_189",
  },
  wo: {
    strategy: "wo",
    label: "Wo Cloud",
    canCreate: true,
    canEdit: (bucket) => bucket.driverId === "drive_wo",
  },
}

export function getStorageModule(strategy: StorageStrategyKey) {
  return storageModules[strategy]
}

export function resolveStorageStrategy(bucket: BucketMount): StorageStrategyKey {
  if (bucket.driverId === "local_fs") return "local"
  if (bucket.driverId === "aliyun_oss") return "aliyun"
  if (bucket.driverId === "tencent_cos") return "tencent"
  if (bucket.driverId === "drive_139") return "139"
  if (bucket.driverId === "drive_189") return "189"
  if (bucket.driverId === "drive_wo") return "wo"

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
