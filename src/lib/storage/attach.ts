import {
  createMount,
  createPolicy,
  deletePolicy,
  type CreateBucketMountInput,
  type CreateStoragePolicyInput,
} from "@/api/storage"

export async function attachStorage(
  token: string,
  policy: CreateStoragePolicyInput,
  mount: (policyId: number) => CreateBucketMountInput
) {
  const createdPolicy = await createPolicy(token, policy)
  try {
    const createdMount = await createMount(token, mount(createdPolicy.id))
    return { policy: createdPolicy, mount: createdMount }
  } catch (error) {
    try {
      await deletePolicy(token, createdPolicy.id)
    } catch {
      // Preserve the mount validation error; the orphan policy remains visible
      // to an administrator if compensating deletion itself fails.
    }
    throw error
  }
}
