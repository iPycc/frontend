import * as React from "react"
import { useAppState } from "@/lib/app-state"
import {
  StoragePolicyList,
  ProviderSelector,
  CosPolicyForm,
  CorsStep,
  PolicyEditPage,
} from "@/components/storage-policy"
import type { CosPolicyDraft } from "@/components/storage-policy"
import type { BucketMount } from "@/lib/mock-data"

type View =
  | { type: "list" }
  | { type: "select-provider" }
  | { type: "cos-form" }
  | { type: "cors-step" }
  | { type: "edit"; bucket: BucketMount }

function createEmptyCosDraft(): CosPolicyDraft {
  return {
    name: "",
    bucketName: "",
    accessPermission: "private",
    accessDomain: "",
    secretId: "",
    secretKey: "",
  }
}

export function StorageSettingsPage() {
  const { buckets, addBucket, updateBucket } = useAppState()
  const [view, setView] = React.useState<View>({ type: "list" })
  const [cosDraft, setCosDraft] = React.useState<CosPolicyDraft>(createEmptyCosDraft)

  const handleAddPolicy = () => {
    setCosDraft(createEmptyCosDraft())
    setView({ type: "select-provider" })
  }

  const handleProviderSelect = (provider: string) => {
    if (provider === "tencent-cos") {
      setView({ type: "cos-form" })
    }
  }

  const handleCosNext = () => {
    setView({ type: "cors-step" })
  }

  const handleCorsSubmit = () => {
    addBucket({
      name: cosDraft.name,
      provider: "Tencent COS",
      bucket: cosDraft.bucketName,
      region: "ap-guangzhou",
      endpoint: cosDraft.accessDomain,
      secretId: cosDraft.secretId,
      secretKey: cosDraft.secretKey,
      basePrefix: "",
      sessionToken: "",
      multipartThreshold: "25 MB",
      partSize: "25 MB",
      presignTtl: "900",
      concurrency: 3,
      protocol: "https",
      pathStyle: false,
      accelerate: false,
      corsConfigured: true,
      advancedMode: false,
    })
    setView({ type: "list" })
  }

  const handleEditPolicy = (bucket: BucketMount) => {
    setView({ type: "edit", bucket })
  }

  const handleDeletePolicy = (_bucket: BucketMount) => {
    // TODO: wire up delete
  }

  const handleSaveEdit = () => {
    setView({ type: "list" })
  }

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
        <ProviderSelector
          onBack={() => setView({ type: "list" })}
          onSelect={handleProviderSelect}
        />
      )}

      {view.type === "cos-form" && (
        <CosPolicyForm
          draft={cosDraft}
          onChange={setCosDraft}
          onBack={() => setView({ type: "select-provider" })}
          onNext={handleCosNext}
        />
      )}

      {view.type === "cors-step" && (
        <CorsStep
          onBack={() => setView({ type: "cos-form" })}
          onSubmit={handleCorsSubmit}
        />
      )}

      {view.type === "edit" && (
        <PolicyEditPage
          bucket={view.bucket}
          onBack={() => setView({ type: "list" })}
          onSave={handleSaveEdit}
        />
      )}
    </div>
  )
}
