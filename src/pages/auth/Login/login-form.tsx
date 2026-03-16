import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { useNavigate, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ModeToggle } from "@/components/shared/ModeToggle"
import { Logo } from "@/components/ui/logo"
import { Mail, RectangleEllipsis, ArrowLeft, Loader2 } from "lucide-react"
import { useAppState } from "@/lib/app-state"
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
import { Input } from "@/components/ui/input"
import "@/styles/slide-transition.css"

type LoginPhase = "initial" | "email" | "password"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const location = useLocation()
  const navigate = useNavigate()
  const { login } = useAppState()
  const state = location.state as { fromRegister?: boolean; initialHeight?: number } | null

  const [phase, setPhase] = useState<LoginPhase>("initial")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isAnimating, setIsAnimating] = useState(false)
  const [isGoingBack, setIsGoingBack] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [containerHeight, setContainerHeight] = useState<number | "auto">(
    state?.fromRegister && state?.initialHeight ? state.initialHeight : "auto"
  )
  const contentRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    if (contentRef.current) {
      const height = contentRef.current.offsetHeight
      if (state?.fromRegister) {
        requestAnimationFrame(() => {
          setContainerHeight(height)
          hasAnimatedRef.current = true
          window.history.replaceState({}, document.title)
        })
      } else {
        setContainerHeight(height)
      }
    }
  }, [phase, state?.fromRegister])

  const handlePhaseChange = (newPhase: LoginPhase, goingBack = false) => {
    if (phase === newPhase) return
    setIsGoingBack(goingBack)
    setIsAnimating(true)
    setTimeout(() => {
      setPhase(newPhase)
      setTimeout(() => setIsAnimating(false), 50)
    }, 300)
  }

  const handleEnterEmailPhase = () => {
    handlePhaseChange("email", false)
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (email && !isLoading) {
      setIsLoading(true)
      await new Promise(resolve => setTimeout(resolve, 800))
      setIsLoading(false)
      handlePhaseChange("password", false)
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isLoading) {
      setIsLoading(true)
      try {
        const result = login(email, password)
        if (result.success) {
          navigate("/app")
        } else {
          alert(result.message || "登录失败，请检查邮箱和密码")
        }
      } catch (error) {
        console.error("登录错误:", error)
        alert("登录出错，请稍后重试")
      } finally {
        setIsLoading(false)
      }
    }
  }

  const handleBack = () => {
    if (phase === "password") {
      handlePhaseChange("email", true)
    } else if (phase === "email") {
      handlePhaseChange("initial", true)
    }
  }

  const handleGoToRegister = (e: React.MouseEvent) => {
    e.preventDefault()
    navigate("/register", { state: { fromLogin: true, initialHeight: containerHeight } })
  }

  const getTitle = () => {
    if (phase === "initial") return "选择一个登录方式"
    if (phase === "email") return "登录你的账号"
    return "请输入密码"
  }

  return (
    <div className={cn("flex flex-col gap-3", className)} {...props}>
      <Card>
        <div className="flex flex-row items-center justify-between pr-5">
          <div className="flex items-center gap-2 font-semibold flex-row justify-start px-6">
            <Logo showText className="text-white" />
          </div>
          <ModeToggle />
        </div>

        <CardHeader className="text-left">
          <CardTitle className="text-xl">{getTitle()}</CardTitle>
          {phase === "password" && (
            <CardDescription>
              请输入账号 <span className="font-medium text-foreground">{email}</span> 对应的密码
            </CardDescription>
          )}
        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className={state?.fromRegister ? "slide-container" : ""}
            style={{
              height: containerHeight === "auto" ? "auto" : `${containerHeight + 10}px`,
              transition: state?.fromRegister ? "height 0.3s ease-in-out" : "none",
              overflow: "hidden",
              position: "relative",
              padding: "3px",
              margin: "-3px"
            }}
          >
            <div
              ref={contentRef}
              className={cn(
                "slide-phase",
                isAnimating && !isGoingBack && (phase === "email" || phase === "password") && "slide-enter slide-enter-active",
                isAnimating && !isGoingBack && phase === "initial" && "slide-exit slide-exit-active",
                isAnimating && isGoingBack && (phase === "initial" || phase === "email") && "slide-back-enter slide-back-enter-active",
                isAnimating && isGoingBack && (phase === "email" || phase === "password") && "slide-back-exit slide-back-exit-active"
              )}
            >
              {phase === "initial" && (
                <div>
                  <FieldGroup>
                    <Field>
                      <Button
                        variant="outline"
                        type="button"
                        className="w-full"
                        onClick={handleEnterEmailPhase}
                      >
                        <Mail className="size-4" />
                        使用邮箱继续
                      </Button>
                    </Field>

                    <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                      或者
                    </FieldSeparator>

                    <Field>
                      <Button variant="outline" type="button" className="w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" /><path d="M9 18c-4.51 2-5-2-7-2" /></svg>
                        使用 GitHub 继续
                      </Button>
                      <Button variant="outline" type="button" className="w-full">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><path d="M9 9h.01" /><path d="M15 9h.01" /></svg>
                        使用 通行证密钥 继续
                      </Button>
                    </Field>
                  </FieldGroup>
                </div>
              )}

              {phase === "email" && (
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
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoFocus
                      />
                    </Field>

                    <Field>
                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            处理中...
                          </>
                        ) : (
                          "下一步"
                        )}
                      </Button>
                      <FieldDescription className="text-center">
                        还没有账号？{" "}
                        <a href="#" onClick={handleGoToRegister} className="underline-offset-4 hover:underline">
                          立即注册
                        </a>
                      </FieldDescription>
                    </Field>

                    <Field>
                      <Button type="button" variant="outline" onClick={handleBack} className="w-full">
                        <ArrowLeft className="size-4" />
                        上一步
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              )}

              {phase === "password" && (
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
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoFocus
                      />
                    </Field>

                    <Field>
                      <Button type="submit" disabled={isLoading} className="w-full">
                        {isLoading ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            登录中...
                          </>
                        ) : (
                          "登录"
                        )}
                      </Button>
                    </Field>

                    <Field>
                      <Button type="button" variant="outline" onClick={handleBack} disabled={isLoading} className="w-full">
                        <ArrowLeft className="size-4" />
                        上一步
                      </Button>
                    </Field>
                  </FieldGroup>
                </form>
              )}
            </div>
          </div>
        </CardContent>
        <FieldDescription className="px-6 text-center">
          <a href="#" className="!no-underline underline-offset-4 hover:underline">使用条款</a>{" "}
          | <a href="#" className="!no-underline underline-offset-4 hover:underline">隐私政策</a>
        </FieldDescription>
      </Card>
      <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Powered By</span>
        <Logo className="w-auto" />
        |
        <span>iPycc</span>
      </div>
    </div>
  )
}
