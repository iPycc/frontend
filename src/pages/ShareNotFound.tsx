import { useNavigate } from "react-router-dom"
import { motion } from "motion/react"
import { IconArrowLeft, IconHome, IconShare } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { usePageTitle } from "@/hooks/use-page-title"
import { useAppState } from "@/lib/app-state"

export function ShareNotFound() {
  usePageTitle("分享链接不存在")
  const navigate = useNavigate()
  const { isAuthenticated } = useAppState()

  return (
    <div className="flex flex-1 flex-col items-center justify-center py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.35 }}
        className="flex w-full max-w-md flex-col items-center rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm sm:p-10"
      >
        <div className="relative flex h-32 w-32 items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-primary/10" />
          <div className="absolute inset-3 rounded-full bg-primary/15" />
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            className="relative h-14 w-14 text-primary"
          >
            <path
              d="M13.5 10.5L21 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M16 3h5v5"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M10.5 13.5l-3 3a4.5 4.5 0 0 1-6.364-6.364l3-3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M13.5 10.5l3-3a4.5 4.5 0 0 0-6.364-6.364l-3 3"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <path
              d="M4 20L20 4"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </div>

        <h1 className="mt-6 text-xl font-semibold tracking-tight">链接不存在或已失效</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          你访问的分享链接可能已经过期、被撤销，或者根本不存在。请检查链接是否正确，或联系分享者获取新的链接。
        </p>

        <div className="mt-7 flex w-full flex-col gap-2">
          {isAuthenticated ? (
            <Button onClick={() => navigate("/share")}>
              <IconShare size={16} className="mr-1.5" />
              前往我的分享
            </Button>
          ) : (
            <Button onClick={() => navigate("/login")}>
              <IconHome size={16} className="mr-1.5" />
              登录 Cloudrave
            </Button>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => navigate(-1)}>
              <IconArrowLeft size={16} className="mr-1.5" />
              返回上一页
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              <IconHome size={16} className="mr-1.5" />
              首页
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
