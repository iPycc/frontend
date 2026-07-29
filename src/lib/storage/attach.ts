import type { CreateBucketMountInput, CreateStoragePolicyInput } from "@/api/storage"
import { createUserMount } from "@/api/user-storage"

export async function attachStorage(
  token: string,
  policy: CreateStoragePolicyInput,
  mount: (policyId: number) => CreateBucketMountInput
) {
  const { policy_id: _policyId, owner_id: _ownerId, ...mountInput } = mount(0)
  return createUserMount(token, policy, mountInput)
}
