import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StorageFormHeader } from "@/components/storage/shared"
import type { StrategyOption, StorageStrategyKey } from "@/components/storage/types"

interface ProviderSelectorProps {
  onBack: () => void
  onSelect: (strategy: StorageStrategyKey) => void
  options: StrategyOption[]
}

function TencentLogo() {
  return (
    <svg viewBox="0 0 1402 1024" className="h-10 w-auto" xmlns="http://www.w3.org/2000/svg">
      <path d="M1215.068154 831.197568a199.23384 199.23384 0 0 1-148.202014 58.441927l-477.741777 1.258319c148.202014-142.329859 263.967361-265.64512 276.830178-271.796902a660.058216 660.058216 0 0 1 64.453895-58.302113c51.311452-58.302113 96.471122-64.873335 141.910419-65.013148a190.006167 190.006167 0 0 1 142.190046 57.882674c77.596338 70.885303 77.875964 206.364314 0 277.529243z m95.911869-368.128211c-58.302113-57.882673-142.329859-102.902531-226.217791-102.622904S936.979657 393.162747 878.258104 432.310449c-19.294224 19.573851-57.882673 45.439297-83.887932 83.887932-32.017228 19.294224-508.360872 504.725728-508.360872 504.725728l703.679942-1.398132a520.384809 520.384809 0 0 0 109.613565-6.711035 372.322608 372.322608 0 0 0 206.364314-91.15822c122.336568-129.467043 121.777315-335.55173 5.312902-458.307738z" fill="#00A3FF"/>
      <path d="M517.539994 432.310449a322.688914 322.688914 0 0 0-200.212532-64.034456 289.553181 289.553181 0 0 0-226.497418 104.440477A333.174906 333.174906 0 0 0 98.100331 937.455616q77.596338 77.316711 174.4869 77.037085l128.767977-123.175448h-70.605677A264.386801 264.386801 0 0 1 181.988264 833.854019c-77.596338-77.176898-77.875964-199.793093 0-283.960651a180.638682 180.638682 0 0 1 141.211353-58.441927c38.868075 0 77.456524 6.291595 129.327229 57.882674 19.573851 25.585819 77.596338 64.314082 97.030376 90.039714h6.431408l77.316711-90.598967c-25.725633-32.57648-90.598967-83.608306-115.765347-116.464413" fill="#00C8DC"/>
      <path d="M1103.916643 282.850115C1045.334904 115.214063 877.279412-1.110536 696.500917 0.007969 476.99416 0.567222 303.206326 162.470932 265.037317 368.97506c12.862816 0 32.157041-6.431408 51.591079-6.431409s51.591079 6.291595 71.025116 6.151782A303.39469 303.39469 0 0 1 683.917727 129.055572 313.601055 313.601055 0 0 1 968.297819 308.995188s6.571221 6.431408 6.431408 0c45.299484-6.431408 90.459154-26.005259 129.187416-26.145073" fill="#006EFF"/>
    </svg>
  )
}

function LocalLogo() {
  return (
    <svg viewBox="0 0 64 64" className="h-10 w-10" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="14" width="48" height="36" rx="6" fill="#4F46E5" />
      <rect x="8" y="14" width="48" height="18" rx="6" fill="#6366F1" />
      <circle cx="22" cy="39" r="3" fill="white" />
      <circle cx="32" cy="39" r="3" fill="white" />
    </svg>
  )
}

function AliyunLogo() {
  return (
    <svg viewBox="0 0 32 32" fill="none" className="h-10 w-10" xmlns="http://www.w3.org/2000/svg">
      <rect width="32" height="32" rx="8" fill="#FF6A00" />
      <path d="M8 20l4-8 4 6 3-4 5 6H8z" fill="white" />
    </svg>
  )
}

const providerLogoMap: Record<StorageStrategyKey, React.ReactNode> = {
  tencent: <TencentLogo />,
  local: <LocalLogo />,
  aliyun: <AliyunLogo />,
}

export function ProviderSelector({ onBack, onSelect, options }: ProviderSelectorProps) {
  return (
    <div className="flex flex-col gap-6">
      <StorageFormHeader title="选择存储方式" onBack={onBack} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {options.map((option) => (
          <button
            key={option.strategy}
            type="button"
            onClick={() => option.enabled && onSelect(option.strategy)}
            disabled={!option.enabled}
            className={cn(
              "flex items-center gap-5 overflow-hidden rounded-2xl bg-muted/30 p-5 text-left transition-all",
              option.enabled
                ? "hover:bg-muted/50 hover:shadow-sm"
                : "cursor-not-allowed opacity-60"
            )}
          >
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-xl bg-background/60 shadow-sm">
              {providerLogoMap[option.strategy]}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[15px] font-semibold text-foreground/90">{option.label}</div>
              <div className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">{option.description}</div>
            </div>
          </button>
        ))}
      </div>

      <div className="flex">
        <Button variant="outline" onClick={onBack}>
          返回列表
        </Button>
      </div>
    </div>
  )
}
