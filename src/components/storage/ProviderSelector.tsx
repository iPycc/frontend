import * as React from "react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { StorageFormHeader } from "@/components/storage/shared"
import { ProviderIcon } from "@/components/storage/ProviderIcon"
import type { StrategyOption, StorageStrategyKey } from "@/components/storage/types"

interface ProviderSelectorProps {
  onBack: () => void
  onSelect: (strategy: StorageStrategyKey) => void
  options: StrategyOption[]
}

const providerDriverMap: Record<StorageStrategyKey, string> = {
  tencent: "tencent_cos",
  local: "local_fs",
  aliyun: "aliyun_oss",
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
              <ProviderIcon driverId={providerDriverMap[option.strategy]} size={40} />
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
