﻿import type { BucketMount } from "@/lib/models"

export type StorageStrategyKey = "tencent" | "local" | "aliyun"
export type StorageFormMode = "create" | "edit" | "readonly"

export interface TencentStorageDraft {
  name: string
  bucketName: string
  accessPermission: "private" | "public-read"
  accessDomain: string
  secretId: string
  secretKey: string
}

export interface LocalStorageDraft {
  name: string
  path: string
  pathCustomized: boolean
  concurrency: number
  multipartThreshold: string
  partSize: string
}

export interface StrategyOption {
  strategy: StorageStrategyKey
  label: string
  description: string
  enabled: boolean
}

export interface StorageModuleDefinition {
  strategy: StorageStrategyKey
  label: string
  canCreate: boolean
  canEdit: (bucket: BucketMount) => boolean
}

