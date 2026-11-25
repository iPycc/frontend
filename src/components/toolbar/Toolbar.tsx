import * as React from "react"
import { type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  IconArrowsSort,
  IconChevronRight,
  IconCopy,
  IconCut,
  IconDots,
  IconDownload,
  IconEdit,
  IconFolder,
  IconHome2,
  IconInfoCircle,
  IconLayoutGrid,
  IconListDetails,
  IconShare3,
  IconX,
} from "@tabler/icons-react"
import { AnimatePresence, motion } from "motion/react"

import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ButtonGroup } from "@/components/ui/button-group"
import { hasCapability, type SortValue, type ViewMode } from "@/lib/models"
import { useAppState } from "@/state/app"
import { ViewSettingsPopover } from "./ViewSettingsPopover"
import { BucketSwitcher } from "@/components/sidebar/BucketSwitcher"
import type { MountHealth } from "@/api/storage"

interface ToolbarProps {
  pathParts?: string[]
  selectedCount: number
  onClearSelection: () => void
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
  sortValue: SortValue
  onSortChange: (value: SortValue) => void
  thumbnailsEnabled: boolean
  onThumbnailsChange: (enabled: boolean) => void
  pageSize: number
  onPageSizeChange: (size: number) => void
  onRefresh: () => void
  onCreateFolder: () => void
  onPaste: () => void
  canPaste: boolean
  onCopy: () => void
  onCut: () => void
  onMove: () => void
  onDelete: () => void
  onRename: () => void
  onShare: () => void
  onDownload: () => void
  onProperties: () => void
  currentLabel?: string
}

const sortLabels: Record<SortValue, string> = {
  "updated-desc": "最近更新",
  "updated-asc": "最早更新",
  "name-asc": "名称 A-Z",
  "name-desc": "名称 Z-A",
  "size-desc": "大小优先",
}

