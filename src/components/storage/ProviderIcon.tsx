import * as React from "react"

import { cn } from "@/lib/utils"

type ProviderIconProps = {
  driverId?: string
  provider?: string
  size?: number
  className?: string
}

function resolveDriverId(driverId?: string, provider?: string) {
  if (driverId) return driverId
  const value = (provider ?? "").toLowerCase()
  if (value.includes("aliyun") || value.includes("阿里") || value.includes("oss")) return "aliyun_oss"
  if (value.includes("local") || value.includes("本机")) return "local_fs"
  if (value.includes("tencent") || value.includes("腾讯") || value.includes("cos")) return "tencent_cos"
  return "unknown"
}

export function ProviderIcon({ driverId, provider, size = 28, className }: ProviderIconProps) {
  const id = resolveDriverId(driverId, provider)
  const style = { width: size, height: size, minWidth: size, minHeight: size }

  if (id === "aliyun_oss") {
    return (
      <svg viewBox="0 0 1024 1024" style={style} className={cn("shrink-0", className)} aria-hidden="true">
        <path d="M512 64a448 448 0 1 1 0 896A448 448 0 0 1 512 64z" fill="#FF6A00" />
        <path d="M324.8 602.624a26.752 26.752 0 0 1-21.312-25.92v-142.72a27.712 27.712 0 0 1 21.376-25.984l132.416-28.672 13.952-56.896H317.312a97.6 97.6 0 0 0-98.24 96.96v169.344c0.384 54.08 44.16 97.856 98.24 98.176h153.92l-13.888-56.512-132.544-27.776zM710.4 322.432c54.016 0.128 97.92 43.584 98.56 97.6v170.176a98.368 98.368 0 0 1-98.56 98.048H555.328l14.08-56.832 132.608-28.736a27.84 27.84 0 0 0 21.376-25.92v-142.72a26.88 26.88 0 0 0-21.376-25.984l-132.544-28.8-14.08-56.832zM570.368 497.92v13.952H457.28v-13.952h113.088z" fill="#FFFFFF" />
      </svg>
    )
  }

  if (id === "tencent_cos") {
    return (
      <svg viewBox="0 0 1402 1024" style={style} className={cn("shrink-0", className)} aria-hidden="true">
        <path d="M1215.068154 831.197568a199.23384 199.23384 0 0 1-148.202014 58.441927l-477.741777 1.258319c148.202014-142.329859 263.967361-265.64512 276.830178-271.796902a660.058216 660.058216 0 0 1 64.453895-58.302113c51.311452-58.302113 96.471122-64.873335 141.910419-65.013148a190.006167 190.006167 0 0 1 142.190046 57.882674c77.596338 70.885303 77.875964 206.364314 0 277.529243z" fill="#00A3FF" />
        <path d="M517.539994 432.310449a322.688914 322.688914 0 0 0-200.212532-64.034456 289.553181 289.553181 0 0 0-226.497418 104.440477A333.174906 333.174906 0 0 0 98.100331 937.455616q77.596338 77.316711 174.4869 77.037085l128.767977-123.175448h-70.605677A264.386801 264.386801 0 0 1 181.988264 833.854019c-77.596338-77.176898-77.875964-199.793093 0-283.960651a180.638682 180.638682 0 0 1 141.211353-58.441927c38.868075 0 77.456524 6.291595 129.327229 57.882674 19.573851 25.585819 77.596338 64.314082 97.030376 90.039714h6.431408l77.316711-90.598967c-25.725633-32.57648-90.598967-83.608306-115.765347-116.464413" fill="#00C8DC" />
        <path d="M1103.916643 282.850115C1045.334904 115.214063 877.279412-1.110536 696.500917 0.007969 476.99416 0.567222 303.206326 162.470932 265.037317 368.97506c12.862816 0 32.157041-6.431408 51.591079-6.431409s51.591079 6.291595 71.025116 6.151782A303.39469 303.39469 0 0 1 683.917727 129.055572 313.601055 313.601055 0 0 1 968.297819 308.995188s6.571221 6.431408 6.431408 0c45.299484-6.431408 90.459154-26.005259 129.187416-26.145073" fill="#006EFF" />
      </svg>
    )
  }

  if (id === "local_fs") {
    return (
      <svg viewBox="0 0 64 64" style={style} className={cn("shrink-0", className)} aria-hidden="true">
        <rect x="8" y="16" width="48" height="32" rx="5" fill="#4F46E5" />
        <rect x="8" y="16" width="48" height="18" rx="5" fill="#6366F1" />
        <circle cx="20" cy="38" r="3.5" fill="white" />
        <circle cx="30" cy="38" r="3.5" fill="white" />
      </svg>
    )
  }

  return <span style={style} className={cn("inline-block shrink-0 rounded-full bg-primary/15", className)} aria-hidden="true" />
}
