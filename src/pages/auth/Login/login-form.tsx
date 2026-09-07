import * as React from "react"
import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  ArrowRight,
  Github,
  Loader2,
  LogIn,
  Mail,
  RectangleEllipsis,
  ScanFace,
  ShieldCheck,
} from "lucide-react"
import { toast } from "sonner"

import { FilingLink } from "@/components/shared/FilingBar"
import { ModeToggle } from "@/components/shared/ModeToggle"
import { useWebsiteSettings } from "@/components/shared/useWebsiteSettings"
import { getGitHubOAuthStatus } from "@/api/oauth"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp"
import { Logo } from "@/components/ui/logo"
import { Input } from "@/components/ui/input"
import {
  openGitHubOAuthPopup,
  readGitHubOAuthPopupResult,
  subscribeGitHubOAuthResults,
  type GitHubOAuthMessage,
} from "@/lib/github-oauth-popup"
import { useAppState } from "@/state/app"
import { cn } from "@/lib/utils"
import "@/styles/slide-transition.css"

type LoginPhase = "initial" | "email" | "password" | "twoFactor"

function isPasskeyCanceledMessage(message: string | undefined) {
  const normalized = (message || "").trim()
  return normalized === "用户已取消登录"
}

const GITHUB_OAUTH_ERROR_DESCRIPTIONS: Record<string, string> = {
  access_denied: "GitHub 授权已取消。",
  account_not_found: "关联的 Cloudrave 账号不存在。",
  account_disabled: "账号已被禁用。",
  guest_not_supported: "访客账号不能使用 GitHub 登录。",
  identity_conflict: "该 Cloudrave 账号已关联其他 GitHub 身份。",
  invalid_state: "登录请求已失效，请重新发起 GitHub 登录。",
  not_linked: "该 GitHub 账号尚未关联 Cloudrave 账号，请先登录后在账号与安全中关联。",
  not_configured: "管理员尚未完成 GitHub OAuth 配置。",
  provider_error: "GitHub 暂时无法完成授权，请稍后再试。",
}

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const location = useLocation()
  const navigate = useNavigate()
  const { login, loginWithPasskey, verifyTwoFactor } = useAppState()
  const state = location.state as { fromRegister?: boolean; initialHeight?: number } | null
  const websiteSettings = useWebsiteSettings()

  const [phase, setPhase] = useState<LoginPhase>("initial")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [twoFactorToken, setTwoFactorToken] = useState<string>("")
  const [twoFactorMethod, setTwoFactorMethod] = useState<"password" | "passkey" | "github">("password")
  const [githubOAuthUrl, setGitHubOAuthUrl] = useState<string | null>(null)
  const [isGitHubOAuthLoading, setIsGitHubOAuthLoading] = useState(true)
  const [isGitHubLoginLoading, setIsGitHubLoginLoading] = useState(false)
  const [otpCode, setOtpCode] = useState("")
  const [slideTransition, setSlideTransition] = useState<{
    isAnimating: boolean
    isGoingBack: boolean
    leavingPhase: LoginPhase
    enteringPhase: LoginPhase
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isPasskeyLoading, setIsPasskeyLoading] = useState(false)
  const [isEnteringApp, setIsEnteringApp] = useState(false)
  const [isLeavingToRegister, setIsLeavingToRegister] = useState(false)
  const [enableHeightTransition, setEnableHeightTransition] = useState(false)
  const [containerHeight, setContainerHeight] = useState<number | "auto">(
    state?.fromRegister && state?.initialHeight ? state.initialHeight : "auto"
  )
  const contentRef = useRef<HTMLDivElement>(null)
  const githubOAuthPopupRef = useRef<Window | null>(null)
  const handledOAuthLoginResultRef = useRef<string | null>(null)
  const hasMeasuredInitialHeight = useRef(false)

  useEffect(() => {
    const controller = new AbortController()
    getGitHubOAuthStatus(controller.signal)
      .then((settings) => {
        if (!controller.signal.aborted) {
          setGitHubOAuthUrl(settings.enabled ? settings.authorize_url : null)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setGitHubOAuthUrl(null)
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsGitHubOAuthLoading(false)
        }
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const oauthError = params.get("oauth_error")
    const oauthTwoFactor = params.get("oauth_2fa")
    const resultKey = oauthTwoFactor ? `2fa:${oauthTwoFactor}` : oauthError ? `error:${oauthError}` : null

    if (!resultKey || handledOAuthLoginResultRef.current === resultKey) {
      return
    }
    handledOAuthLoginResultRef.current = resultKey

    if (oauthTwoFactor === "github") {
      setTwoFactorToken("")
      setTwoFactorMethod("github")
      setOtpCode("")
      setPhase("twoFactor")
      navigate("/login", { replace: true })
      return
    }

    if (!oauthError) {
      navigate("/login", { replace: true })
      return
    }

    toast.error("GitHub 登录失败", {
      description: GITHUB_OAUTH_ERROR_DESCRIPTIONS[oauthError] ?? "当前无法完成 GitHub 登录。",
    })
    navigate("/login", { replace: true })
  }, [location.search, navigate])

  useLayoutEffect(() => {
    if (!contentRef.current || isLeavingToRegister) {
      return
    }

    const content = contentRef.current
    let animationFrame: number | null = null

    const syncContainerHeight = () => {
      const height = content.offsetHeight

      if (state?.fromRegister && !hasMeasuredInitialHeight.current) {
        animationFrame = requestAnimationFrame(() => {
          setContainerHeight(height)
          setEnableHeightTransition(true)
          window.history.replaceState({}, document.title)
        })
      } else {
        setContainerHeight(height)
        if (hasMeasuredInitialHeight.current) {
          setEnableHeightTransition(true)
        }
      }

      hasMeasuredInitialHeight.current = true
    }

    syncContainerHeight()

    const resizeObserver = new ResizeObserver(syncContainerHeight)
    resizeObserver.observe(content)

    return () => {
      resizeObserver.disconnect()
      if (animationFrame !== null) {
        cancelAnimationFrame(animationFrame)
      }
    }
  }, [githubOAuthUrl, isGitHubOAuthLoading, phase, state?.fromRegister, isLeavingToRegister])

  const handlePhaseChange = (nextPhase: LoginPhase, goingBack = false) => {
    if (phase === nextPhase) {
      return
    }

    setSlideTransition({
      isAnimating: true,
      isGoingBack: goingBack,
      leavingPhase: phase,
      enteringPhase: nextPhase,
    })
    setTimeout(() => {
      setPhase(nextPhase)
      setTimeout(() => setSlideTransition(null), 50)
    }, 300)
  }

  const handleGitHubOAuthResult = React.useCallback((message: GitHubOAuthMessage) => {
    if (!githubOAuthPopupRef.current) {
      return
    }

    githubOAuthPopupRef.current.close()
    githubOAuthPopupRef.current = null
    setIsGitHubLoginLoading(false)

    if (message.result === "success") {
      setIsEnteringApp(true)
      window.location.assign("/app")
      return
    }

    if (message.result === "two_factor") {
      setTwoFactorToken("")
      setTwoFactorMethod("github")
      setOtpCode("")
      handlePhaseChange("twoFactor")
      return
    }

    toast.error("GitHub 登录失败", {
      description:
        GITHUB_OAUTH_ERROR_DESCRIPTIONS[message.result] ?? "当前无法完成 GitHub 登录。",
    })
  }, [phase])

  useEffect(() => {
    return subscribeGitHubOAuthResults(
      "login",
      () => githubOAuthPopupRef.current,
      handleGitHubOAuthResult
    )
  }, [handleGitHubOAuthResult])

  useEffect(() => {
    if (!isGitHubLoginLoading) {
      return
    }

    const closeWatcher = window.setInterval(() => {
      const popup = githubOAuthPopupRef.current
      if (!popup || popup.closed) {
        githubOAuthPopupRef.current = null
        setIsGitHubLoginLoading(false)
        return
      }

      const result = readGitHubOAuthPopupResult(popup, "login")
      if (result) {
        handleGitHubOAuthResult(result)
      }
    }, 250)

    return () => window.clearInterval(closeWatcher)
  }, [handleGitHubOAuthResult, isGitHubLoginLoading])

  useEffect(() => {
    return () => githubOAuthPopupRef.current?.close()
  }, [])

  const handleEmailSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (email.trim() && !isLoading) {
      handlePhaseChange("password")
    }
  }

  const handlePasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLoading || isEnteringApp) {
      return
    }

    setIsLoading(true)
    try {
      const result = await login(email, password)
      if (result.success) {
        setIsEnteringApp(true)
        navigate("/app")
        return
      }

      if (result.message === "requires_2fa" && result.twoFactorToken) {
        setTwoFactorToken(result.twoFactorToken)
        setTwoFactorMethod(result.method ?? "password")
        setOtpCode("")
        handlePhaseChange("twoFactor")
        return
      }

      toast.error("登录失败", {
        description: result.message || "请检查邮箱和密码后重试。",
      })
    } catch (error) {
      console.error("登录错误:", error)
      toast.error("登录异常", {
        description: "当前无法完成登录，请稍后再试。",
      })
      setIsEnteringApp(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTwoFactorSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (isLoading || isEnteringApp || otpCode.length !== 6) {
      return
    }

    setIsLoading(true)
    try {
      const result = await verifyTwoFactor(twoFactorToken, otpCode, twoFactorMethod)
      if (result.success) {
        setIsEnteringApp(true)
        navigate("/app")
        return
      }

      toast.error("两步验证失败", {
        description: result.message || "验证码错误，请检查后重试。",
      })
    } catch (error) {
      console.error("两步验证错误:", error)
      toast.error("两步验证异常", {
        description: "当前无法完成验证，请稍后再试。",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (phase === "twoFactor") {
      if (twoFactorMethod === "passkey" || twoFactorMethod === "github") {
        handlePhaseChange("initial", true)
      } else {
        handlePhaseChange("password", true)
      }
      setOtpCode("")
      return
    }

    if (phase === "password") {
      handlePhaseChange("email", true)
      return
    }

    if (phase === "email") {
      handlePhaseChange("initial", true)
    }
  }

  const handleGoToRegister = (event: React.MouseEvent) => {
    event.preventDefault()
    if (isLeavingToRegister) {
      return
    }

    setIsLeavingToRegister(true)
    setEnableHeightTransition(true)
    setContainerHeight(422)
    setTimeout(() => {
      navigate("/register", { state: { fromLogin: true, initialHeight: 432 } })
    }, 300)
  }

  const handlePasskeyLogin = async () => {
    if (isLoading || isGitHubLoginLoading || isEnteringApp) {
      return
    }

    setIsLoading(true)
    setIsPasskeyLoading(true)
    try {
      const result = await loginWithPasskey(email || undefined)
      if (result.success) {
        setIsEnteringApp(true)
        navigate("/app")
        return
      }

      if (result.message === "requires_2fa" && result.twoFactorToken) {
        setTwoFactorToken(result.twoFactorToken)
        setTwoFactorMethod(result.method ?? "passkey")
        setOtpCode("")
        handlePhaseChange("twoFactor")
        return
      }

      if (isPasskeyCanceledMessage(result.message)) {
        toast("通行密钥", {
          description: "用户已取消登录",
        })
        return
      }
      toast.error("通行密钥登录失败", {
        description: result.message || "请确认当前设备已绑定通行密钥。",
      })
    } catch (error) {
      console.error("通行密钥登录错误:", error)
      toast.error("通行密钥登录异常", {
        description: "当前无法完成通行密钥登录，请稍后再试。",
      })
      setIsEnteringApp(false)
    } finally {
      setIsPasskeyLoading(false)
      setIsLoading(false)
    }
  }

  const handleGitHubLogin = () => {
    if (!githubOAuthUrl || isLoading || isGitHubLoginLoading || isEnteringApp) {
      return
    }

    const popup = openGitHubOAuthPopup(githubOAuthUrl, "login")
    if (!popup) {
      toast.error("无法打开 GitHub 授权窗口", {
        description: "请允许此站点打开弹出式窗口后重试。",
      })
      return
    }

    githubOAuthPopupRef.current = popup
    setIsGitHubLoginLoading(true)
  }

  const getTitle = () => {
    if (phase === "initial") {
      return "选择一种登录方式"
    }
    if (phase === "email") {
      return "登录你的账号"
    }
    if (phase === "twoFactor") {
      return "两步验证"
    }
    return "请输入密码"
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      <Card className="relative overflow-hidden">
        {isEnteringApp ? (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-card/96 backdrop-blur-sm">
            <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Loader2 className="size-7 animate-spin" />
            </div>
            <div className="space-y-1 text-center">
              <div className="text-base font-medium">正在进入 Cloudrave</div>
              <div className="text-sm text-muted-foreground">
                正在同步工作区与用户状态...
              </div>
            </div>
          </div>
        ) : null}

        <div className="flex flex-row items-center justify-between pr-5">
          <div className="flex flex-row justify-start gap-2 px-6 font-semibold">
            <Logo showText className="text-foreground" />
          </div>
          <ModeToggle />
        </div>
        {websiteSettings.site_description ? (
          <p className="px-6 pb-2 text-sm text-muted-foreground">{websiteSettings.site_description}</p>
        ) : null}

        <CardHeader className="text-left">
          <CardTitle className="text-xl">{getTitle()}</CardTitle>
          {phase === "password" ? (
            <CardDescription>
              请输入账号 <span className="font-medium text-foreground">{email}</span> 对应的密码
            </CardDescription>
          ) : null}
          {phase === "twoFactor" ? (
            <CardDescription>
              请输入验证应用生成的 6 位验证码以继续登录
            </CardDescription>
          ) : null}
        </CardHeader>

        <CardContent>
          <div
            className="slide-container"
            style={{
              height: containerHeight === "auto" ? "auto" : `${containerHeight + 10}px`,
              transition: enableHeightTransition ? "height 0.3s ease-in-out" : "none",
              overflow: "hidden",
              position: "relative",
              padding: "3px",
              margin: "-3px",
            }}
          >
            <div
              ref={contentRef}
              className={cn(
                "slide-phase",
                slideTransition?.isAnimating &&
                  !slideTransition.isGoingBack &&
                  slideTransition.leavingPhase === phase &&
                  "slide-exit slide-exit-active",
                slideTransition?.isAnimating &&
                  !slideTransition.isGoingBack &&
                  slideTransition.enteringPhase === phase &&
                  "slide-enter slide-enter-active",
                slideTransition?.isAnimating &&
                  slideTransition.isGoingBack &&
                  slideTransition.leavingPhase === phase &&
                  "slide-back-exit slide-back-exit-active",
                slideTransition?.isAnimating &&
                  slideTransition.isGoingBack &&
                  slideTransition.enteringPhase === phase &&
                  "slide-back-enter slide-back-enter-active"
              )}
            >
              {phase === "initial" ? (
                <div>
                  <FieldGroup>
                    <Field>
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full"
                        disabled={isLoading || isGitHubLoginLoading || isEnteringApp || isLeavingToRegister}
                        onClick={() => handlePhaseChange("email")}
                      >
                        <Mail data-icon="inline-start" />
                        使用邮箱继续
                      </Button>
                    </Field>

                    <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                      或者
                    </FieldSeparator>

                    <Field>
                      {githubOAuthUrl || isGitHubOAuthLoading ? (
                        <Button
                          variant="outline"
                          type="button"
                          className="w-full"
                          disabled={isGitHubOAuthLoading || isGitHubLoginLoading || isLoading || isEnteringApp || isLeavingToRegister}
                          aria-busy={isGitHubOAuthLoading || isGitHubLoginLoading}
                          onClick={handleGitHubLogin}
                        >
                          {isGitHubOAuthLoading || isGitHubLoginLoading ? (
                            <Loader2 data-icon="inline-start" className="animate-spin" />
                          ) : (
                            <Github data-icon="inline-start" />
                          )}
                          {isGitHubOAuthLoading
                            ? "正在加载 GitHub 登录..."
                            : isGitHubLoginLoading
                              ? "等待 GitHub 授权..."
                              : "使用 GitHub 继续"}
                        </Button>
                      ) : null}
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full"
                        disabled={isLoading || isGitHubLoginLoading || isEnteringApp || isLeavingToRegister}
                        aria-busy={isPasskeyLoading}
                        onClick={() => void handlePasskeyLogin()}
                      >
                        {isPasskeyLoading ? (
                          <>
                            <Loader2 data-icon="inline-start" className="animate-spin" />
                            通行密钥登录中...
                          </>
                        ) : (
                          <>
                            <ScanFace data-icon="inline-start" />
                            使用通行密钥继续
                          </>
                        )}
                      </Button>
                    </Field>
                  </FieldGroup>
                </div>
              ) : null}

              {phase === "email" ? (
                <form onSubmit={handleEmailSubmit}>
                  <FieldGroup>
                    <Field>
                      <div className="flex flex-row gap-2">
                        <Mail className="size-5" />
                        <FieldLabel htmlFor="email">电子邮箱</FieldLabel>
                      </div>
                      <Input
                        id="email"
                        type="email"
                        placeholder="m@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        autoFocus
                      />
                    </Field>

                    <Field>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={isLoading || isGitHubLoginLoading || isEnteringApp || isLeavingToRegister}
                        className="w-full"
                        aria-busy={isPasskeyLoading}
                        onClick={() => void handlePasskeyLogin()}
                      >
                        {isPasskeyLoading ? (
                          <>
                            <Loader2 data-icon="inline-start" className="animate-spin" />
                            通行密钥登录中...
                          </>
                        ) : (
                          <>
                            <ScanFace data-icon="inline-start" />
                            使用通行密钥登录
                          </>
                        )}
                      </Button>
                    </Field>

                    <Field>
                      <Button type="submit" disabled={isLoading || isGitHubLoginLoading || isEnteringApp || isLeavingToRegister} className="w-full">
                        {isLoading && !isPasskeyLoading ? (
                          <>
                            <Loader2 data-icon="inline-start" className="animate-spin" />
                            处理中...
                          </>
                        ) : (
                          <>
                            下一步
                            <ArrowRight data-icon="inline-end" />
                          </>
                        )}
                      </Button>
                      <FieldDescription className="text-center">
                        还没有账号？{" "}
                        <a
                          href="#"
                          onClick={handleGoToRegister}
                          className={cn(
                            "underline-offset-4 hover:underline",
                            isLeavingToRegister && "pointer-events-none opacity-50"
                          )}
                        >
                          立即注册
                        </a>
                      </FieldDescription>
                    </Field>

                    <Field>
                      <Button type="button" variant="outline" onClick={handleBack} disabled={isEnteringApp} className="w-full">
                        <ArrowLeft className="size-4" />
                        上一步
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              ) : null}

              {phase === "password" ? (
                <form onSubmit={handlePasswordSubmit}>
                  <FieldGroup>
                    <Field>
                      <div className="flex items-center pt-2">
                        <div className="flex flex-row gap-2">
                          <RectangleEllipsis className="size-5" />
                          <FieldLabel htmlFor="password">密码</FieldLabel>
                        </div>
                        <a href="#" className="ml-auto text-sm underline-offset-4 hover:underline">
                          忘记密码？
                        </a>
                      </div>
                      <Input
                        id="password"
                        type="password"
                        placeholder="输入你的密码"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        autoFocus
                      />
                    </Field>

                    <Field>
                      <Button type="submit" disabled={isLoading || isGitHubLoginLoading || isEnteringApp || isLeavingToRegister} className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            登录中...
                          </>
                        ) : (
                          <>
                            <LogIn data-icon="inline-start" />
                            登录
                          </>
                        )}
                      </Button>
                    </Field>

                    <Field>
                      <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading || isEnteringApp || isLeavingToRegister} className="w-full">
                        <ArrowLeft className="size-4" />
                        上一步
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              ) : null}

              {phase === "twoFactor" ? (
                <form onSubmit={handleTwoFactorSubmit}>
                  <FieldGroup>
                    <Field>
                      <div className="flex flex-row gap-2">
                        <ShieldCheck className="size-5" />
                        <FieldLabel htmlFor="otp">验证码</FieldLabel>
                      </div>
                      <InputOTP
                        id="otp"
                        maxLength={6}
                        value={otpCode}
                        onChange={setOtpCode}
                        disabled={isLoading || isEnteringApp || isLeavingToRegister}
                        autoFocus
                        pushPasswordManagerStrategy="none"
                        className="w-full"
                      >
                        <InputOTPGroup className="flex-1 *:data-[slot=input-otp-slot]:flex-1 *:data-[slot=input-otp-slot]:h-10 *:data-[slot=input-otp-slot]:sm:h-12 *:data-[slot=input-otp-slot]:text-lg *:data-[slot=input-otp-slot]:sm:text-xl">
                          <InputOTPSlot index={0} />
                          <InputOTPSlot index={1} />
                          <InputOTPSlot index={2} />
                        </InputOTPGroup>
                        <InputOTPSeparator />
                        <InputOTPGroup className="flex-1 *:data-[slot=input-otp-slot]:flex-1 *:data-[slot=input-otp-slot]:h-10 *:data-[slot=input-otp-slot]:sm:h-12 *:data-[slot=input-otp-slot]:text-lg *:data-[slot=input-otp-slot]:sm:text-xl">
                          <InputOTPSlot index={3} />
                          <InputOTPSlot index={4} />
                          <InputOTPSlot index={5} />
                        </InputOTPGroup>
                      </InputOTP>
                      <FieldDescription>
                        打开你的验证应用查看 6 位验证码
                      </FieldDescription>
                    </Field>

                    <Field>
                      <Button type="submit" disabled={isLoading || isEnteringApp || otpCode.length !== 6} className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            验证中...
                          </>
                        ) : (
                          <>
                            <ShieldCheck data-icon="inline-start" />
                            验证并登录
                          </>
                        )}
                      </Button>
                    </Field>

                    <Field>
                      <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading || isEnteringApp || isLeavingToRegister} className="w-full">
                        <ArrowLeft className="size-4" />
                        上一步
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              ) : null}
            </div>
          </div>
        </CardContent>

        <FieldDescription className="px-6 text-center">
          <a href="#" className="!no-underline underline-offset-4 hover:underline">使用条款</a>{" "}
          | <a href="#" className="!no-underline underline-offset-4 hover:underline">隐私政策</a>
        </FieldDescription>
      </Card>

      <div className="flex flex-col items-center justify-center gap-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>Powered By</span>
          <Logo className="w-auto" />
          <span>|</span>
          <span>iPycc</span>
        </div>
        <FilingLink className="text-xs" />
      </div>
    </div>
  )
}
