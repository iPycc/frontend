import type { BucketMount } from "@/lib/models"

export type DriveStrategyKey = "139" | "189" | "wo"
export type StorageStrategyKey = "tencent" | "local" | "aliyun" | DriveStrategyKey
export type StorageFormMode = "create" | "edit" | "readonly"
export type ObjectPathMode = "readable" | "opaque" | "original" | "custom"

export interface TencentStorageDraft {
  name: string
  bucketName: string
  region: string
  prefix: string
  mountMode: "managed" | "mirror"
  readOnly: boolean
  importDeleteSource: boolean
  legacyPrefixedKeys: boolean
  objectKeyStyle: ObjectPathMode
  objectKeyTemplate?: string
  accessPermission: "private" | "public-read"
  downloadDomainType: "default" | "origin" | "cdn"
  downloadDomain: string
  downloadCdnAuth: "cos" | "public"
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
  downloadDomainType: "default" | "origin"
  downloadDomain: string
  name: string
  bucketName: string
  region: string
  endpoint: string
  prefix: string
  mountMode: "managed" | "mirror"
  readOnly: boolean
  importDeleteSource: boolean
  legacyPrefixedKeys: boolean
  objectKeyStyle: ObjectPathMode
  objectKeyTemplate?: string
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
