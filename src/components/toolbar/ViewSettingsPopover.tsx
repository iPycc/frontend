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

  return (
    <Popover>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-4">
        <div className="space-y-5">
          <div className="space-y-2.5">
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
                <IconLayoutGrid size={15} />
                网格
              </ToggleGroupItem>
              <ToggleGroupItem value="list" className="flex-1 gap-1.5 text-xs">
                <IconListDetails size={15} />
                列表
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2.5">
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
                <IconPhoto size={15} />
                开启
              </ToggleGroupItem>
              <ToggleGroupItem value="off" className="flex-1 gap-1.5 text-xs">
                <IconPhotoOff size={15} />
                关闭
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="space-y-2.5">
            <p className="text-sm font-medium text-foreground">分页大小</p>
            <Slider
              value={[draftPageSize]}
              onValueChange={([value]) => setDraftPageSize(value)}
              onValueCommit={([value]) => onPageSizeChange(value)}
              min={50}
              max={2000}
              step={50}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50</span>
              <span>2000</span>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}

