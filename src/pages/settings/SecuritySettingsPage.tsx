import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  Check,
  Github,
  LockKeyhole,
  Pencil,
  Plus,
  Power,
  Save,
  ScanFace,
  ShieldCheck,
  ShieldOff,
  Unlink,
  X,
} from "lucide-react"
import { toast } from "sonner"

import {
  beginPasskeyRegistration,
  deletePasskey,
  finishPasskeyRegistration,
  getLoginActivity,
  listPasskeys,
  renamePasskey,
  type UserLoginActivityEntry,
} from "@/api/user"
import {
  getGitHubOAuthConnection,
  getGitHubOAuthSettings,
  getGoogleOAuthConnection,
  getGoogleOAuthSettings,
  getQQOAuthConnection,
  getQQOAuthSettings,
  unlinkGitHubOAuthConnection,
  unlinkGoogleOAuthConnection,
  unlinkQQOAuthConnection,
  updateGitHubOAuthSettings,
  updateGoogleOAuthSettings,
  updateQQOAuthSettings,
} from "@/api/oauth"
import { GoogleIcon } from "@/components/icons/google-icon"
import { QQIcon } from "@/components/icons/qq-icon"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  openGitHubOAuthPopup,
  readGitHubOAuthPopupResult,
  subscribeGitHubOAuthResults,
  type GitHubOAuthMessage,
} from "@/lib/github-oauth-popup"
import {
  openGoogleOAuthPopup,
  readGoogleOAuthPopupResult,
  subscribeGoogleOAuthResults,
  type GoogleOAuthMessage,
} from "@/lib/google-oauth-popup"
import {
  openQQOAuthPopup,
  readQQOAuthPopupResult,
  subscribeQQOAuthResults,
  type QQOAuthMessage,
} from "@/lib/qq-oauth-popup"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { useAppState } from "@/state/app"
import { StatusBadge } from "./shared"
import { ActivityStatusBadge } from "./security/badge"
import { ChangePasswordDialog } from "./security/pass"
import { TwoFactorDialog } from "./security/two"
import { isPasskeyCanceled, normalizeToastDescription } from "./security/util"

const GITHUB_LINK_ERROR_DESCRIPTIONS: Record<string, string> = {
  access_denied: "GitHub 授权已取消。",
  account_not_found: "Cloudrave 账号不存在或已被禁用。",
  guest_not_supported: "访客账号不能关联 GitHub。",
  identity_conflict: "该 GitHub 账号或当前 Cloudrave 账号已存在其他关联。",
  invalid_state: "关联请求已失效，请重新发起。",
  not_configured: "管理员尚未完成 GitHub OAuth 配置。",
  provider_error: "GitHub 暂时无法完成授权，请稍后再试。",
}

const GOOGLE_LINK_ERROR_DESCRIPTIONS: Record<string, string> = {
  access_denied: "Google 授权已取消。",
  account_not_found: "Cloudrave 账号不存在或已被禁用。",
  guest_not_supported: "访客账号不能关联 Google。",
  identity_conflict: "该 Google 账号或当前 Cloudrave 账号已存在其他关联。",
  invalid_state: "关联请求已失效，请重新发起。",
  not_configured: "管理员尚未完成 Google OAuth 配置。",
  provider_error: "Google 暂时无法完成授权，请稍后再试。",
}

const QQ_LINK_ERROR_DESCRIPTIONS: Record<string, string> = {
  access_denied: "QQ 授权已取消。",
  account_not_found: "Cloudrave 账号不存在或已被禁用。",
  guest_not_supported: "访客账号不能关联 QQ。",
  identity_conflict: "该 QQ 账号或当前 Cloudrave 账号已存在其他关联。",
  invalid_state: "关联请求已失效，请重新发起。",
  not_configured: "管理员尚未完成 QQ OAuth 配置。",
  provider_error: "QQ 暂时无法完成授权，请稍后再试。",
}

