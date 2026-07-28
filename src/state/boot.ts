import * as React from "react"

import { refreshToken as apiRefreshToken } from "@/api/auth"
import { configureAuthClient } from "@/api/client"
import {
  type AppSnapshot,
  type AuthSession,
  type FileNode,
} from "@/lib/models"
import {
  emitAuthEvent,
  mergeSessionTokens,
  subscribeAuthEvents,
} from "@/lib/session"
import {
  createEmptyProfile,
  createMountRootNode,
  fetchWorkspaceBasics,
  mapMountToBucket,
  type PageLoadState,
  type WorkspaceBasics,
} from "@/state/core"

type Setter<T> = React.Dispatch<React.SetStateAction<T>>

type BootDeps = {
  snapshotRef: { current: AppSnapshot }
  pageStatesRef: { current: Record<string, PageLoadState> }
  pageRequestsRef: { current: Map<string, Promise<void>> }
  updateSnapshot: (recipe: (current: AppSnapshot) => AppSnapshot) => void
  setAuthReady: Setter<boolean>
  setPageStates: Setter<Record<string, PageLoadState>>
  setCategoryNodesByKey: Setter<Record<string, FileNode[]>>
  setTreeFolderNodes: Setter<FileNode[]>
  setRecycleNodes: Setter<FileNode[]>
}

export function useBoot({
  snapshotRef,
  pageStatesRef,
  pageRequestsRef,
  updateSnapshot,
  setAuthReady,
  setPageStates,
  setCategoryNodesByKey,
  setTreeFolderNodes,
  setRecycleNodes,
}: BootDeps) {
  const hydrateWorkspace = React.useCallback(
    async (session: AuthSession, prefetchedBasics?: WorkspaceBasics) => {
      const token = session.tokens.accessToken
      const { profilePayload, rawMounts } = prefetchedBasics ?? await fetchWorkspaceBasics(token)
      const timezone = profilePayload.timezone || snapshotRef.current.settings.timezone

      const nextSession: AuthSession = {
        ...session,
        user: {
          ...session.user,
          username: profilePayload.profile.username,
          email: profilePayload.profile.email,
          avatar: profilePayload.profile.avatar,
          registeredAt: profilePayload.profile.registeredAt,
          group: profilePayload.profile.group,
          twoFactorEnabled: profilePayload.twoFactorEnabled,
        },
      }

      const tz = timezone
      const buckets = rawMounts.map((mount) => mapMountToBucket(mount, nextSession.user, tz))
      const rootNodes = buckets.map(createMountRootNode)

      updateSnapshot((current) => ({
        ...current,
        profile: profilePayload.profile,
        settings: {
          ...current.settings,
          timezone,
        },
        security: {
          ...current.security,
          passwordVerified: false,
          passwordUpdatedAt: profilePayload.passwordUpdatedAt,
          twoFactorEnabled: profilePayload.twoFactorEnabled,
          passkeysEnabled: false,
          passkeys: [],
        },
        auth: {
          session: nextSession,
        },
        loginActivity: [],
        buckets,
        activeBucketId:
          buckets.find((bucket) => bucket.id === current.activeBucketId)?.id ??
          buckets.find((bucket) => bucket.id === window.localStorage.getItem("cloudrave.last-mount"))?.id ??
          buckets[0]?.id ??
          "",
        nodes: rootNodes,
        shares: [],
        fileContents: {},
      }))
      setPageStates({})
      pageStatesRef.current = {}
      pageRequestsRef.current.clear()
      setCategoryNodesByKey({})
      setTreeFolderNodes([])
      setRecycleNodes([])
    },
    [updateSnapshot]
  )

  const clearWorkspace = React.useCallback(() => {
    updateSnapshot((current) => ({
      ...current,
      profile: createEmptyProfile(),
      security: {
        ...current.security,
        passwordVerified: false,
        passwordUpdatedAt: "",
        passkeysEnabled: false,
        passkeys: [],
        twoFactorEnabled: false,
      },
      auth: {
        session: null,
      },
      loginActivity: [],
      buckets: [],
      activeBucketId: "",
      nodes: [],
      shares: [],
      clipboard: null,
      fileContents: {},
    }))
    setPageStates({})
    pageStatesRef.current = {}
    pageRequestsRef.current.clear()
    setCategoryNodesByKey({})
    setTreeFolderNodes([])
    setRecycleNodes([])
  }, [updateSnapshot])

  const refreshAuthSession = React.useCallback(
    async (hydrate = false) => {
      const currentSession = snapshotRef.current.auth.session
      const refreshedTokens = await apiRefreshToken()
      let nextSession = currentSession ? mergeSessionTokens(currentSession, refreshedTokens) : null
      let prefetchedBasics: WorkspaceBasics | undefined

      if (!nextSession) {
        prefetchedBasics = await fetchWorkspaceBasics(refreshedTokens.accessToken)
        nextSession = {
          user: prefetchedBasics.profilePayload.account,
          tokens: refreshedTokens,
        }
      }

      if (hydrate) {
        await hydrateWorkspace(nextSession, prefetchedBasics)
      } else {
        updateSnapshot((current) => ({
          ...current,
          auth: {
            session: nextSession,
          },
        }))
      }

      return nextSession
    },
    [hydrateWorkspace, updateSnapshot]
  )

  React.useEffect(() => {
    let cancelled = false

    const bootstrapAuth = async () => {
      try {
        await refreshAuthSession(true)
      } catch {
        if (!cancelled) {
          clearWorkspace()
        }
      } finally {
        if (!cancelled) {
          setAuthReady(true)
        }
      }
    }

    void bootstrapAuth()

    return () => {
      cancelled = true
    }
  }, [clearWorkspace, refreshAuthSession])

  React.useEffect(() => {
    return subscribeAuthEvents((message) => {
      if (message.type === "session-updated") {
        void refreshAuthSession(true)
        return
      }

      clearWorkspace()
      setAuthReady(true)
    })
  }, [clearWorkspace, refreshAuthSession])

  React.useEffect(() => {
    configureAuthClient({
      getAccessToken: () => snapshotRef.current.auth.session?.tokens.accessToken ?? null,
      refreshAccessToken: async () => {
        try {
          const session = await refreshAuthSession(false)
          return session.tokens.accessToken
        } catch {
          clearWorkspace()
          emitAuthEvent({ type: "logout", reason: "session-expired" })
          return null
        }
      },
      onAuthFailure: () => {
        clearWorkspace()
        emitAuthEvent({ type: "logout", reason: "session-expired" })
      },
    })

    return () => {
      configureAuthClient({})
    }
  }, [clearWorkspace, refreshAuthSession])

  const reloadWorkspace = React.useCallback(async () => {
    const session = snapshotRef.current.auth.session
    if (!session) {
      return
    }

    await hydrateWorkspace(session)
  }, [hydrateWorkspace])


  return {
    hydrateWorkspace,
    clearWorkspace,
    reloadWorkspace,
  }
}
