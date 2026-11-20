import type { BucketMount } from "@/lib/models"
import type { TencentStorageDraft } from "@/components/storage/types"

export const ORIGINAL_OBJECT_PATH = "{dir}/{filename}"
export const DEFAULT_OBJECT_PATH_TEMPLATE = "{dir}/{blob_id}-{filename}"

type ObjectPathDraft = Pick<TencentStorageDraft, "objectKeyStyle" | "objectKeyTemplate">

export function objectPathDraft(bucket: BucketMount): ObjectPathDraft {
  const template = bucket.extra?.object_key_template
  if (typeof template !== "string") return { objectKeyStyle: bucket.objectKeyStyle }
  return {
    objectKeyStyle: template === ORIGINAL_OBJECT_PATH ? "original" : "custom",
    objectKeyTemplate: template,
  }
}

export function objectPathSettings(draft: ObjectPathDraft) {
  let template: string | null = null
  if (draft.objectKeyStyle === "original") template = ORIGINAL_OBJECT_PATH
  if (draft.objectKeyStyle === "custom") template = draft.objectKeyTemplate ?? DEFAULT_OBJECT_PATH_TEMPLATE
  return {
    object_key_style: draft.objectKeyStyle === "opaque" ? "opaque" : "readable",
    object_key_template: template,
  }
}
