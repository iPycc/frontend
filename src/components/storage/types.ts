﻿import type { BucketMount } from "@/lib/models"

export type DriveStrategyKey = "139" | "189" | "wo"
export type StorageStrategyKey = "tencent" | "local" | "aliyun" | DriveStrategyKey
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

export interface AliyunStorageDraft {
  name: string
  bucketName: string
  region: string
  endpoint: string
  prefix: string
  mountMode: "managed" | "mirror"
  readOnly: boolean
  legacyPrefixedKeys: boolean
  objectKeyStyle: "readable" | "opaque"
  accessKeyId: string
  accessKeySecret: string
  securityToken: string
  concurrency: number
  multipartThreshold: string
  partSize: string
  serverSideEncryption: "none" | "SSE-OSS" | "SSE-KMS"
  kmsKeyId: string
}

export interface RemoteDriveDraft {
  provider: DriveStrategyKey
  name: string
  token: string
  userDomainId: string
  rootId: string
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
