import * as React from "react"

import { checkBackendHealth } from "@/api/system"
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
import { useNav } from "@/state/nav"

import {
  AppStateContext,
  EMPTY_BUCKET,
  EMPTY_PAGE_STATE,
  STORAGE_KEY,
  loadSnapshot,
  type AppStateValue,
  type PageLoadState,
} from "@/state/core"

export function AppStateProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<AppSnapshot>(loadSnapshot)
  const [systemTheme, setSystemTheme] = React.useState<"light" | "dark">("light")
  const [authReady, setAuthReady] = React.useState(false)
  const [pageStates, setPageStates] = React.useState<Record<string, PageLoadState>>({})
  const [categoryNodesByKey, setCategoryNodesByKey] = React.useState<Record<string, FileNode[]>>({})
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
      })
    )
  }, [snapshot.activeBucketId, snapshot.auth, snapshot.security.passwordUpdatedAt, snapshot.security.twoFactorEnabled, snapshot.settings, snapshot.shares])

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

  const updateSnapshot = React.useCallback((recipe: (current: AppSnapshot) => AppSnapshot) => {
    const next = recipe(snapshotRef.current)
    snapshotRef.current = next
    setSnapshot(next)
  }, [])

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

  const updateFileContent = React.useCallback(() => {
    toast.info("在线编辑保存功能暂未接入后端")
  }, [])

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

  return (
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
  )
}

export function useAppState() {
  const context = React.useContext(AppStateContext)
  if (!context) {
    throw new Error("useAppState must be used within AppStateProvider.")
  }

  return context
}
