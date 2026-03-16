import * as React from "react"
import { SignupForm } from "@/auth/signup-form"

export function Register() {
  return (
    <div 
      className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10"
      style={{ "--radius": "0.625rem" } as React.CSSProperties}
    >
      <div className="flex w-full max-w-sm flex-col gap-6">
        <SignupForm />
      </div>
    </div>
  )
}
