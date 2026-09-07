import { requestJson } from "@/api/client"

export type GitHubOAuthPublicSettings = {
  enabled: boolean
  authorize_url: string
}

export type GitHubOAuthAdminSettings = {
  enabled: boolean
  client_id: string
  client_secret_configured: boolean
  callback_url: string
}

export type GitHubOAuthConnection = {
  enabled: boolean
  linked: boolean
  provider_username: string | null
  provider_avatar_url: string | null
  link_url: string
}

export type GoogleOAuthPublicSettings = {
  enabled: boolean
  authorize_url: string
}

export type GoogleOAuthAdminSettings = {
  enabled: boolean
  client_id: string
  client_secret_configured: boolean
  callback_url: string
}

export type GoogleOAuthConnection = {
  enabled: boolean
  linked: boolean
  provider_username: string | null
  provider_avatar_url: string | null
  link_url: string
}

export async function getGitHubOAuthStatus(signal?: AbortSignal) {
  return requestJson<GitHubOAuthPublicSettings>("/oauth/github", {
    signal,
    skipAuthRefresh: true,
  })
}

export async function getGitHubOAuthSettings(token: string, signal?: AbortSignal) {
  return requestJson<GitHubOAuthAdminSettings>("/oauth/github/settings", {
    token,
    signal,
  })
}

export async function getGitHubOAuthConnection(token: string, signal?: AbortSignal) {
  return requestJson<GitHubOAuthConnection>("/oauth/github/connection", {
    token,
    signal,
  })
}

export async function unlinkGitHubOAuthConnection(token: string) {
  return requestJson<GitHubOAuthConnection>("/oauth/github/connection", {
    method: "DELETE",
    token,
  })
}

export async function updateGitHubOAuthSettings(
  token: string,
  payload: { enabled: boolean; clientId: string; clientSecret?: string }
) {
  return requestJson<GitHubOAuthAdminSettings>("/oauth/github/settings", {
    method: "PUT",
    token,
    body: {
      enabled: payload.enabled,
      client_id: payload.clientId,
      ...(payload.clientSecret?.trim() ? { client_secret: payload.clientSecret } : {}),
    },
  })
}

export async function getGoogleOAuthStatus(signal?: AbortSignal) {
  return requestJson<GoogleOAuthPublicSettings>("/oauth/google", {
    signal,
    skipAuthRefresh: true,
  })
}

export async function getGoogleOAuthSettings(token: string, signal?: AbortSignal) {
  return requestJson<GoogleOAuthAdminSettings>("/oauth/google/settings", {
    token,
    signal,
  })
}

export async function getGoogleOAuthConnection(token: string, signal?: AbortSignal) {
  return requestJson<GoogleOAuthConnection>("/oauth/google/connection", {
    token,
    signal,
  })
}

export async function unlinkGoogleOAuthConnection(token: string) {
  return requestJson<GoogleOAuthConnection>("/oauth/google/connection", {
    method: "DELETE",
    token,
  })
}

export async function updateGoogleOAuthSettings(
  token: string,
  payload: { enabled: boolean; clientId: string; clientSecret?: string }
) {
  return requestJson<GoogleOAuthAdminSettings>("/oauth/google/settings", {
    method: "PUT",
    token,
    body: {
      enabled: payload.enabled,
      client_id: payload.clientId,
      ...(payload.clientSecret?.trim() ? { client_secret: payload.clientSecret } : {}),
    },
  })
}