export function Toolbar({
  pathParts = [],
  selectedCount,
  onClearSelection,
  viewMode,
  onViewModeChange,
  sortValue,
  onSortChange,
  thumbnailsEnabled,
  onThumbnailsChange,
  pageSize,
  onPageSizeChange,
  onRefresh,
  onCreateFolder,
  onPaste,
  canPaste,
  onCopy,
  onCut,
  onMove,
  onDelete,
  onRename,
  onShare,
  onDownload,
  onProperties,
  currentLabel,
}: ToolbarProps) {
  const { currentUser, activeBucket } = useAppState()
  const canBatch = (activeBucket.extra?._health as MountHealth | undefined)?.capabilities.batch !== false
  const canCopy = canBatch && hasCapability(currentUser, "file.copy")
  const canShare = hasCapability(currentUser, "share.manage")
  const breadcrumbScrollRef = React.useRef<HTMLDivElement>(null)
  const pathSignature = currentLabel ?? pathParts.join("/")

  React.useLayoutEffect(() => {
    const container = breadcrumbScrollRef.current
    if (!container) return
    const alignRight = () => {
      container.scrollLeft = container.scrollWidth
    }
    alignRight()
    const frame = window.requestAnimationFrame(alignRight)
    return () => window.cancelAnimationFrame(frame)
  }, [activeBucket.id, pathSignature, selectedCount])

  return (
    <div className="app-panel relative flex h-11 shrink-0 items-center justify-between overflow-hidden rounded-xl border border-border px-1.5 sm:h-11.5 sm:px-2 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:shadow-none">
      <AnimatePresence mode="wait" initial={false}>
        {selectedCount > 0 ? (
          <motion.div
            key="selected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-between bg-primary/10 px-2 md:px-4 dark:bg-primary/15"
          >
            <div className="flex items-center gap-2 md:gap-4">
              <button
                type="button"
                onClick={onClearSelection}
                className="flex size-10 items-center justify-center rounded-full text-primary transition-colors hover:bg-primary/10"
                aria-label="清除选择"
              >
                <IconX size={18} />
              </button>
              <span className="text-sm text-primary">
                已选择 {selectedCount} 个对象
              </span>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              {canCopy ? <ActionButton icon={<IconCopy size={18} />} label="复制" onClick={onCopy} /> : null}
              {canBatch ? <ActionButton icon={<IconCut size={18} />} label="剪切" onClick={onCut} /> : null}
              {canBatch ? <ActionButton icon={<IconFolder size={18} />} label="移动" onClick={onMove} /> : null}
              <ActionButton icon={<IconEdit size={18} />} label="重命名" onClick={onRename} />
              <ActionButton icon={<IconDownload size={18} />} label="下载" onClick={onDownload} />
              {canShare ? <ActionButton icon={<IconShare3 size={18} />} label="分享" onClick={onShare} /> : null}
              {canBatch ? <ActionButton icon={<IconX size={18} />} label="删除" onClick={onDelete} /> : null}
            </div>
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger aria-label="批量操作" className="flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <IconDots size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canCopy ? <DropdownMenuItem onClick={onCopy}>复制</DropdownMenuItem> : null}
                  {canBatch ? <DropdownMenuItem onClick={onCut}>剪切</DropdownMenuItem> : null}
                  {canBatch ? <DropdownMenuItem onClick={onMove}>移动</DropdownMenuItem> : null}
                  <DropdownMenuItem onClick={onRename}>重命名</DropdownMenuItem>
                  <DropdownMenuItem onClick={onDownload}>下载</DropdownMenuItem>
                  {canShare ? <DropdownMenuItem onClick={onShare}>分享</DropdownMenuItem> : null}
                  <DropdownMenuItem onClick={onProperties}>
                    <IconInfoCircle size={16} className="mr-2" /> 属性
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {canBatch ? <DropdownMenuItem onClick={onDelete}>删除</DropdownMenuItem> : null}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="flex min-w-0 w-full items-center justify-between gap-2 sm:gap-3"
          >
            <div ref={breadcrumbScrollRef} className="custom-scrollbar min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
              <Breadcrumb className="w-max min-w-full">
                <BreadcrumbList className="w-max flex-nowrap gap-1.5 whitespace-nowrap text-[13px] [&>li]:shrink-0">
                  <BreadcrumbItem className="shrink-0 md:hidden">
                    <BucketSwitcher compact />
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="shrink-0 md:hidden">
                    <IconChevronRight size={14} className="text-muted-foreground" />
                  </BreadcrumbSeparator>
                  <BreadcrumbItem className="shrink-0">
                    <BreadcrumbLink asChild>
                      <Link
                        to="/app"
                        className="flex h-8 shrink-0 items-center gap-2 whitespace-nowrap text-foreground"
                      >
                        <IconHome2 size={18} className="shrink-0 text-foreground" />
                        我的文件
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {currentLabel ? (
                    <>
                      <BreadcrumbSeparator className="shrink-0">
                        <IconChevronRight size={14} className="text-muted-foreground" />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem className="shrink-0">
                        <BreadcrumbPage className="whitespace-nowrap text-foreground">
                          {currentLabel}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : (
                    pathParts.map((part, index) => {
                      const folderPath = "/" + pathParts.slice(0, index + 1).join("/")
                      const toPath = `/app?folder=${encodeURIComponent(folderPath)}`
                      const isLast = index === pathParts.length - 1

                      return (
                        <React.Fragment key={`${part}-${index}`}>
                          <BreadcrumbSeparator className="shrink-0">
                            <IconChevronRight size={14} className="text-muted-foreground" />
                          </BreadcrumbSeparator>
                          <BreadcrumbItem className="shrink-0">
                            {isLast ? (
                              <BreadcrumbPage className="flex h-8 items-center whitespace-nowrap text-foreground" title={part}>
                                {part}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link
                                  to={toPath}
                                  className="flex h-8 items-center whitespace-nowrap text-muted-foreground"
                                  title={part}
                                >
                                  {part}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </React.Fragment>
                      )
                    })
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              <ButtonGroup className="hidden md:flex [&>[data-slot=dropdown-menu-trigger]]:flex [&>[data-slot=dropdown-menu-trigger]]:h-10 [&>[data-slot=dropdown-menu-trigger]]:items-center [&>[data-slot=dropdown-menu-trigger]]:gap-2 [&>[data-slot=dropdown-menu-trigger]]:bg-card [&>[data-slot=dropdown-menu-trigger]]:px-3.5 [&>[data-slot=dropdown-menu-trigger]]:text-sm [&>[data-slot=dropdown-menu-trigger]]:text-foreground [&>[data-slot=dropdown-menu-trigger]]:transition-colors [&>[data-slot=dropdown-menu-trigger]]:hover:bg-muted">
                <ViewSettingsPopover
                  viewMode={viewMode}
                  onViewModeChange={onViewModeChange}
                  thumbnailsEnabled={thumbnailsEnabled}
                  onThumbnailsChange={onThumbnailsChange}
                  pageSize={pageSize}
                  onPageSizeChange={onPageSizeChange}
                >
                  <button
                    type="button"
                    className="flex h-10 items-center gap-2 rounded-lg bg-card px-3.5 text-sm text-foreground transition-colors hover:bg-muted"
                  >
                    {viewMode === "grid" ? (
                      <IconLayoutGrid size={16} />
                    ) : (
                      <IconListDetails size={16} />
                    )}
                    视图
                  </button>
                </ViewSettingsPopover>

                <DropdownMenu>
                  <DropdownMenuTrigger className="flex h-10 items-center gap-2 rounded-lg bg-card px-3.5 text-sm text-foreground transition-colors hover:bg-muted">
                    <IconArrowsSort size={16} />
                    排序
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuRadioGroup
                      value={sortValue}
                      onValueChange={(value) => onSortChange(value as SortValue)}
                    >
                      {Object.entries(sortLabels).map(([value, label]) => (
                        <DropdownMenuRadioItem key={value} value={value}>
                          {label}
                        </DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </ButtonGroup>

              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-lg bg-card text-foreground transition-colors hover:bg-muted">
                  <IconDots size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="md:hidden">
                    <DropdownMenuItem
                      onClick={() =>
                        onViewModeChange(viewMode === "grid" ? "list" : "grid")
                      }
                    >
                      切换为{viewMode === "grid" ? "列表" : "网格"}视图
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onThumbnailsChange(!thumbnailsEnabled)}
                    >
                      {thumbnailsEnabled ? "关闭缩略图" : "开启缩略图"}
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() =>
                        onSortChange(
                          sortValue === "updated-desc"
                            ? "name-asc"
                            : "updated-desc"
                        )
                      }
                    >
                      切换排序 ({sortLabels[sortValue]})
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </div>
                  <DropdownMenuItem onClick={onCreateFolder}>
                    新建文件夹
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={!canPaste} onClick={onPaste}>
                    粘贴
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onRefresh}>刷新内容</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode
  label: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-primary transition-colors hover:bg-primary/10"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}

