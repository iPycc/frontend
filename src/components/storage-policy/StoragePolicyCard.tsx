import * as React from "react"
import { IconPencil, IconTrash } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { BucketMount } from "@/lib/mock-data"

interface StoragePolicyCardProps {
  bucket: BucketMount
  onEdit: (bucket: BucketMount) => void
  onDelete: (bucket: BucketMount) => void
}

/** 腾讯云 COS 官方 SVG（用于背景水印） */
function TencentCosBg() {
  return (
    <svg
      viewBox="0 0 1402 1024"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute -right-6 -top-4 h-32 w-auto opacity-[0.12] dark:opacity-[0.08]"
      aria-hidden="true"
    >
      <path d="M1215.068154 831.197568a199.23384 199.23384 0 0 1-148.202014 58.441927l-477.741777 1.258319c148.202014-142.329859 263.967361-265.64512 276.830178-271.796902a660.058216 660.058216 0 0 1 64.453895-58.302113c51.311452-58.302113 96.471122-64.873335 141.910419-65.013148a190.006167 190.006167 0 0 1 142.190046 57.882674c77.596338 70.885303 77.875964 206.364314 0 277.529243z m95.911869-368.128211c-58.302113-57.882673-142.329859-102.902531-226.217791-102.622904S936.979657 393.162747 878.258104 432.310449c-19.294224 19.573851-57.882673 45.439297-83.887932 83.887932-32.017228 19.294224-508.360872 504.725728-508.360872 504.725728l703.679942-1.398132a520.384809 520.384809 0 0 0 109.613565-6.711035 372.322608 372.322608 0 0 0 206.364314-91.15822c122.336568-129.467043 121.777315-335.55173 5.312902-458.307738z" fill="#00A3FF"/>
      <path d="M517.539994 432.310449a322.688914 322.688914 0 0 0-200.212532-64.034456 289.553181 289.553181 0 0 0-226.497418 104.440477A333.174906 333.174906 0 0 0 98.100331 937.455616q77.596338 77.316711 174.4869 77.037085l128.767977-123.175448h-70.605677A264.386801 264.386801 0 0 1 181.988264 833.854019c-77.596338-77.176898-77.875964-199.793093 0-283.960651a180.638682 180.638682 0 0 1 141.211353-58.441927c38.868075 0 77.456524 6.291595 129.327229 57.882674 19.573851 25.585819 77.596338 64.314082 97.030376 90.039714h6.431408l77.316711-90.598967c-25.725633-32.57648-90.598967-83.608306-115.765347-116.464413" fill="#00C8DC"/>
      <path d="M1103.916643 282.850115C1045.334904 115.214063 877.279412-1.110536 696.500917 0.007969 476.99416 0.567222 303.206326 162.470932 265.037317 368.97506c12.862816 0 32.157041-6.431408 51.591079-6.431409s51.591079 6.291595 71.025116 6.151782A303.39469 303.39469 0 0 1 683.917727 129.055572 313.601055 313.601055 0 0 1 968.297819 308.995188s6.571221 6.431408 6.431408 0c45.299484-6.431408 90.459154-26.005259 129.187416-26.145073" fill="#006EFF"/>
    </svg>
  )
}

/** 本机存储背景图标 */
function LocalStorageBg() {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="absolute -right-2 -top-2 h-24 w-auto opacity-[0.10] dark:opacity-[0.07]"
      aria-hidden="true"
    >
      <rect x="8" y="16" width="48" height="32" rx="5" fill="currentColor" />
      <rect x="8" y="16" width="48" height="18" rx="5" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="38" r="3.5" fill="white" />
      <circle cx="30" cy="38" r="3.5" fill="white" />
    </svg>
  )
}

export function StoragePolicyCard({ bucket, onEdit, onDelete }: StoragePolicyCardProps) {
  const isLocal = bucket.isLocal || bucket.provider === "本机存储"
  const providerLabel = isLocal ? "本机存储" : "腾讯云 COS"

  return (
    <div
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-xl border border-border/60 transition-colors hover:border-border",
        "bg-card"
      )}
    >
      {/* Background icon watermark */}
      {isLocal ? <LocalStorageBg /> : <TencentCosBg />}

      {/* Body */}
      <div className="relative flex flex-1 flex-col gap-1 px-5 py-4">
        <div className="truncate text-sm font-semibold">{bucket.name}</div>
        <div className="text-xs text-muted-foreground">{providerLabel}</div>
        {bucket.bucket && (
          <div className="truncate font-mono text-xs text-muted-foreground/60">
            {bucket.bucket}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative flex items-center justify-between gap-2 border-t border-border/40 px-4 py-2">
        <Button
          variant="ghost"
          size="sm"
          className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
          onClick={() => onEdit(bucket)}
        >
          <IconPencil size={13} />
          编辑
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-muted-foreground hover:text-destructive"
          onClick={() => onDelete(bucket)}
          disabled={!bucket.canDelete}
        >
          <IconTrash size={14} />
        </Button>
      </div>
    </div>
  )
}
