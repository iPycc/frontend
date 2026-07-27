import * as React from "react"
import {
  IconLayoutGrid,
  IconListDetails,
  IconPhoto,
  IconPhotoOff,
} from "@tabler/icons-react"

import { type ViewMode } from "@/lib/models"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { Slider } from "@/components/ui/slider"

interface ViewSettingsPopoverProps {
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
  thumbnailsEnabled: boolean
  onThumbnailsChange: (enabled: boolean) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  children: React.ReactNode
}

export function ViewSettingsPopover({
  viewMode,
  onViewModeChange,
  thumbnailsEnabled,
  onThumbnailsChange,
  pageSize,
  onPageSizeChange,
  children,
}: ViewSettingsPopoverProps) {
  const [draftPageSize, setDraftPageSize] = React.useState(pageSize)

  React.useEffect(() => {
    setDraftPageSize(pageSize)
  }, [pageSize])

  const applyPageSize = () => {
    const nextPageSize = Math.min(2000, Math.max(50, draftPageSize))
    setDraftPageSize(nextPageSize)
    if (nextPageSize !== pageSize) {
      onPageSizeChange(nextPageSize)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-medium text-foreground">布局</p>
            <ToggleGroup
              type="single"
              variant="outline"
              value={viewMode}
              onValueChange={(v) => {
                if (v) onViewModeChange(v as ViewMode)
              }}
              className="w-full"
            >
              <ToggleGroupItem value="grid" className="flex-1 gap-1.5 text-xs">
                <IconLayoutGrid />
                网格
              </ToggleGroupItem>
              <ToggleGroupItem value="list" className="flex-1 gap-1.5 text-xs">
                <IconListDetails />
                列表
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2.5">
            <p className="text-sm font-medium text-foreground">缩略图</p>
            <ToggleGroup
              type="single"
              variant="outline"
              value={thumbnailsEnabled ? "on" : "off"}
              onValueChange={(v) => {
                if (v) onThumbnailsChange(v === "on")
              }}
              className="w-full"
            >
              <ToggleGroupItem value="on" className="flex-1 gap-1.5 text-xs">
                <IconPhoto />
                开启
              </ToggleGroupItem>
              <ToggleGroupItem value="off" className="flex-1 gap-1.5 text-xs">
                <IconPhotoOff />
                关闭
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium text-foreground">分页大小</p>
              <span className="text-xs font-medium tabular-nums text-foreground">
                {draftPageSize} 项 / 批
              </span>
            </div>
            <Slider
              value={[draftPageSize]}
              onValueChange={([value]) => setDraftPageSize(value)}
              min={50}
              max={2000}
              step={50}
              aria-label="每批加载数量"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50</span>
              <span>2000</span>
            </div>
            <p className="text-xs leading-5 text-muted-foreground">
              应用后会使用新的 limit 重新加载当前目录；“加载更多”继续使用游标请求下一批。
            </p>
            <Button
              type="button"
              size="sm"
              disabled={draftPageSize === pageSize}
              onClick={applyPageSize}
            >
              {draftPageSize === pageSize ? "当前设置已应用" : "应用并重新加载"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

