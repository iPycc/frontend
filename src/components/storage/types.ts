﻿import type { BucketMount } from "@/lib/models"

export type StorageStrategyKey = "tencent" | "local" | "aliyun"
export type StorageFormMode = "create" | "edit" | "readonly"

export interface TencentStorageDraft {
  name: string
  bucketName: string
  region: string
  prefix: string
  mountMode: "managed" | "mirror"
  readOnly: boolean
  legacyPrefixedKeys: boolean
  objectKeyStyle: "readable" | "opaque"
  accessPermission: "private" | "public-read"
  accessDomain: string
  secretId: string
  secretKey: string
  concurrency: number
  multipartThreshold: string
  partSize: string
  serverSideEncryption: "none" | "SSE-COS" | "SSE-KMS"
  kmsKeyId: string
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
