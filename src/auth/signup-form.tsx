import * as React from "react"
import { useState, useRef, useEffect } from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useLocation, useNavigate } from "react-router-dom"
import { Cloud, Mail, User, RectangleEllipsis } from "lucide-react"
import { ModeToggle } from "@/components/mode-toggle"
import { Logo } from "@/components/ui/logo" // 使用 Cloudrave Logo
import { useAppState } from "@/lib/app-state" // 使用 Cloudrave 状态管理
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
  FieldSeparator
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
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
  const containerRef = useRef<HTMLDivElement>(null)
  const hasAnimatedRef = useRef(false)

  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  
  // 如果是从登录页跳转来的，使用登录页的高度；否则直接使用目标高度
  const [containerHeight, setContainerHeight] = useState<number>(
    state?.fromLogin && state?.initialHeight ? state.initialHeight : 432
  )

  // 处理返回登录页
  const handleGoToLogin = (e: React.MouseEvent) => {
    e.preventDefault()
    navigate("/login", { state: { fromRegister: true, initialHeight: containerHeight } })
  }

  // 处理注册提交
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      alert("两次输入的密码不一致")
      return
    }
    const result = register({ email, password, username: name })
    if (result.success) {
      navigate("/app")
    } else {
      alert(result.message || "注册失败")
    }
  }

  // 组件挂载时执行高度动画（仅在从登录页跳转时）
  useEffect(() => {
    if (state?.fromLogin && contentRef.current) {
      // 获取内容的实际高度
      const targetHeight = contentRef.current.offsetHeight
      // 延迟一帧，让动画生效
      requestAnimationFrame(() => {
        setContainerHeight(targetHeight)
        // 动画完成后标记并清除路由状态
        hasAnimatedRef.current = true
        window.history.replaceState({}, document.title)
      })
    }
  }, [state?.fromLogin])
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <div className="flex flex-row items-center justify-between pr-5">
          {/* 恢复 v2 的 Logo 布局结构 */}
          <div className="flex items-center gap-2 font-semibold flex-row justify-start px-6">
             <Logo showText className="text-white" />
          </div>
          <ModeToggle></ModeToggle>
        </div>

        <CardHeader className="text-left">
          <CardTitle className="text-xl">创建你的账号</CardTitle>

        </CardHeader>
        <CardContent>
          <div
            ref={containerRef}
            className="slide-container"
            style={{
              height: containerHeight === 432 && !state?.fromLogin ? "auto" : `${containerHeight}px`,
              transition: state?.fromLogin ? "height 0.3s ease-in-out" : "none"
            }}
          >
            <div ref={contentRef}>
              <form onSubmit={handleSubmit}>
            <FieldGroup>
              <Field>
                <div className="flex flex-row gap-2">
                  <Mail className="size-5"></Mail>
                  <FieldLabel htmlFor="email">电子邮箱</FieldLabel>
                </div>

                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </Field>
              <Field>
                <div className="flex flex-row gap-2">
                  <User className="size-5"></User>
                  <FieldLabel htmlFor="name">昵称</FieldLabel>
                </div>

                <Input 
                  id="name" 
                  type="text" 
                  placeholder="iPycc" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required 
                />
              </Field>

              <Field>
                <Field className="grid grid-cols gap-4">
                  <Field>
                    <div className="flex flex-row gap-2">
                      <RectangleEllipsis className="size-5"></RectangleEllipsis>
                      <FieldLabel htmlFor="password">密码</FieldLabel>
                    </div>
                    <Input 
                      id="password" 
                      type="password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required 
                    />
                  </Field>

                  <Field>
                    <div className="flex flex-row gap-2">
                      <RectangleEllipsis className="size-5"></RectangleEllipsis>
                      <FieldLabel htmlFor="confirm-password">确认密码</FieldLabel>
                    </div>
                    <Input 
                      id="confirm-password" 
                      type="password" 
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required 
                    />
                  </Field>
                </Field>
              </Field>
              <Field>
                <Button type="submit" className="w-full">创建你的账号</Button>
                <FieldDescription className="text-center !no-underline">
                  已经有账号了？ <a href="#" onClick={handleGoToLogin} className="!no-underline hover:underline">登录</a>
                </FieldDescription>
              </Field>
              <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card "></FieldSeparator>
            </FieldGroup>
          </form>
            </div>
          </div>
        </CardContent>
      
        <FieldDescription className="px-6 text-center">
          <a href="#" className="!no-underline underline-offset-4 hover:underline ">使用条款</a>{" "}
          | <a href="#" className="!no-underline underline-offset-4 hover:underline">隐私政策</a>
        </FieldDescription>
        
      </Card>
        <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <span>Powered By</span>
          <Logo className="w-auto " />
          |
          <span>iPycc</span>
        </div>
    </div>
  )
}
