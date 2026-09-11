import * as React from "react"

import {
  beginPasskeyLogin as apiBeginPasskeyLogin,
  finishPasskeyLogin as apiFinishPasskeyLogin,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  verifyTwoFactorLogin as apiVerifyTwoFactorLogin,
} from "@/api/auth"
import {
  type AppSnapshot,
  type AuthSession,
  type SecurityState,
  type ThemeMode,
  type UserProfile,
  type UserSettings,
} from "@/lib/models"
import { emitAuthEvent } from "@/lib/session"
import {
  isPasskeyCanceled,
  type AuthRegisterInput,
  type AuthResult,
} from "@/state/core"

type AuthDeps = {
  hydrateWorkspace: (session: AuthSession) => Promise<void>
  clearWorkspace: () => void
  updateSnapshot: (recipe: (current: AppSnapshot) => AppSnapshot) => void
}

export function useAuth({
  hydrateWorkspace,
  clearWorkspace,
  updateSnapshot,
}: AuthDeps) {
  const setThemeMode = React.useCallback(
    (mode: ThemeMode) => {
      updateSnapshot((current) => ({
        ...current,
        settings: { ...current.settings, themeMode: mode },
      }))
    },
    [updateSnapshot]
  )

  const updateSettings = React.useCallback(
    (patch: Partial<UserSettings>) => {
      updateSnapshot((current) => ({
        ...current,
        settings: { ...current.settings, ...patch },
      }))
    },
    [updateSnapshot]
  )

  const updateProfile = React.useCallback(
    (patch: Partial<UserProfile>) => {
      updateSnapshot((current) => ({
        ...current,
        profile: { ...current.profile, ...patch },
        auth: current.auth.session
          ? {
              session: {
                ...current.auth.session,
                user: {
                  ...current.auth.session.user,
                  username: patch.username ?? current.auth.session.user.username,
                  email: patch.email ?? current.auth.session.user.email,
                  avatar: patch.avatar ?? current.auth.session.user.avatar,
                  group: patch.group ?? current.auth.session.user.group,
                  registeredAt: patch.registeredAt ?? current.auth.session.user.registeredAt,
                },
              },
            }
          : current.auth,
      }))
    },
    [updateSnapshot]
  )

  const login = React.useCallback(
    async (email: string, password: string): Promise<AuthResult> => {
      try {
        const result = await apiLogin({ email: email.trim().toLowerCase(), password: password.trim() })
        if (result.kind === "2fa") {
          return {
            success: false,
            message: "requires_2fa",
            twoFactorToken: result.twoFactorToken,
            method: result.method,
          }
        }
        await hydrateWorkspace(result)
        emitAuthEvent({ type: "session-updated" })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "登录失败",
        }
      }
    },
    [hydrateWorkspace]
  )

  const loginWithPasskey = React.useCallback(
    async (emailHint?: string): Promise<AuthResult> => {
      try {
        const { startAuthentication } = await import("@simplewebauthn/browser")
        const begin = await apiBeginPasskeyLogin(emailHint)
        const credential = await startAuthentication({
          optionsJSON: begin.options as unknown as Parameters<typeof startAuthentication>[0]["optionsJSON"],
        })
        const result = await apiFinishPasskeyLogin({
          ceremonyId: begin.ceremony_id,
          credential: credential as unknown as Record<string, unknown>,
        })
        if (result.kind === "2fa") {
          return {
            success: false,
            message: "requires_2fa",
            twoFactorToken: result.twoFactorToken,
            method: result.method,
          }
        }
        await hydrateWorkspace(result)
        emitAuthEvent({ type: "session-updated" })
        return { success: true }
      } catch (error) {
        if (isPasskeyCanceled(error)) {
          return {
            success: false,
            message: "用户已取消登录",
          }
        }
        return {
          success: false,
          message: error instanceof Error ? error.message : "通行密钥登录失败",
        }
      }
    },
    [hydrateWorkspace]
  )

  const verifyTwoFactor = React.useCallback(
    async (
      twoFactorToken: string,
      code: string,
      method: "password" | "passkey" | "github" | "google" | "qq" = "password"
    ): Promise<AuthResult> => {
      try {
        const session = await apiVerifyTwoFactorLogin({
          twoFactorToken,
          code,
          method,
        })
        await hydrateWorkspace(session)
        emitAuthEvent({ type: "session-updated" })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "两步验证失败",
        }
      }
    },
    [hydrateWorkspace]
  )

  const register = React.useCallback(
    async (input: AuthRegisterInput): Promise<AuthResult> => {
      try {
        const session = await apiRegister({
          email: input.email.trim().toLowerCase(),
          password: input.password.trim(),
          username: input.username.trim(),
        })
        await hydrateWorkspace(session)
        emitAuthEvent({ type: "session-updated" })
        return { success: true }
      } catch (error) {
        return {
          success: false,
          message: error instanceof Error ? error.message : "注册失败",
        }
      }
    },
    [hydrateWorkspace]
  )

  const logout = React.useCallback(async (scope: "current" | "all" = "current") => {
    try {
      await apiLogout(scope)
    } catch {
      // ignore transport failures
    } finally {
      clearWorkspace()
      emitAuthEvent({ type: "logout", reason: "user-initiated" })
    }
  }, [clearWorkspace])

  const verifyPassword = React.useCallback(
    (value: string) => {
      const passed = value.trim().length > 0
      if (passed) {
        updateSnapshot((current) => ({
          ...current,
          security: { ...current.security, passwordVerified: true },
        }))
      }

      return passed
    },
    [updateSnapshot]
  )

  const resetPasswordVerification = React.useCallback(() => {
    updateSnapshot((current) => ({
      ...current,
      security: { ...current.security, passwordVerified: false },
    }))
  }, [updateSnapshot])

  const updateSecurity = React.useCallback(
    (patch: Partial<SecurityState>) => {
      updateSnapshot((current) => ({
        ...current,
        security: { ...current.security, ...patch },
      }))
    },
    [updateSnapshot]
  )

  const setActiveBucket = React.useCallback(
    (bucketId: string) => {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("cloudrave.last-mount", bucketId)
      }
      updateSnapshot((current) => ({ ...current, activeBucketId: bucketId }))
    },
    [updateSnapshot]
  )


  return {
    setThemeMode,
    updateSettings,
    updateProfile,
    login,
    loginWithPasskey,
    verifyTwoFactor,
    register,
    logout,
    verifyPassword,
    resetPasswordVerification,
    updateSecurity,
    setActiveBucket,
  }
}
