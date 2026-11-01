import * as React from "react"

import { checkBackendHealth } from "@/api/system"
import { getPreviewManifest, listUserMounts, saveTextPreview } from "@/api/files"
import {
  formatBytes,
  type AppSnapshot,
  type FileNode,
} from "@/lib/models"
import { UploadProvider } from "@/lib/upload/provider"
import { isExpired } from "@/lib/session"
import { toast } from "sonner"
import { useActions } from "@/state/act"
import { useAuth } from "@/state/auth"
import { useBoot } from "@/state/boot"
import { loadInitialFileRouteState } from "@/state/file-route-cache"
import { useNav } from "@/state/nav"

import {
  AppStateContext,
  AuthStateContext,
  SettingsStateContext,
  EMPTY_BUCKET,
  EMPTY_PAGE_STATE,
  STORAGE_KEY,
  createPersistedBucketPreview,
  loadSnapshot,
  type AppStateValue,
  type AuthStateValue,
  type SettingsStateValue,
  type PageLoadState,
} from "@/state/core"

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [initialState] = React.useState(() => loadInitialFileRouteState(loadSnapshot()))
  const [snapshot, setSnapshot] = React.useState<AppSnapshot>(initialState.snapshot)
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")
  const [authReady, setAuthReady] = React.useState(false)
  const [pageStates, setPageStates] = React.useState<Record<string, PageLoadState>>(initialState.pageStates)
  const [categoryNodesByKey, setCategoryNodesByKey] = React.useState<Record<string, FileNode[]>>(initialState.categoryNodesByKey)
  const [treeFolderNodes, setTreeFolderNodes] = React.useState<FileNode[]>([])
  const [recycleNodes, setRecycleNodes] = React.useState<FileNode[]>([])
  const [recycleLoading, setRecycleLoading] = React.useState(false)
  const [sharesLoading, setSharesLoading] = React.useState(false)
  const backendHealthNotifiedRef = React.useRef(false)
  const snapshotRef = React.useRef(snapshot)
  const pageStatesRef = React.useRef(pageStates)
  const pageRequestsRef = React.useRef(new Map<string, Promise<void>>())

  React.useEffect(() => {
    snapshotRef.current = snapshot
  }, [snapshot])

  React.useEffect(() => {
    pageStatesRef.current = pageStates
  }, [pageStates])

  React.useEffect(() => {
    if (typeof window === "undefined") {
      return
    }

    const activeBucket = snapshot.buckets.find((bucket) => bucket.id === snapshot.activeBucketId)
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        auth: {
          session: snapshot.auth.session
            ? {
                user: snapshot.auth.session.user,
                tokens: {
                  accessToken: "",
                  accessExpiresAt: snapshot.auth.session.tokens.accessExpiresAt,
                  refreshExpiresAt: snapshot.auth.session.tokens.refreshExpiresAt,
                },
              }
            : null,
        },
        settings: snapshot.settings,
        security: {
          passwordUpdatedAt: snapshot.security.passwordUpdatedAt,
          twoFactorEnabled: snapshot.security.twoFactorEnabled,
        },
        shares: snapshot.shares,
        activeBucketId: snapshot.activeBucketId,
        buckets: activeBucket ? [createPersistedBucketPreview(activeBucket)] : [],
      })
    )
  }, [snapshot.activeBucketId, snapshot.auth, snapshot.buckets, snapshot.security.passwordUpdatedAt, snapshot.security.twoFactorEnabled, snapshot.settings, snapshot.shares])

  React.useEffect(() => {
    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), 4000)

    const verifyBackend = async () => {
      try {
        await checkBackendHealth(controller.signal)
      } catch {
        if (controller.signal.aborted || backendHealthNotifiedRef.current) {
          return
        }

        backendHealthNotifiedRef.current = true
        toast.error("后端服务暂时没有响应", {
          description: "请确认 Cloudrave 后端已启动，并检查前端 API 地址配置。",
        })
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    void verifyBackend()

    return () => {
      controller.abort()
      window.clearTimeout(timeoutId)
    }
  }, [])

  React.useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)")
    const update = () => setSystemTheme(media.matches ? "dark" : "light")
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  const effectiveTheme = snapshot.settings.themeMode === "system" ? systemTheme : snapshot.settings.themeMode

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", effectiveTheme === "dark")
  }, [effectiveTheme])

  const authSession = snapshot.auth.session
  const currentUser = authSession?.user ?? null
  const isAuthenticated = Boolean(authSession && currentUser && !isExpired(authSession.tokens.accessExpiresAt))

  const reauthorizationNotifiedRef = React.useRef(new Set<string>())
  const remoteMountsPresent = snapshot.buckets.some((bucket) =>
    ["drive_139", "drive_189", "drive_wo"].includes(bucket.driverId ?? "")
  )

  React.useEffect(() => {
    if (!isAuthenticated) {
      reauthorizationNotifiedRef.current.clear()
      return
    }
    const invalid = new Set(snapshot.buckets.filter((bucket) => bucket.extra?.requires_reauthorization === true).map((bucket) => bucket.id))
    for (const id of reauthorizationNotifiedRef.current) {
      if (!invalid.has(id)) reauthorizationNotifiedRef.current.delete(id)
    }
    for (const bucket of snapshot.buckets) {
      if (!invalid.has(bucket.id) || reauthorizationNotifiedRef.current.has(bucket.id)) continue
      reauthorizationNotifiedRef.current.add(bucket.id)
      toast.error(`「${bucket.name}」需要重新授权`, {
        id: `storage-reauthorization:${bucket.id}`,
        description: bucket.canEditConnection
          ? "登录信息已失效，请重新登录运营商网页并更新该云盘的登录信息。"
          : "登录信息已失效，请联系此存储的管理员更新授权。",
        action: bucket.canEditConnection
          ? { label: "前往存储设置", onClick: () => window.location.assign("/settings/storage") }
          : undefined,
        duration: 10000,
      })
    }
  }, [isAuthenticated, snapshot.buckets])

  const updateSnapshot = React.useCallback((recipe: (current: AppSnapshot) => AppSnapshot) => {
    const next = recipe(snapshotRef.current)
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

  React.useEffect(() => {
    if (!isAuthenticated || !remoteMountsPresent) return
    let active = true
    let pending = false
    const refreshStorageAuth = async () => {
      const token = snapshotRef.current.auth.session?.tokens.accessToken
      if (!token || pending || document.visibilityState === "hidden") return
      pending = true
      try {
        const mounts = await listUserMounts(token)
        if (!active) return
        const byId = new Map(mounts.map((mount) => [mount.id, mount]))
        updateSnapshot((current) => ({
          ...current,
          buckets: current.buckets.map((bucket) => {
            const mount = bucket.backendId === undefined ? undefined : byId.get(bucket.backendId)
            if (!mount || !["drive_139", "drive_189", "drive_wo"].includes(bucket.driverId ?? "")) return bucket
            return { ...bucket, extra: { ...bucket.extra, requires_reauthorization: mount.extra?.requires_reauthorization === true } }
          }),
        }))
      } catch {
        // A connection failure is not evidence that provider authorization expired.
      } finally {
        pending = false
      }
    }
    void refreshStorageAuth()
    const timer = window.setInterval(() => void refreshStorageAuth(), 60000)
    window.addEventListener("focus", refreshStorageAuth)
    window.addEventListener("cloudrave:storage-reauthorization", refreshStorageAuth)
    return () => {
      active = false
      window.clearInterval(timer)
      window.removeEventListener("focus", refreshStorageAuth)
      window.removeEventListener("cloudrave:storage-reauthorization", refreshStorageAuth)
    }
  }, [isAuthenticated, remoteMountsPresent, updateSnapshot])

  const updatePageState = React.useCallback((key: string, recipe: (current: PageLoadState) => PageLoadState) => {
    const current = pageStatesRef.current
    const nextState = recipe(current[key] ?? EMPTY_PAGE_STATE)
    const next = { ...current, [key]: nextState }
    pageStatesRef.current = next
    setPageStates(next)
  }, [])

  const {
    hydrateWorkspace,
    clearWorkspace,
    reloadWorkspace,
  } = useBoot({
    snapshotRef,
    pageStatesRef,
    pageRequestsRef,
    updateSnapshot,
    setAuthReady,
    setPageStates,
    setCategoryNodesByKey,
    setTreeFolderNodes,
    setRecycleNodes,
  })

  const buckets = React.useMemo(() => snapshot.buckets, [snapshot.buckets])

  const activeBucket = React.useMemo(() => {
    return buckets.find((bucket) => bucket.id === snapshot.activeBucketId) ?? buckets[0] ?? EMPTY_BUCKET
  }, [buckets, snapshot.activeBucketId])

  const defaultBucketId = activeBucket.id

  const {
    loadDirectory,
    refreshCachedDirectory,
    loadDirectoryFolders,
    resolveFolderPath,
    getDirectoryPageState,
    getFolderTreePageState,
    loadCategory,
    getCategoryPageState,
    refreshLoadedCategories,
    loadRecycle,
    loadShares,
    getNodeById,
    getFolderPathId,
    getNodesInFolder,
    getFoldersForBucket,
    getTreeNodes,
    getCategoryNodes,
    getSharedWithMeNodes,
    getRecycleNodes,
    getShareRecords,
  } = useNav({
    defaultBucketId,
    snapshot,
    snapshotRef,
    pageStates,
    pageStatesRef,
    pageRequestsRef,
    categoryNodesByKey,
    treeFolderNodes,
    recycleNodes,
    updateSnapshot,
    updatePageState,
    setPageStates,
    setCategoryNodesByKey,
    setTreeFolderNodes,
    setRecycleNodes,
    setRecycleLoading,
    setSharesLoading,
  })

  const {
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
  } = useAuth({
    hydrateWorkspace,
    clearWorkspace,
    updateSnapshot,
  })

  const {
    createFolder,
    createFile,
    renameNode,
    moveNodes,
    duplicateNodes,
    deleteNodes,
    restoreNodes,
    permanentlyDeleteNodes,
    shareNodes,
    deleteShares,
    recordShareView,
    recordShareDownload,
    copyNodes,
    cutNodes,
    pasteNodes,
  } = useActions({
    defaultBucketId,
    snapshotRef,
    pageStatesRef,
    updateSnapshot,
    setPageStates,
    setCategoryNodesByKey,
    setTreeFolderNodes,
    setRecycleNodes,
    refreshCachedDirectory,
    refreshLoadedCategories,
    loadRecycle,
    getNodeById,
  })

  const getFileContent = React.useCallback((fileId: string) => snapshot.fileContents[fileId] ?? "", [snapshot.fileContents])

  const updateFileContent = React.useCallback(async (fileId: string, content: string) => {
    const nodeId = Number(fileId)
    if (!Number.isSafeInteger(nodeId) || nodeId <= 0) {
      toast.error("无法保存文件：文件编号无效")
      return
    }
    try {
      const manifest = await getPreviewManifest(nodeId)
      await saveTextPreview(nodeId, content, manifest.version)
      updateSnapshot((current) => ({
        ...current,
        fileContents: { ...current.fileContents, [fileId]: content },
      }))
      toast.success("文件已保存")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "保存失败，请刷新后重试")
    }
  }, [updateSnapshot])

  const value = React.useMemo<AppStateValue>(() => ({
    auth: snapshot.auth,
    authSession,
    authReady,
    currentUser,
    isAuthenticated,
    profile: snapshot.profile,
    settings: snapshot.settings,
    security: snapshot.security,
    loginActivity: snapshot.loginActivity,
    buckets,
    activeBucket,
    nodes: snapshot.nodes,
    shares: snapshot.shares,
    clipboard: snapshot.clipboard,
    effectiveTheme,
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
    reloadWorkspace,
    getNodeById,
    getFolderPathId,
    getNodesInFolder,
    getTreeNodes,
    getFoldersForBucket,
    getCategoryNodes,
    loadDirectory,
    loadDirectoryFolders,
    resolveFolderPath,
    getDirectoryPageState,
    getFolderTreePageState,
    loadCategory,
    getCategoryPageState,
    loadRecycle,
    recycleLoading,
    loadShares,
    sharesLoading,
    getSharedWithMeNodes,
    getRecycleNodes,
    getShareRecords,
    createFolder,
    createFile,
    renameNode,
    moveNodes,
    duplicateNodes,
    deleteNodes,
    restoreNodes,
    permanentlyDeleteNodes,
    shareNodes,
    deleteShares,
    recordShareView,
    recordShareDownload,
    copyNodes,
    cutNodes,
    pasteNodes,
    formatBytes,
    getFileContent,
    updateFileContent,
  }), [
    activeBucket,
    authReady,
    authSession,
    buckets,
    copyNodes,
    createFolder,
    createFile,
    currentUser,
    cutNodes,
    deleteNodes,
    deleteShares,
    duplicateNodes,
    effectiveTheme,
    recordShareDownload,
    recordShareView,
    getCategoryNodes,
    getCategoryPageState,
    getDirectoryPageState,
    getFileContent,
    getFolderPathId,
    getFoldersForBucket,
    getNodeById,
    getNodesInFolder,
    getRecycleNodes,
    getShareRecords,
    getSharedWithMeNodes,
    getFolderTreePageState,
    getTreeNodes,
    isAuthenticated,
    login,
    loginWithPasskey,
    loadCategory,
    loadDirectory,
    loadDirectoryFolders,
    loadRecycle,
    loadShares,
    verifyTwoFactor,
    logout,
    moveNodes,
    pasteNodes,
    permanentlyDeleteNodes,
    register,
    recycleLoading,
    reloadWorkspace,
    renameNode,
    resetPasswordVerification,
    resolveFolderPath,
    restoreNodes,
    setActiveBucket,
    setThemeMode,
    shareNodes,
    snapshot.auth,
    snapshot.clipboard,
    snapshot.loginActivity,
    snapshot.nodes,
    snapshot.profile,
    snapshot.security,
    snapshot.settings,
    snapshot.shares,
    sharesLoading,
    updateFileContent,
    updateProfile,
    updateSecurity,
    updateSettings,
    verifyPassword,
  ])

  const handleUploadComplete = React.useCallback(
    (parentId: string | null, bucketId: string) => {
      void refreshCachedDirectory(parentId, bucketId)
      void refreshLoadedCategories(bucketId)
    },
    [refreshCachedDirectory, refreshLoadedCategories]
  )

  const authValue = React.useMemo<AuthStateValue>(() => ({
    auth: value.auth,
    authSession: value.authSession,
    authReady: value.authReady,
    currentUser: value.currentUser,
    isAuthenticated: value.isAuthenticated,
    login: value.login,
    loginWithPasskey: value.loginWithPasskey,
    verifyTwoFactor: value.verifyTwoFactor,
    register: value.register,
    logout: value.logout,
  }), [
    value.auth,
    value.authReady,
    value.authSession,
    value.currentUser,
    value.isAuthenticated,
    value.login,
    value.loginWithPasskey,
    value.logout,
    value.register,
    value.verifyTwoFactor,
  ])

  const settingsValue = React.useMemo<SettingsStateValue>(() => ({
    authSession: value.authSession,
    currentUser: value.currentUser,
    profile: value.profile,
    settings: value.settings,
    security: value.security,
    loginActivity: value.loginActivity,
    effectiveTheme: value.effectiveTheme,
    setThemeMode: value.setThemeMode,
    updateSettings: value.updateSettings,
    updateProfile: value.updateProfile,
    verifyPassword: value.verifyPassword,
    resetPasswordVerification: value.resetPasswordVerification,
    updateSecurity: value.updateSecurity,
    logout: value.logout,
  }), [
    value.authSession,
    value.currentUser,
    value.effectiveTheme,
    value.loginActivity,
    value.logout,
    value.profile,
    value.resetPasswordVerification,
    value.security,
    value.setThemeMode,
    value.settings,
    value.updateProfile,
    value.updateSecurity,
    value.updateSettings,
    value.verifyPassword,
  ])

  return (
    <AuthStateContext.Provider value={authValue}>
      <SettingsStateContext.Provider value={settingsValue}>
        <AppStateContext.Provider value={value}>
          <UploadProvider
            getSession={() => snapshotRef.current.auth.session}
            getBuckets={() => snapshotRef.current.buckets}
            getActiveBucketId={() => snapshotRef.current.activeBucketId}
            getNodes={() => snapshotRef.current.nodes}
            deleteNodes={deleteNodes}
            onUploadComplete={handleUploadComplete}
          >
            {children}
          </UploadProvider>
        </AppStateContext.Provider>
      </SettingsStateContext.Provider>
    </AuthStateContext.Provider>
  )
}

export function useAppState() {
  const context = React.useContext(AppStateContext)
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.")
  }

  return context
}

export function useAuthState() {
  const context = React.useContext(AuthStateContext)
  if (!context) throw new Error("useAuthState must be used within AppStateProvider.")
  return context
}

export function useSettingsState() {
  const context = React.useContext(SettingsStateContext)
  if (!context) throw new Error("useSettingsState must be used within AppStateProvider.")
  return context
}
