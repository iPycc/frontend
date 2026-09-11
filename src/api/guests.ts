import { requestJson } from "@/api/client"

export type GuestAccount = {
  id: number
  uid: string
  email: string
  username: string
  enabled: boolean
  expired: boolean
  expires_at?: string | null
  source_mount_id: number
  workspace_mount_id: number
  workspace_prefix: string
  quota_bytes: number
  used_bytes: number
  reserved_bytes: number
  created_at: string
}

export type GuestCredentials = {
  email: string
  password: string
}

export async function listGuests(token: string) {
  return requestJson<GuestAccount[]>("/admin/guests", { token })
}

export async function createGuest(token: string, body: {
  source_mount_id: number
  quota_bytes: number
  expires_at?: string | null
}) {
  return requestJson<{ guest: GuestAccount; credentials: GuestCredentials }>("/admin/guests", {
    method: "POST",
    token,
    body,
  })
}

export async function updateGuest(token: string, guestId: number, body: {
  enabled?: boolean
  quota_bytes?: number
  expires_at?: string | null
  clear_expiry?: boolean
}) {
  return requestJson<GuestAccount>(`/admin/guests/${guestId}`, {
    method: "PATCH",
    token,
    body,
  })
}

export async function resetGuestPassword(token: string, guestId: number) {
  return requestJson<GuestCredentials>(`/admin/guests/${guestId}/reset-password`, {
    method: "POST",
    token,
  })
}
