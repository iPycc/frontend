import * as React from "react"
import { LoginForm } from "@/auth/login-form"

export function Login() {
  return (
    <div 
      className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10"
      style={{ "--radius": "0.625rem" } as React.CSSProperties}
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <LoginForm />
      </div>
    </div>
  )
}
