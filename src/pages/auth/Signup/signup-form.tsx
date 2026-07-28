import * as React from "react"
import { useEffect, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { Mail, RectangleEllipsis, User } from "lucide-react"
import { toast } from "sonner"

import { FilingLink } from "@/components/shared/FilingBar"
import { ModeToggle } from "@/components/shared/ModeToggle"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import { Logo } from "@/components/ui/logo"
import { Input } from "@/components/ui/input"
import { useAppState } from "@/state/app"
import { cn } from "@/lib/utils"
import "@/styles/slide-transition.css"

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const location = useLocation()
  const navigate = useNavigate()
  const { register } = useAppState()
  const state = location.state as { fromLogin?: boolean; initialHeight?: number } | null

  const contentRef = useRef<HTMLDivElement>(null)
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [containerHeight, setContainerHeight] = useState<number>(
    state?.fromLogin && state?.initialHeight ? state.initialHeight : 432
  )

  useEffect(() => {
    if (!state?.fromLogin || !contentRef.current) {
      return
    }

    const targetHeight = contentRef.current.offsetHeight
    requestAnimationFrame(() => {
      setContainerHeight(targetHeight)
      window.history.replaceState({}, document.title)
    })
  }, [state?.fromLogin])

  const handleGoToLogin = (event: React.MouseEvent) => {
    event.preventDefault()
    navigate("/login", { state: { fromRegister: true, initialHeight: containerHeight } })
  }

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    if (password !== confirmPassword) {
      toast.error("注册失败", {
        description: "两次输入的密码不一致。",
      })
      return
    }

    try {
      const result = await register({ email, password, username: name })
      if (result.success) {
        navigate("/app")
        return
      }

      toast.error("注册失败", {
        description: result.message || "请检查输入内容后重试。",
      })
    } catch (error) {
      console.error("注册错误:", error)
      toast.error("注册异常", {
        description: "当前无法完成注册，请稍后再试。",
      })
    }
  }

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <div className="flex flex-row items-center justify-between pr-5">
          <div className="flex flex-row justify-start gap-2 px-6 font-semibold">
            <Logo showText className="text-white" />
          </div>
          <ModeToggle />
        </div>

        <CardHeader className="text-left">
          <CardTitle className="text-xl">创建你的账号</CardTitle>
        </CardHeader>

        <CardContent>
          <div
            className="slide-container"
            style={{
              height: containerHeight === 432 && !state?.fromLogin ? "auto" : `${containerHeight}px`,
              transition: state?.fromLogin ? "height 0.3s ease-in-out" : "none",
            }}
          >
            <div ref={contentRef}>
              <form onSubmit={handleSubmit}>
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
                    />
                  </Field>

                  <Field>
                    <div className="flex flex-row gap-2">
                      <User className="size-5" />
                      <FieldLabel htmlFor="name">昵称</FieldLabel>
                    </div>
                    <Input
                      id="name"
                      type="text"
                      placeholder="iPycc"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      minLength={2}
                      maxLength={64}
                      required
                    />
                  </Field>

                  <Field>
                    <Field className="grid grid-cols gap-4">
                      <Field>
                        <div className="flex flex-row gap-2">
                          <RectangleEllipsis className="size-5" />
                          <FieldLabel htmlFor="password">密码</FieldLabel>
                        </div>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(event) => setPassword(event.target.value)}
                          minLength={8}
                          maxLength={128}
                          required
                        />
                      </Field>

                      <Field>
                        <div className="flex flex-row gap-2">
                          <RectangleEllipsis className="size-5" />
                          <FieldLabel htmlFor="confirm-password">确认密码</FieldLabel>
                        </div>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={confirmPassword}
                          onChange={(event) => setConfirmPassword(event.target.value)}
                          minLength={8}
                          maxLength={128}
                          required
                        />
                      </Field>
                    </Field>
                  </Field>

                  <Field>
                    <Button type="submit" className="w-full">创建你的账号</Button>
                    <FieldDescription className="text-center !no-underline">
                      已经有账号了？<a href="#" onClick={handleGoToLogin} className="!no-underline hover:underline">登录</a>
                    </FieldDescription>
                  </Field>

                  <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card" />
                </FieldGroup>
              </form>
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