export function SecuritySettingsPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { authSession, currentUser, logout, security, settings, updateSecurity } = useAppState()
  const isGuest = currentUser?.role === "guest"
  const isAdmin = currentUser?.role === "admin"
  const token = authSession?.tokens.accessToken ?? null

  const [isLoadingActivity, setIsLoadingActivity] = React.useState(false)
  const [isLoadingPasskeys, setIsLoadingPasskeys] = React.useState(false)
  const [isRegisteringPasskey, setIsRegisteringPasskey] = React.useState(false)
  const [deletingPasskeyId, setDeletingPasskeyId] = React.useState<string | null>(null)
  const [editingPasskeyId, setEditingPasskeyId] = React.useState<string | null>(null)
  const [editingPasskeyName, setEditingPasskeyName] = React.useState("")
  const [savingPasskeyId, setSavingPasskeyId] = React.useState<string | null>(null)
  const [loginActivity, setLoginActivity] = React.useState<UserLoginActivityEntry[]>([])
  const [twoFactorDialogOpen, setTwoFactorDialogOpen] = React.useState(false)
  const [twoFactorDialogMode, setTwoFactorDialogMode] = React.useState<"setup" | "disable">("setup")
  const [passwordDialogOpen, setPasswordDialogOpen] = React.useState(false)
  const [githubOAuthEnabled, setGitHubOAuthEnabled] = React.useState(false)
  const [githubClientId, setGitHubClientId] = React.useState("")
  const [githubClientSecret, setGitHubClientSecret] = React.useState("")
  const [githubSecretConfigured, setGitHubSecretConfigured] = React.useState(false)
  const [githubCallbackUrl, setGitHubCallbackUrl] = React.useState("")
  const [githubConfigExpanded, setGitHubConfigExpanded] = React.useState(false)
  const [githubLinked, setGitHubLinked] = React.useState(false)
  const [githubUsername, setGitHubUsername] = React.useState<string | null>(null)
  const [githubAvatarUrl, setGitHubAvatarUrl] = React.useState<string | null>(null)
  const [githubLinkUrl, setGitHubLinkUrl] = React.useState("/api/v1/oauth/github/link")
  const [isLoadingGitHubOAuth, setIsLoadingGitHubOAuth] = React.useState(false)
  const [isLoadingGitHubConnection, setIsLoadingGitHubConnection] = React.useState(false)
  const [isUnlinkingGitHub, setIsUnlinkingGitHub] = React.useState(false)
  const [githubOAuthSavingAction, setGitHubOAuthSavingAction] = React.useState<"enable" | "disable" | null>(null)
  const [isLinkingGitHub, setIsLinkingGitHub] = React.useState(false)
  const [googleOAuthEnabled, setGoogleOAuthEnabled] = React.useState(false)
  const [googleClientId, setGoogleClientId] = React.useState("")
  const [googleClientSecret, setGoogleClientSecret] = React.useState("")
  const [googleSecretConfigured, setGoogleSecretConfigured] = React.useState(false)
  const [googleCallbackUrl, setGoogleCallbackUrl] = React.useState("")
  const [googleConfigExpanded, setGoogleConfigExpanded] = React.useState(false)
  const [googleLinked, setGoogleLinked] = React.useState(false)
  const [googleUsername, setGoogleUsername] = React.useState<string | null>(null)
  const [googleAvatarUrl, setGoogleAvatarUrl] = React.useState<string | null>(null)
  const [googleLinkUrl, setGoogleLinkUrl] = React.useState("/api/v1/oauth/google/link")
  const [isLoadingGoogleOAuth, setIsLoadingGoogleOAuth] = React.useState(false)
  const [isLoadingGoogleConnection, setIsLoadingGoogleConnection] = React.useState(false)
  const [isUnlinkingGoogle, setIsUnlinkingGoogle] = React.useState(false)
  const [googleOAuthSavingAction, setGoogleOAuthSavingAction] = React.useState<"enable" | "disable" | null>(null)
  const [isLinkingGoogle, setIsLinkingGoogle] = React.useState(false)
  const [qqOAuthEnabled, setQQOAuthEnabled] = React.useState(false)
  const [qqAppId, setQQAppId] = React.useState("")
  const [qqAppKey, setQQAppKey] = React.useState("")
  const [qqAppKeyConfigured, setQQAppKeyConfigured] = React.useState(false)
  const [qqCallbackUrl, setQQCallbackUrl] = React.useState("")
  const [qqConfigExpanded, setQQConfigExpanded] = React.useState(false)
  const [qqLinked, setQQLinked] = React.useState(false)
  const [qqUsername, setQQUsername] = React.useState<string | null>(null)
  const [qqAvatarUrl, setQQAvatarUrl] = React.useState<string | null>(null)
  const [qqLinkUrl, setQQLinkUrl] = React.useState("/api/v1/oauth/qq/link")
  const [isLoadingQQOAuth, setIsLoadingQQOAuth] = React.useState(false)
  const [isLoadingQQConnection, setIsLoadingQQConnection] = React.useState(false)
  const [isUnlinkingQQ, setIsUnlinkingQQ] = React.useState(false)
  const [qqOAuthSavingAction, setQQOAuthSavingAction] = React.useState<"enable" | "disable" | null>(null)
  const [isLinkingQQ, setIsLinkingQQ] = React.useState(false)
  const editingContainerRef = React.useRef<HTMLDivElement | null>(null)
  const handledOAuthLinkResult = React.useRef<string | null>(null)
  const handledGoogleOAuthLinkResult = React.useRef<string | null>(null)
  const handledQQOAuthLinkResult = React.useRef<string | null>(null)
  const githubOAuthPopupRef = React.useRef<Window | null>(null)
  const googleOAuthPopupRef = React.useRef<Window | null>(null)
  const qqOAuthPopupRef = React.useRef<Window | null>(null)
  const isSavingGitHubOAuth = githubOAuthSavingAction !== null
  const isSavingGoogleOAuth = googleOAuthSavingAction !== null
  const isSavingQQOAuth = qqOAuthSavingAction !== null

  React.useEffect(() => {
    if (!isAdmin || !token) {
      return
    }

    const controller = new AbortController()
    setIsLoadingGitHubOAuth(true)
    getGitHubOAuthSettings(token, controller.signal)
      .then((response) => {
        setGitHubOAuthEnabled(response.enabled)
        setGitHubClientId(response.client_id)
        setGitHubSecretConfigured(response.client_secret_configured)
        setGitHubCallbackUrl(response.callback_url)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        toast.error("加载 GitHub OAuth 配置失败", {
          description: error instanceof Error ? error.message : "请稍后再试。",
        })
      })
      .finally(() => setIsLoadingGitHubOAuth(false))

    return () => controller.abort()
  }, [isAdmin, token])

  React.useEffect(() => {
    if (!isAdmin || !token) {
      return
    }

    const controller = new AbortController()
    setIsLoadingGoogleOAuth(true)
    getGoogleOAuthSettings(token, controller.signal)
      .then((response) => {
        setGoogleOAuthEnabled(response.enabled)
        setGoogleClientId(response.client_id)
        setGoogleSecretConfigured(response.client_secret_configured)
        setGoogleCallbackUrl(response.callback_url)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") {
          return
        }
        toast.error("加载 Google OAuth 配置失败", {
          description: error instanceof Error ? error.message : "请稍后再试。",
        })
      })
      .finally(() => setIsLoadingGoogleOAuth(false))

    return () => controller.abort()
  }, [isAdmin, token])

  React.useEffect(() => {
    if (!isAdmin || !token) return
    const controller = new AbortController()
    setIsLoadingQQOAuth(true)
    getQQOAuthSettings(token, controller.signal)
      .then((response) => {
        setQQOAuthEnabled(response.enabled)
        setQQAppId(response.app_id)
        setQQAppKeyConfigured(response.app_key_configured)
        setQQCallbackUrl(response.callback_url)
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return
        toast.error("加载 QQ OAuth 配置失败", {
          description: error instanceof Error ? error.message : "请稍后再试。",
        })
      })
      .finally(() => setIsLoadingQQOAuth(false))
    return () => controller.abort()
  }, [isAdmin, token])

  const loadGitHubConnection = React.useCallback(async (signal?: AbortSignal) => {
    if (isGuest || !token) {
      return
    }

    setIsLoadingGitHubConnection(true)
    try {
      const response = await getGitHubOAuthConnection(token, signal)
      setGitHubOAuthEnabled(response.enabled)
      setGitHubLinked(response.linked)
      setGitHubUsername(response.provider_username)
      setGitHubAvatarUrl(response.provider_avatar_url)
      setGitHubLinkUrl(response.link_url)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      toast.error("加载 GitHub 关联状态失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      if (!signal?.aborted) {
        setIsLoadingGitHubConnection(false)
      }
    }
  }, [isGuest, token])

  React.useEffect(() => {
    const controller = new AbortController()
    void loadGitHubConnection(controller.signal)
    return () => controller.abort()
  }, [loadGitHubConnection])

  const loadGoogleConnection = React.useCallback(async (signal?: AbortSignal) => {
    if (isGuest || !token) {
      return
    }

    setIsLoadingGoogleConnection(true)
    try {
      const response = await getGoogleOAuthConnection(token, signal)
      setGoogleOAuthEnabled(response.enabled)
      setGoogleLinked(response.linked)
      setGoogleUsername(response.provider_username)
      setGoogleAvatarUrl(response.provider_avatar_url)
      setGoogleLinkUrl(response.link_url)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return
      }
      toast.error("加载 Google 关联状态失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      if (!signal?.aborted) {
        setIsLoadingGoogleConnection(false)
      }
    }
  }, [isGuest, token])

  React.useEffect(() => {
    const controller = new AbortController()
    void loadGoogleConnection(controller.signal)
    return () => controller.abort()
  }, [loadGoogleConnection])

  const loadQQConnection = React.useCallback(async (signal?: AbortSignal) => {
    if (isGuest || !token) return
    setIsLoadingQQConnection(true)
    try {
      const response = await getQQOAuthConnection(token, signal)
      setQQOAuthEnabled(response.enabled)
      setQQLinked(response.linked)
      setQQUsername(response.provider_username)
      setQQAvatarUrl(response.provider_avatar_url)
      setQQLinkUrl(response.link_url)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return
      toast.error("加载 QQ 关联状态失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      if (!signal?.aborted) setIsLoadingQQConnection(false)
    }
  }, [isGuest, token])

  React.useEffect(() => {
    const controller = new AbortController()
    void loadQQConnection(controller.signal)
    return () => controller.abort()
  }, [loadQQConnection])

  React.useEffect(() => {
    const result = new URLSearchParams(location.search).get("oauth_link")
    if (!result || handledOAuthLinkResult.current === result) {
      return
    }
    handledOAuthLinkResult.current = result

    if (result === "success") {
      toast.success("GitHub 账号已关联")
    } else {
      toast.error("关联 GitHub 失败", {
        description: GITHUB_LINK_ERROR_DESCRIPTIONS[result] ?? "当前无法完成 GitHub 关联。",
      })
    }
    navigate(location.pathname, { replace: true })
  }, [location.pathname, location.search, navigate])

  React.useEffect(() => {
    const result = new URLSearchParams(location.search).get("google_oauth_link")
    if (!result || handledGoogleOAuthLinkResult.current === result) {
      return
    }
    handledGoogleOAuthLinkResult.current = result

    if (result === "success") {
      toast.success("Google 账号已关联")
    } else {
      toast.error("关联 Google 失败", {
        description: GOOGLE_LINK_ERROR_DESCRIPTIONS[result] ?? "当前无法完成 Google 关联。",
      })
    }
    navigate(location.pathname, { replace: true })
  }, [location.pathname, location.search, navigate])

  React.useEffect(() => {
    const result = new URLSearchParams(location.search).get("qq_oauth_link")
    if (!result || handledQQOAuthLinkResult.current === result) return
    handledQQOAuthLinkResult.current = result
    if (result === "success") {
      toast.success("QQ 账号已关联")
    } else {
      toast.error("关联 QQ 失败", {
        description: QQ_LINK_ERROR_DESCRIPTIONS[result] ?? "当前无法完成 QQ 关联。",
      })
    }
    navigate(location.pathname, { replace: true })
  }, [location.pathname, location.search, navigate])

  const loadLoginActivity = React.useCallback(async () => {
    if (isGuest) {
      setLoginActivity([])
      return
    }
    if (!token) {
      setLoginActivity([])
      return
    }

    setIsLoadingActivity(true)
    try {
      const activity = await getLoginActivity(token, settings.timezone)
      setLoginActivity(activity)
    } catch (error) {
      console.error("加载登录活动失败:", error)
      toast.error("加载登录活动失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
      setLoginActivity([])
    } finally {
      setIsLoadingActivity(false)
    }
  }, [isGuest, settings.timezone, token])

  React.useEffect(() => {
    void loadLoginActivity()
  }, [loadLoginActivity])

  const loadPasskeyList = React.useCallback(async () => {
    if (isGuest) {
      updateSecurity({ passkeysEnabled: false, passkeys: [] })
      return
    }
    if (!token) {
      updateSecurity({
        passkeysEnabled: false,
        passkeys: [],
      })
      return
    }

    setIsLoadingPasskeys(true)
    try {
      const response = await listPasskeys(token, settings.timezone)
      updateSecurity({
        passkeysEnabled: response.passkeysEnabled,
        passkeys: response.passkeys,
      })
    } catch (error) {
      console.error("加载通行密钥失败:", error)
      toast.error("通行密钥", {
        description: normalizeToastDescription(
          "通行密钥",
          error instanceof Error ? error.message : undefined,
          "加载失败，请稍后再试。"
        ),
      })
      updateSecurity({
        passkeysEnabled: false,
        passkeys: [],
      })
    } finally {
      setIsLoadingPasskeys(false)
    }
  }, [isGuest, settings.timezone, token, updateSecurity])

  React.useEffect(() => {
    void loadPasskeyList()
  }, [loadPasskeyList])

  const cancelEditingPasskey = React.useCallback(() => {
    setEditingPasskeyId(null)
    setEditingPasskeyName("")
  }, [])

  React.useEffect(() => {
    if (!editingPasskeyId) {
      return
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target
      if (editingContainerRef.current && target instanceof Node && !editingContainerRef.current.contains(target)) {
        cancelEditingPasskey()
      }
    }

    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [cancelEditingPasskey, editingPasskeyId])

  const activityRows = loginActivity

  const handlePasswordChanged = async () => {
    toast.success("密码已更新")
    await logout("all")
    navigate("/login", { replace: true })
  }

  const addPasskey = async () => {
    if (!token) {
      return
    }

    setIsRegisteringPasskey(true)
    try {
      const { startRegistration } = await import("@simplewebauthn/browser")
      const begin = await beginPasskeyRegistration(token)
      const credential = await startRegistration({
        optionsJSON: begin.options as unknown as Parameters<typeof startRegistration>[0]["optionsJSON"],
      })
      const result = await finishPasskeyRegistration(token, {
        ceremonyId: begin.ceremony_id,
        credential: credential as unknown as Record<string, unknown>,
      })
      await loadPasskeyList()
      toast.success("通行密钥", {
        description: `已添加：${result.passkey.name}`,
      })
    } catch (error) {
      console.error("添加通行密钥失败:", error)
      if (isPasskeyCanceled(error)) {
        toast("通行密钥", {
          description: "用户已取消创建",
        })
      } else {
        toast.error("通行密钥", {
          description: normalizeToastDescription(
            "通行密钥",
            error instanceof Error ? error.message : undefined,
            "创建失败，请稍后再试。"
          ),
        })
      }
    } finally {
      setIsRegisteringPasskey(false)
    }
  }

  const handleDeletePasskey = async (passkeyId: string, passkeyName: string) => {
    if (!token) {
      return
    }

    setDeletingPasskeyId(passkeyId)
    try {
      await deletePasskey(token, passkeyId)
      await loadPasskeyList()
      if (editingPasskeyId === passkeyId) {
        cancelEditingPasskey()
      }
      toast.success("通行密钥", {
        description: `${passkeyName} 已删除`,
      })
    } catch (error) {
      console.error("删除通行密钥失败:", error)
      toast.error("通行密钥", {
        description: normalizeToastDescription(
          "通行密钥",
          error instanceof Error ? error.message : undefined,
          "删除失败，请稍后再试。"
        ),
      })
    } finally {
      setDeletingPasskeyId(null)
    }
  }

  const startEditingPasskey = (passkeyId: string, name: string) => {
    setEditingPasskeyId(passkeyId)
    setEditingPasskeyName(name)
  }

  const handleSavePasskeyName = async (passkeyId: string) => {
    if (!token) {
      return
    }

    const nextName = editingPasskeyName.trim()
    if (!nextName) {
      toast.error("通行密钥", {
        description: "名称不能为空",
      })
      return
    }

    setSavingPasskeyId(passkeyId)
    try {
      const updated = await renamePasskey(token, passkeyId, nextName, settings.timezone)
      updateSecurity({
        passkeys: security.passkeys.map((item) => (item.id === passkeyId ? updated : item)),
      })
      cancelEditingPasskey()
      toast.success("通行密钥", {
        description: `已修改为 ${updated.name}`,
      })
    } catch (error) {
      console.error("修改通行密钥名称失败:", error)
      toast.error("通行密钥", {
        description: normalizeToastDescription(
          "通行密钥",
          error instanceof Error ? error.message : undefined,
          "修改失败，请稍后再试。"
        ),
      })
    } finally {
      setSavingPasskeyId(null)
    }
  }

  const saveGitHubOAuth = async (enabled = true) => {
    if (!token || !isAdmin) {
      return
    }

    setGitHubOAuthSavingAction(enabled ? "enable" : "disable")
    try {
      const response = await updateGitHubOAuthSettings(token, {
        enabled,
        clientId: githubClientId.trim(),
        clientSecret: githubClientSecret,
      })
      setGitHubOAuthEnabled(response.enabled)
      setGitHubClientId(response.client_id)
      setGitHubClientSecret("")
      setGitHubSecretConfigured(response.client_secret_configured)
      setGitHubCallbackUrl(response.callback_url)
      if (!response.enabled) {
        setGitHubConfigExpanded(false)
      }
      toast.success(response.enabled ? "GitHub OAuth 已开启" : "GitHub OAuth 已关闭")
    } catch (error) {
      toast.error("保存 GitHub OAuth 配置失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setGitHubOAuthSavingAction(null)
    }
  }

  const linkGitHub = () => {
    if (isLinkingGitHub) {
      return
    }

    const popup = openGitHubOAuthPopup(githubLinkUrl, "link")
    if (!popup) {
      toast.error("无法打开 GitHub 授权窗口", {
        description: "请允许此站点打开弹出式窗口后重试。",
      })
      return
    }

    githubOAuthPopupRef.current = popup
    setIsLinkingGitHub(true)
  }

  const handleGitHubLinkResult = React.useCallback((message: GitHubOAuthMessage) => {
    if (!githubOAuthPopupRef.current) {
      return
    }

    githubOAuthPopupRef.current.close()
    githubOAuthPopupRef.current = null
    setIsLinkingGitHub(false)

    if (message.result === "success") {
      void loadGitHubConnection().then(() => toast.success("GitHub 账号已关联"))
      return
    }

    toast.error("关联 GitHub 失败", {
      description:
        GITHUB_LINK_ERROR_DESCRIPTIONS[message.result] ?? "当前无法完成 GitHub 关联。",
    })
  }, [loadGitHubConnection])

  React.useEffect(() => {
    return subscribeGitHubOAuthResults(
      "link",
      () => githubOAuthPopupRef.current,
      handleGitHubLinkResult
    )
  }, [handleGitHubLinkResult])

  React.useEffect(() => {
    if (!isLinkingGitHub) {
      return
    }

    const closeWatcher = window.setInterval(() => {
      const popup = githubOAuthPopupRef.current
      if (!popup || popup.closed) {
        githubOAuthPopupRef.current = null
        setIsLinkingGitHub(false)
        return
      }

      const result = readGitHubOAuthPopupResult(popup, "link")
      if (result) {
        handleGitHubLinkResult(result)
      }
    }, 250)

    return () => window.clearInterval(closeWatcher)
  }, [handleGitHubLinkResult, isLinkingGitHub])

  React.useEffect(() => {
    return () => githubOAuthPopupRef.current?.close()
  }, [])

  const unlinkGitHub = async () => {
    if (!token || !githubLinked) {
      return
    }

    setIsUnlinkingGitHub(true)
    try {
      const response = await unlinkGitHubOAuthConnection(token)
      setGitHubOAuthEnabled(response.enabled)
      setGitHubLinked(response.linked)
      setGitHubUsername(response.provider_username)
      setGitHubAvatarUrl(response.provider_avatar_url)
      setGitHubLinkUrl(response.link_url)
      toast.success("GitHub 账号已解绑")
    } catch (error) {
      toast.error("解绑 GitHub 账号失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setIsUnlinkingGitHub(false)
    }
  }

  const saveGoogleOAuth = async (enabled = true) => {
    if (!token || !isAdmin) {
      return
    }

    setGoogleOAuthSavingAction(enabled ? "enable" : "disable")
    try {
      const response = await updateGoogleOAuthSettings(token, {
        enabled,
        clientId: googleClientId.trim(),
        clientSecret: googleClientSecret,
      })
      setGoogleOAuthEnabled(response.enabled)
      setGoogleClientId(response.client_id)
      setGoogleClientSecret("")
      setGoogleSecretConfigured(response.client_secret_configured)
      setGoogleCallbackUrl(response.callback_url)
      if (!response.enabled) {
        setGoogleConfigExpanded(false)
      }
      toast.success(response.enabled ? "Google OAuth 已开启" : "Google OAuth 已关闭")
    } catch (error) {
      toast.error("保存 Google OAuth 配置失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setGoogleOAuthSavingAction(null)
    }
  }

  const linkGoogle = () => {
    if (isLinkingGoogle) {
      return
    }

    const popup = openGoogleOAuthPopup(googleLinkUrl, "link")
    if (!popup) {
      toast.error("无法打开 Google 授权窗口", {
        description: "请允许此站点打开弹出式窗口后重试。",
      })
      return
    }

    googleOAuthPopupRef.current = popup
    setIsLinkingGoogle(true)
  }

  const handleGoogleLinkResult = React.useCallback((message: GoogleOAuthMessage) => {
    if (!googleOAuthPopupRef.current) {
      return
    }

    googleOAuthPopupRef.current.close()
    googleOAuthPopupRef.current = null
    setIsLinkingGoogle(false)

    if (message.result === "success") {
      void loadGoogleConnection().then(() => toast.success("Google 账号已关联"))
      return
    }

    toast.error("关联 Google 失败", {
      description:
        GOOGLE_LINK_ERROR_DESCRIPTIONS[message.result] ?? "当前无法完成 Google 关联。",
    })
  }, [loadGoogleConnection])

  React.useEffect(() => {
    return subscribeGoogleOAuthResults(
      "link",
      () => googleOAuthPopupRef.current,
      handleGoogleLinkResult
    )
  }, [handleGoogleLinkResult])

  React.useEffect(() => {
    if (!isLinkingGoogle) {
      return
    }

    const closeWatcher = window.setInterval(() => {
      const popup = googleOAuthPopupRef.current
      if (!popup || popup.closed) {
        googleOAuthPopupRef.current = null
        setIsLinkingGoogle(false)
        return
      }

      const result = readGoogleOAuthPopupResult(popup, "link")
      if (result) {
        handleGoogleLinkResult(result)
      }
    }, 250)

    return () => window.clearInterval(closeWatcher)
  }, [handleGoogleLinkResult, isLinkingGoogle])

  React.useEffect(() => {
    return () => googleOAuthPopupRef.current?.close()
  }, [])

  const unlinkGoogle = async () => {
    if (!token || !googleLinked) {
      return
    }

    setIsUnlinkingGoogle(true)
    try {
      const response = await unlinkGoogleOAuthConnection(token)
      setGoogleOAuthEnabled(response.enabled)
      setGoogleLinked(response.linked)
      setGoogleUsername(response.provider_username)
      setGoogleAvatarUrl(response.provider_avatar_url)
      setGoogleLinkUrl(response.link_url)
      toast.success("Google 账号已解绑")
    } catch (error) {
      toast.error("解绑 Google 账号失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setIsUnlinkingGoogle(false)
    }
  }

  const saveQQOAuth = async (enabled = true) => {
    if (!token || !isAdmin) return
    setQQOAuthSavingAction(enabled ? "enable" : "disable")
    try {
      const response = await updateQQOAuthSettings(token, {
        enabled,
        appId: qqAppId.trim(),
        appKey: qqAppKey,
      })
      setQQOAuthEnabled(response.enabled)
      setQQAppId(response.app_id)
      setQQAppKey("")
      setQQAppKeyConfigured(response.app_key_configured)
      setQQCallbackUrl(response.callback_url)
      if (!response.enabled) setQQConfigExpanded(false)
      toast.success(response.enabled ? "QQ OAuth 已开启" : "QQ OAuth 已关闭")
    } catch (error) {
      toast.error("保存 QQ OAuth 配置失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setQQOAuthSavingAction(null)
    }
  }

  const linkQQ = () => {
    if (isLinkingQQ) return
    const popup = openQQOAuthPopup(qqLinkUrl, "link")
    if (!popup) {
      toast.error("无法打开 QQ 授权窗口", {
        description: "请允许此站点打开弹出式窗口后重试。",
      })
      return
    }
    qqOAuthPopupRef.current = popup
    setIsLinkingQQ(true)
  }

  const handleQQLinkResult = React.useCallback((message: QQOAuthMessage) => {
    if (!qqOAuthPopupRef.current) return
    qqOAuthPopupRef.current.close()
    qqOAuthPopupRef.current = null
    setIsLinkingQQ(false)
    if (message.result === "success") {
      void loadQQConnection().then(() => toast.success("QQ 账号已关联"))
      return
    }
    toast.error("关联 QQ 失败", {
      description: QQ_LINK_ERROR_DESCRIPTIONS[message.result] ?? "当前无法完成 QQ 关联。",
    })
  }, [loadQQConnection])

  React.useEffect(() => subscribeQQOAuthResults(
    "link",
    () => qqOAuthPopupRef.current,
    handleQQLinkResult
  ), [handleQQLinkResult])

  React.useEffect(() => {
    if (!isLinkingQQ) return
    const closeWatcher = window.setInterval(() => {
      const popup = qqOAuthPopupRef.current
      if (!popup || popup.closed) {
        qqOAuthPopupRef.current = null
        setIsLinkingQQ(false)
        return
      }
      const result = readQQOAuthPopupResult(popup, "link")
      if (result) handleQQLinkResult(result)
    }, 250)
    return () => window.clearInterval(closeWatcher)
  }, [handleQQLinkResult, isLinkingQQ])

  React.useEffect(() => () => qqOAuthPopupRef.current?.close(), [])

  const unlinkQQ = async () => {
    if (!token || !qqLinked) return
    setIsUnlinkingQQ(true)
    try {
      const response = await unlinkQQOAuthConnection(token)
      setQQOAuthEnabled(response.enabled)
      setQQLinked(response.linked)
      setQQUsername(response.provider_username)
      setQQAvatarUrl(response.provider_avatar_url)
      setQQLinkUrl(response.link_url)
      toast.success("QQ 账号已解绑")
    } catch (error) {
      toast.error("解绑 QQ 账号失败", {
        description: error instanceof Error ? error.message : "请稍后再试。",
      })
    } finally {
      setIsUnlinkingQQ(false)
    }
  }

  if (isGuest) {
    return (
      <div className="max-w-2xl">
        <section className="flex items-center justify-between gap-4 rounded-xl border border-border px-4 py-4">
          <div>
            <div className="text-sm font-medium">修改密码</div>
            <div className="mt-1 text-sm text-muted-foreground">访客只能维护自己的登录密码，账号资料和存储空间由管理员管理。</div>
          </div>
          <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
            <LockKeyhole data-icon="inline-start" />
            修改密码
          </Button>
        </section>
        <ChangePasswordDialog
          open={passwordDialogOpen}
          onOpenChange={setPasswordDialogOpen}
          token={token ?? ""}
          userEmail={authSession?.user.email ?? ""}
          hasPasskeys={false}
          onSuccess={handlePasswordChanged}
        />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="max-w-2xl space-y-8">
        <section className="space-y-3">
          <div className="text-sm font-medium">修改密码</div>
          <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
            <LockKeyhole data-icon="inline-start" />
            修改密码
          </Button>
          <ChangePasswordDialog
            open={passwordDialogOpen}
            onOpenChange={setPasswordDialogOpen}
            token={token ?? ""}
            userEmail={authSession?.user.email ?? ""}
            hasPasskeys={security.passkeys.length > 0}
            onSuccess={handlePasswordChanged}
          />
        </section>

        <section className="space-y-3">
          <div className="text-sm font-medium">通行密钥</div>
          <div className="space-y-3">
            {isLoadingPasskeys ? (
              <div className="rounded-xl border border-border/70 px-4 py-6 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-2">
                  <Spinner />
                  正在加载通行密钥...
                </span>
              </div>
            ) : null}
            {security.passkeys.map((item) => (
              <div
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/70 px-4 py-4 sm:items-center"
              >
                <div className="flex min-w-0 flex-1 items-start gap-4">
                  <div className="mt-0.5 flex size-12 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
                    <ScanFace size={22} />
                  </div>
                  <div className="min-w-0">
                    {editingPasskeyId === item.id ? (
                      <div ref={editingContainerRef} className="flex flex-wrap items-center gap-2">
                        <Input
                          autoFocus
                          value={editingPasskeyName}
                          className="h-9 w-full min-w-[220px] max-w-[320px]"
                          maxLength={128}
                          onChange={(event) => setEditingPasskeyName(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault()
                              void handleSavePasskeyName(item.id)
                            }
                            if (event.key === "Escape") {
                              event.preventDefault()
                              cancelEditingPasskey()
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={savingPasskeyId === item.id}
                          onClick={() => void handleSavePasskeyName(item.id)}
                        >
                          {savingPasskeyId === item.id ? (
                            <Spinner data-icon="inline-start" />
                          ) : (
                            <Check data-icon="inline-start" />
                          )}
                          {savingPasskeyId === item.id ? "修改中..." : "修改"}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={savingPasskeyId === item.id}
                          onClick={cancelEditingPasskey}
                        >
                          <X data-icon="inline-start" />
                          取消
                        </Button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        className="truncate text-left text-sm font-medium transition-colors hover:text-primary"
                        onClick={() => startEditingPasskey(item.id, item.name)}
                      >
                        <Pencil className="mr-1 inline size-3.5" aria-hidden="true" />
                        {item.name}
                      </button>
                    )}
                    <div className="mt-1 text-sm text-muted-foreground">
                      创建于 {item.createdAt}
                    </div>
                    <div className="text-sm text-green-600 dark:text-green-400">
                      上次使用于 {item.lastUsedAt}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-destructive"
                  onClick={() => void handleDeletePasskey(item.id, item.name)}
                  disabled={deletingPasskeyId === item.id || savingPasskeyId === item.id}
                  aria-label={`删除 ${item.name}`}
                >
                  <X size={18} />
                </button>
              </div>
            ))}
            {!isLoadingPasskeys && security.passkeys.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-sm text-muted-foreground">
                当前还没有已绑定的通行密钥。
              </div>
            ) : null}
          </div>
          <Button variant="outline" onClick={() => void addPasskey()} disabled={isRegisteringPasskey}>
            {isRegisteringPasskey ? (
              <Spinner data-icon="inline-start" />
            ) : (
              <Plus data-icon="inline-start" />
            )}
            {isRegisteringPasskey ? "添加中..." : "添加新通行密钥"}
          </Button>
        </section>

        {isAdmin ? (
          <section className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">GitHub OAuth 登录</div>
              <StatusBadge active={githubOAuthEnabled}>
                {githubOAuthEnabled ? "已开启" : "已关闭"}
              </StatusBadge>
            </div>
            <Button
              variant="outline"
              onClick={() => setGitHubConfigExpanded((expanded) => !expanded)}
              disabled={isLoadingGitHubOAuth || isSavingGitHubOAuth}
              aria-expanded={githubConfigExpanded}
            >
              {isLoadingGitHubOAuth ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <Github data-icon="inline-start" />
              )}
              {githubConfigExpanded ? "收起配置" : "配置 GitHub OAuth"}
            </Button>

            {githubConfigExpanded ? (
              <FieldGroup className="max-w-xl gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-disabled={isLoadingGitHubOAuth || isSavingGitHubOAuth}>
                    <FieldLabel htmlFor="github-client-id">Client ID</FieldLabel>
                    <Input
                      id="github-client-id"
                      value={githubClientId}
                      onChange={(event) => setGitHubClientId(event.target.value)}
                      placeholder="GitHub OAuth App Client ID"
                      disabled={isLoadingGitHubOAuth || isSavingGitHubOAuth}
                      autoComplete="off"
                    />
                  </Field>
                  <Field data-disabled={isLoadingGitHubOAuth || isSavingGitHubOAuth}>
                    <FieldLabel htmlFor="github-client-secret">Client Secret</FieldLabel>
                    <Input
                      id="github-client-secret"
                      type="password"
                      value={githubClientSecret}
                      onChange={(event) => setGitHubClientSecret(event.target.value)}
                      placeholder={githubSecretConfigured ? "已配置，留空保持不变" : "填写 Client Secret"}
                      disabled={isLoadingGitHubOAuth || isSavingGitHubOAuth}
                      autoComplete="new-password"
                    />
                  </Field>
                </div>

                <Field data-disabled={isLoadingGitHubOAuth}>
                  <FieldLabel htmlFor="github-callback-url">Authorization callback URL</FieldLabel>
                  <Input
                    id="github-callback-url"
                    value={githubCallbackUrl}
                    placeholder="请先在站点设置中保存网站链接"
                    readOnly
                    disabled={isLoadingGitHubOAuth}
                  />
                </Field>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void saveGitHubOAuth(true)}
                    disabled={isLoadingGitHubOAuth || isSavingGitHubOAuth}
                    aria-busy={githubOAuthSavingAction === "enable"}
                  >
                    {githubOAuthSavingAction === "enable" ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Save data-icon="inline-start" />
                    )}
                    {githubOAuthSavingAction === "enable" ? "保存中..." : "保存并开启"}
                  </Button>
                  {githubOAuthEnabled ? (
                    <Button
                      variant="outline"
                      onClick={() => void saveGitHubOAuth(false)}
                      disabled={isLoadingGitHubOAuth || isSavingGitHubOAuth}
                      aria-busy={githubOAuthSavingAction === "disable"}
                    >
                      {githubOAuthSavingAction === "disable" ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Power data-icon="inline-start" />
                      )}
                      {githubOAuthSavingAction === "disable" ? "关闭中..." : "关闭 GitHub OAuth"}
                    </Button>
                  ) : null}
                </div>
              </FieldGroup>
            ) : null}
          </section>
        ) : null}

        {githubOAuthEnabled ? (
          <section>
            {isLoadingGitHubConnection ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                正在加载 GitHub 关联状态...
              </div>
            ) : githubLinked ? (
              <div className="flex w-full max-w-md items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="lg">
                    <AvatarImage
                      src={
                        githubAvatarUrl ??
                        (githubUsername
                          ? `https://github.com/${encodeURIComponent(githubUsername)}.png?size=80`
                          : undefined)
                      }
                      alt={githubUsername ? `${githubUsername} 的 GitHub 头像` : "GitHub 头像"}
                    />
                    <AvatarFallback>
                      <Github aria-hidden="true" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate text-sm font-medium">
                    {githubUsername ?? "GitHub 用户"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void unlinkGitHub()}
                  disabled={isUnlinkingGitHub}
                  aria-busy={isUnlinkingGitHub}
                >
                  {isUnlinkingGitHub ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Unlink data-icon="inline-start" />
                  )}
                  {isUnlinkingGitHub ? "解绑中..." : "解绑"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={linkGitHub}
                disabled={isLinkingGitHub}
                aria-busy={isLinkingGitHub}
              >
                {isLinkingGitHub ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <Github data-icon="inline-start" />
                )}
                {isLinkingGitHub ? "等待 GitHub 授权..." : "关联 GitHub"}
              </Button>
            )}
          </section>
        ) : null}

        {isAdmin ? (
          <section className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">Google OAuth 登录</div>
              <StatusBadge active={googleOAuthEnabled}>
                {googleOAuthEnabled ? "已开启" : "已关闭"}
              </StatusBadge>
            </div>
            <Button
              variant="outline"
              onClick={() => setGoogleConfigExpanded((expanded) => !expanded)}
              disabled={isLoadingGoogleOAuth || isSavingGoogleOAuth}
              aria-expanded={googleConfigExpanded}
            >
              {isLoadingGoogleOAuth ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <GoogleIcon data-icon="inline-start" />
              )}
              {googleConfigExpanded ? "收起配置" : "配置 Google OAuth"}
            </Button>

            {googleConfigExpanded ? (
              <FieldGroup className="max-w-xl gap-4">
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field data-disabled={isLoadingGoogleOAuth || isSavingGoogleOAuth}>
                    <FieldLabel htmlFor="google-client-id">Client ID</FieldLabel>
                    <Input
                      id="google-client-id"
                      value={googleClientId}
                      onChange={(event) => setGoogleClientId(event.target.value)}
                      placeholder="Google OAuth Client ID"
                      disabled={isLoadingGoogleOAuth || isSavingGoogleOAuth}
                      autoComplete="off"
                    />
                  </Field>
                  <Field data-disabled={isLoadingGoogleOAuth || isSavingGoogleOAuth}>
                    <FieldLabel htmlFor="google-client-secret">Client Secret</FieldLabel>
                    <Input
                      id="google-client-secret"
                      type="password"
                      value={googleClientSecret}
                      onChange={(event) => setGoogleClientSecret(event.target.value)}
                      placeholder={googleSecretConfigured ? "已配置，留空保持不变" : "填写 Client Secret"}
                      disabled={isLoadingGoogleOAuth || isSavingGoogleOAuth}
                      autoComplete="new-password"
                    />
                  </Field>
                </FieldGroup>

                <Field data-disabled={isLoadingGoogleOAuth}>
                  <FieldLabel htmlFor="google-callback-url">Authorized redirect URI</FieldLabel>
                  <Input
                    id="google-callback-url"
                    value={googleCallbackUrl}
                    placeholder="请先在站点设置中保存网站链接"
                    readOnly
                    disabled={isLoadingGoogleOAuth}
                  />
                </Field>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void saveGoogleOAuth(true)}
                    disabled={isLoadingGoogleOAuth || isSavingGoogleOAuth}
                    aria-busy={googleOAuthSavingAction === "enable"}
                  >
                    {googleOAuthSavingAction === "enable" ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Save data-icon="inline-start" />
                    )}
                    {googleOAuthSavingAction === "enable" ? "保存中..." : "保存并开启"}
                  </Button>
                  {googleOAuthEnabled ? (
                    <Button
                      variant="outline"
                      onClick={() => void saveGoogleOAuth(false)}
                      disabled={isLoadingGoogleOAuth || isSavingGoogleOAuth}
                      aria-busy={googleOAuthSavingAction === "disable"}
                    >
                      {googleOAuthSavingAction === "disable" ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Power data-icon="inline-start" />
                      )}
                      {googleOAuthSavingAction === "disable" ? "关闭中..." : "关闭 Google OAuth"}
                    </Button>
                  ) : null}
                </div>
              </FieldGroup>
            ) : null}
          </section>
        ) : null}

        {googleOAuthEnabled ? (
          <section>
            {isLoadingGoogleConnection ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                正在加载 Google 关联状态...
              </div>
            ) : googleLinked ? (
              <div className="flex w-full max-w-md items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="lg">
                    <AvatarImage
                      src={googleAvatarUrl ?? undefined}
                      alt={googleUsername ? `${googleUsername} 的 Google 头像` : "Google 头像"}
                    />
                    <AvatarFallback>
                      <GoogleIcon />
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate text-sm font-medium">
                    {googleUsername ?? "Google 用户"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void unlinkGoogle()}
                  disabled={isUnlinkingGoogle}
                  aria-busy={isUnlinkingGoogle}
                >
                  {isUnlinkingGoogle ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Unlink data-icon="inline-start" />
                  )}
                  {isUnlinkingGoogle ? "解绑中..." : "解绑"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={linkGoogle}
                disabled={isLinkingGoogle}
                aria-busy={isLinkingGoogle}
              >
                {isLinkingGoogle ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <GoogleIcon data-icon="inline-start" />
                )}
                {isLinkingGoogle ? "等待 Google 授权..." : "关联 Google"}
              </Button>
            )}
          </section>
        ) : null}

        {isAdmin ? (
          <section className="flex flex-col items-start gap-4">
            <div className="flex items-center gap-2">
              <div className="text-sm font-medium">QQ OAuth 登录</div>
              <StatusBadge active={qqOAuthEnabled}>
                {qqOAuthEnabled ? "已开启" : "已关闭"}
              </StatusBadge>
            </div>
            <Button
              variant="outline"
              onClick={() => setQQConfigExpanded((expanded) => !expanded)}
              disabled={isLoadingQQOAuth || isSavingQQOAuth}
              aria-expanded={qqConfigExpanded}
            >
              {isLoadingQQOAuth ? (
                <Spinner data-icon="inline-start" />
              ) : (
                <QQIcon data-icon="inline-start" className="text-[#12B7F5]" />
              )}
              {qqConfigExpanded ? "收起配置" : "配置 QQ OAuth"}
            </Button>

            {qqConfigExpanded ? (
              <FieldGroup className="max-w-xl gap-4">
                <FieldGroup className="grid gap-4 sm:grid-cols-2">
                  <Field data-disabled={isLoadingQQOAuth || isSavingQQOAuth}>
                    <FieldLabel htmlFor="qq-app-id">App ID</FieldLabel>
                    <Input
                      id="qq-app-id"
                      value={qqAppId}
                      onChange={(event) => setQQAppId(event.target.value)}
                      placeholder="QQ 互联网站应用 App ID"
                      disabled={isLoadingQQOAuth || isSavingQQOAuth}
                      autoComplete="off"
                    />
                  </Field>
                  <Field data-disabled={isLoadingQQOAuth || isSavingQQOAuth}>
                    <FieldLabel htmlFor="qq-app-key">App Key</FieldLabel>
                    <Input
                      id="qq-app-key"
                      type="password"
                      value={qqAppKey}
                      onChange={(event) => setQQAppKey(event.target.value)}
                      placeholder={qqAppKeyConfigured ? "已配置，留空保持不变" : "填写 App Key"}
                      disabled={isLoadingQQOAuth || isSavingQQOAuth}
                      autoComplete="new-password"
                    />
                  </Field>
                </FieldGroup>

                <Field data-disabled={isLoadingQQOAuth}>
                  <FieldLabel htmlFor="qq-callback-url">回调地址</FieldLabel>
                  <Input
                    id="qq-callback-url"
                    value={qqCallbackUrl}
                    placeholder="请先在站点设置中保存网站链接"
                    readOnly
                    disabled={isLoadingQQOAuth}
                  />
                </Field>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => void saveQQOAuth(true)}
                    disabled={isLoadingQQOAuth || isSavingQQOAuth}
                    aria-busy={qqOAuthSavingAction === "enable"}
                  >
                    {qqOAuthSavingAction === "enable" ? (
                      <Spinner data-icon="inline-start" />
                    ) : (
                      <Save data-icon="inline-start" />
                    )}
                    {qqOAuthSavingAction === "enable" ? "保存中..." : "保存并开启"}
                  </Button>
                  {qqOAuthEnabled ? (
                    <Button
                      variant="outline"
                      onClick={() => void saveQQOAuth(false)}
                      disabled={isLoadingQQOAuth || isSavingQQOAuth}
                      aria-busy={qqOAuthSavingAction === "disable"}
                    >
                      {qqOAuthSavingAction === "disable" ? (
                        <Spinner data-icon="inline-start" />
                      ) : (
                        <Power data-icon="inline-start" />
                      )}
                      {qqOAuthSavingAction === "disable" ? "关闭中..." : "关闭 QQ OAuth"}
                    </Button>
                  ) : null}
                </div>
              </FieldGroup>
            ) : null}
          </section>
        ) : null}

        {qqOAuthEnabled ? (
          <section>
            {isLoadingQQConnection ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner />
                正在加载 QQ 关联状态...
              </div>
            ) : qqLinked ? (
              <div className="flex w-full max-w-md items-center justify-between gap-4">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar size="lg">
                    <AvatarImage
                      src={qqAvatarUrl ?? undefined}
                      alt={qqUsername ? `${qqUsername} 的 QQ 头像` : "QQ 头像"}
                    />
                    <AvatarFallback>
                      <QQIcon className="text-[#12B7F5]" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="truncate text-sm font-medium">
                    {qqUsername ?? "QQ 用户"}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void unlinkQQ()}
                  disabled={isUnlinkingQQ}
                  aria-busy={isUnlinkingQQ}
                >
                  {isUnlinkingQQ ? (
                    <Spinner data-icon="inline-start" />
                  ) : (
                    <Unlink data-icon="inline-start" />
                  )}
                  {isUnlinkingQQ ? "解绑中..." : "解绑"}
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                onClick={linkQQ}
                disabled={isLinkingQQ}
                aria-busy={isLinkingQQ}
              >
                {isLinkingQQ ? (
                  <Spinner data-icon="inline-start" />
                ) : (
                  <QQIcon data-icon="inline-start" className="text-[#12B7F5]" />
                )}
                {isLinkingQQ ? "等待 QQ 授权..." : "关联 QQ"}
              </Button>
            )}
          </section>
        ) : null}

        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="text-sm font-medium">两步验证</div>
            <StatusBadge active={security.twoFactorEnabled}>
              {security.twoFactorEnabled ? "已开启" : "已关闭"}
            </StatusBadge>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setTwoFactorDialogMode(security.twoFactorEnabled ? "disable" : "setup")
              setTwoFactorDialogOpen(true)
            }}
          >
            {security.twoFactorEnabled ? (
              <ShieldOff data-icon="inline-start" />
            ) : (
              <ShieldCheck data-icon="inline-start" />
            )}
            {security.twoFactorEnabled ? "关闭两步验证" : "开启两步验证"}
          </Button>
          <TwoFactorDialog
            open={twoFactorDialogOpen}
            onOpenChange={setTwoFactorDialogOpen}
            mode={twoFactorDialogMode}
            token={token ?? ""}
            userEmail={authSession?.user.email ?? ""}
            hasPasskeys={security.passkeys.length > 0}
            onSuccess={(enabled) => {
              updateSecurity({ twoFactorEnabled: enabled })
            }}
          />
        </section>

      </div>

      <section className="space-y-3">
        <div className="text-sm font-medium">最近登录活动</div>

        <div className="flex flex-col gap-3 @5xl/settings-content:hidden">
          {activityRows.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-border/70 px-4 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-sm font-medium">{item.method}</div>
                  <div className="mt-1 break-all text-sm text-muted-foreground">{item.device}</div>
                </div>
                <ActivityStatusBadge result={item.result} />
              </div>

              <div className="mt-3 space-y-2 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">IP</span>
                  <span className="max-w-[60%] text-right break-all">{item.ip}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">时间</span>
                  <span className="max-w-[60%] text-right">{item.time}</span>
                </div>
                {"identifier" in item && item.identifier ? (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">登录账号</span>
                    <span className="max-w-[60%] text-right break-all">{item.identifier}</span>
                  </div>
                ) : null}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden overflow-hidden rounded-xl border border-border/70 @5xl/settings-content:block">
          <Table className="min-w-[920px]">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>登录方式</TableHead>
                <TableHead>结果</TableHead>
                <TableHead>设备指纹</TableHead>
                <TableHead>IP</TableHead>
                <TableHead>时间</TableHead>
                <TableHead>登录账号</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activityRows.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.method}</TableCell>
                  <TableCell>
                    <ActivityStatusBadge result={item.result} />
                  </TableCell>
                  <TableCell className="max-w-[320px] break-all">{item.device}</TableCell>
                  <TableCell>{item.ip}</TableCell>
                  <TableCell>{item.time}</TableCell>
                  <TableCell className="break-all">{item.identifier}</TableCell>
                </TableRow>
              ))}
              {!isLoadingActivity && activityRows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    暂无登录活动
                  </TableCell>
                </TableRow>
              ) : null}
              {isLoadingActivity ? (
                <TableRow>
                  <TableCell colSpan={6} className="py-6 text-center text-muted-foreground">
                    正在加载登录活动...
                  </TableCell>
                </TableRow>
              ) : null}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  )
}
