import * as React from "react"

import { refreshToken as apiRefreshToken } from "@/api/auth"
import { configureAuthClient } from "@/api/client"
import {
  listCategoryNodePage,
  listNodePage,
  type ExplorerNodePage,
} from "@/api/files"
import { loadFileViewPreferences } from "@/lib/file-view-preferences"
import {
  clearFileRouteCache,
  getCachedFolderChain,
  pageStateFromResponse,
  saveFileRouteCache,
} from "@/state/file-route-cache"
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
  categoryPageKey,
  directoryPageKey,
  fetchWorkspaceBasics,
  mapNodeToFileNode,
  mapMountToBucket,
  type PageLoadState,
  type WorkspaceBasics,
} from "@/state/core"

type Setter<T> = React.Dispatch<React.SetStateAction<T>>

type PrefetchCategory = "image" | "video" | "audio" | "document"

type InitialFileRoutePrefetch = {
  bucketId: string
  backendId: number
  category: PrefetchCategory | null
  parentId: string
  ancestors: FileNode[]
  response: ExplorerNodePage
  limit: number
  sort: ReturnType<typeof loadFileViewPreferences>["sortValue"]
}

const PREFETCH_CATEGORIES = new Set<PrefetchCategory>(["image", "video", "audio", "document"])

async function prefetchInitialFileRoute(token: string, snapshot: AppSnapshot): Promise<InitialFileRoutePrefetch | null> {
  if (typeof window === "undefined" || !["/app", "/images"].includes(window.location.pathname)) {
    return null
  }

  const params = new URLSearchParams(window.location.search)
  const path = params.get("folder") ?? ""
  const rawCategory = window.location.pathname === "/images" ? "image" : params.get("type")
  const category = rawCategory && PREFETCH_CATEGORIES.has(rawCategory as PrefetchCategory)
    ? rawCategory as PrefetchCategory
    : null
  const bucket = snapshot.buckets.find((item) => item.id === snapshot.activeBucketId) ?? snapshot.buckets[0]
  if (!bucket || bucket.backendId === undefined) return null

  const folderChain = category ? null : getCachedFolderChain(snapshot, path, bucket.id)
  if (!category && !folderChain) return null
  const parentId = category ? bucket.rootNodeId : folderChain!.parentId
  const apiParentId = parentId.startsWith("root:") ? undefined : Number(parentId)
  if (apiParentId !== undefined && Number.isNaN(apiParentId)) return null

  const { pageSize: limit, sortValue: sort } = loadFileViewPreferences()
  try {
    const pageRequest = category
      ? listCategoryNodePage(token, { mountId: bucket.backendId, category, limit, sort })
      : listNodePage(token, { mountId: bucket.backendId, parentId: apiParentId, limit, sort })
    const response = await pageRequest
    return {
      bucketId: bucket.id,
      backendId: bucket.backendId,
      category,
      parentId,
      ancestors: folderChain?.ancestors ?? [],
      response,
      limit,
      sort,
    }
  } catch {
    return null
  }
}

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
    async (
      session: AuthSession,
      prefetchedBasics?: WorkspaceBasics,
      initialFileRoute?: InitialFileRoutePrefetch | null
    ) => {
      const token = session.tokens.accessToken
      const { profilePayload, rawMounts, mountUsage } = prefetchedBasics ?? await fetchWorkspaceBasics(token)
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
          capabilities: profilePayload.account.capabilities,
        },
      }

      const tz = timezone
      const usageByMount = new Map(mountUsage.map((usage) => [usage.mount_id, usage]))
      const buckets = rawMounts.map((mount) => {
        const bucket = mapMountToBucket(mount, nextSession.user, tz)
        const usage = usageByMount.get(mount.id)
        return usage?.quota_bytes != null
          ? { ...bucket, quota: { used: usage.used_bytes + usage.reserved_bytes, total: usage.quota_bytes } }
          : bucket
      })
      const rootNodes = buckets.map(createMountRootNode)
      const prefetchedBucket = initialFileRoute
        ? buckets.find((bucket) => bucket.id === initialFileRoute.bucketId && bucket.backendId === initialFileRoute.backendId)
        : undefined
      const prefetchedNodes = prefetchedBucket && initialFileRoute
        ? initialFileRoute.response.items.map((node) => mapNodeToFileNode(
            node,
            prefetchedBucket.id,
            initialFileRoute.category && node.parent_id ? String(node.parent_id) : initialFileRoute.parentId,
            tz
          ))
        : []
      const preserveCachedRoute = !initialFileRoute && Object.values(pageStatesRef.current).some(
        (state) => state.metadataLoaded && !state.loaded
      )
      const nextPageStates: Record<string, PageLoadState> = preserveCachedRoute
        ? pageStatesRef.current
        : {}
      const nextCategoryNodes: Record<string, FileNode[]> = {}

      if (prefetchedBucket && initialFileRoute) {
        const stateKey = initialFileRoute.category
          ? categoryPageKey(initialFileRoute.category, prefetchedBucket.id)
          : directoryPageKey("content", prefetchedBucket.id, initialFileRoute.parentId)
        nextPageStates[stateKey] = pageStateFromResponse(
          `${initialFileRoute.sort}:${initialFileRoute.limit}`,
          initialFileRoute.response
        )
        if (initialFileRoute.category) {
          nextCategoryNodes[stateKey] = prefetchedNodes
        }
      }

      updateSnapshot((current) => ({
        ...current,
        profile: profilePayload.profile,
        settings: {
          ...current.settings,
          timezone,
          thumbnailsEnabled: profilePayload.thumbnailsEnabled,
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
        nodes: [
          ...rootNodes,
          ...(preserveCachedRoute
            ? snapshotRef.current.nodes.filter((node) => (
                !node.isSystemRoot && buckets.some((bucket) => bucket.id === node.bucketId)
              ))
            : []),
          ...(prefetchedBucket && initialFileRoute ? initialFileRoute.ancestors : []),
          ...prefetchedNodes,
        ],
        shares: [],
        fileContents: {},
      }))
      setPageStates(nextPageStates)
      pageStatesRef.current = nextPageStates
      pageRequestsRef.current.clear()
      setCategoryNodesByKey((current) => preserveCachedRoute ? current : nextCategoryNodes)
      setTreeFolderNodes([])
      setRecycleNodes([])

      if (prefetchedBucket && initialFileRoute) {
        const stateKey = initialFileRoute.category
          ? categoryPageKey(initialFileRoute.category, prefetchedBucket.id)
          : directoryPageKey("content", prefetchedBucket.id, initialFileRoute.parentId)
        saveFileRouteCache({
          snapshot: snapshotRef.current,
          bucketId: prefetchedBucket.id,
          parentId: initialFileRoute.parentId,
          category: initialFileRoute.category,
          nodes: prefetchedNodes,
          pageState: nextPageStates[stateKey],
        })
      }
    },
    [updateSnapshot]
  )

  const clearWorkspace = React.useCallback(() => {
    clearFileRouteCache()
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
        const basicsRequest = prefetchedBasics
          ? Promise.resolve(prefetchedBasics)
          : fetchWorkspaceBasics(nextSession.tokens.accessToken)
        const initialFileRouteRequest = prefetchInitialFileRoute(nextSession.tokens.accessToken, snapshotRef.current)
        const [basics, initialFileRoute] = await Promise.all([basicsRequest, initialFileRouteRequest])
        await hydrateWorkspace(nextSession, basics, initialFileRoute)
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
