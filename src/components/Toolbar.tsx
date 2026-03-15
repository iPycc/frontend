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
  IconHome2,
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
import { type SortValue, type ViewMode } from "@/lib/mock-data"

interface ToolbarProps {
  pathParts?: string[]
  selectedCount: number
  onClearSelection: () => void
  viewMode: ViewMode
  onViewModeChange: (value: ViewMode) => void
  sortValue: SortValue
  onSortChange: (value: SortValue) => void
  onRefresh: () => void
  onCreateFolder: () => void
  onPaste: () => void
  canPaste: boolean
  onCopy: () => void
  onCut: () => void
  onDelete: () => void
  onRename: () => void
  onShare: () => void
  onDownload: () => void
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
  onRefresh,
  onCreateFolder,
  onPaste,
  canPaste,
  onCopy,
  onCut,
  onDelete,
  onRename,
  onShare,
  onDownload,
  currentLabel,
}: ToolbarProps) {
  return (
    <div className="app-panel relative flex h-14 shrink-0 items-center justify-between overflow-hidden rounded-[22px] border border-[#d9d9d9] px-4 shadow-[0_1px_0_rgba(255,255,255,0.8)_inset] dark:border-white/10 dark:shadow-none">
      <AnimatePresence mode="wait">
        {selectedCount > 0 ? (
          <motion.div
            key="selected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-between bg-[#eef8ff] px-4"
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-full p-1.5 text-primary transition-colors hover:bg-primary/10"
              >
                <IconX size={18} />
              </button>
              <span className="text-sm text-primary">
                已选择 {selectedCount} 个对象
              </span>
            </div>
            <div className="hidden items-center gap-2 md:flex">
              <ActionButton icon={<IconCopy size={18} />} label="复制" onClick={onCopy} />
              <ActionButton icon={<IconCut size={18} />} label="剪切" onClick={onCut} />
              <ActionButton icon={<IconEdit size={18} />} label="重命名" onClick={onRename} />
              <ActionButton icon={<IconDownload size={18} />} label="下载" onClick={onDownload} />
              <ActionButton icon={<IconShare3 size={18} />} label="分享" onClick={onShare} />
              <ActionButton icon={<IconX size={18} />} label="删除" onClick={onDelete} />
            </div>
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-full p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <IconDots size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl">
                  <DropdownMenuItem onClick={onCopy}>复制</DropdownMenuItem>
                  <DropdownMenuItem onClick={onCut}>剪切</DropdownMenuItem>
                  <DropdownMenuItem onClick={onRename}>重命名</DropdownMenuItem>
                  <DropdownMenuItem onClick={onDownload}>下载</DropdownMenuItem>
                  <DropdownMenuItem onClick={onShare}>分享</DropdownMenuItem>
                  <DropdownMenuItem onClick={onDelete}>删除</DropdownMenuItem>
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
            className="flex w-full items-center justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <Breadcrumb>
                <BreadcrumbList className="gap-1.5 text-[15px]">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link
                        to="/app"
                        className="flex h-8 items-center gap-2 text-[#3b3b3b] dark:text-[#f0f0f0]"
                      >
                        <IconHome2 size={18} className="text-[#3b3b3b] dark:text-[#f0f0f0]" />
                        我的文件
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {currentLabel ? (
                    <>
                      <BreadcrumbSeparator>
                        <IconChevronRight size={14} className="text-[#8b8b8b] dark:text-[#7f7f7f]" />
                      </BreadcrumbSeparator>
                      <BreadcrumbItem>
                        <BreadcrumbPage className="text-[#3b3b3b] dark:text-[#f0f0f0]">
                          {currentLabel}
                        </BreadcrumbPage>
                      </BreadcrumbItem>
                    </>
                  ) : (
                    pathParts.map((part, index) => {
                      const toPath = `/app/${pathParts
                        .slice(0, index + 1)
                        .map(encodeURIComponent)
                        .join("/")}`
                      const isLast = index === pathParts.length - 1
                      const isMobileHidden = !isLast && pathParts.length > 1

                      return (
                        <div
                          className={isMobileHidden ? "hidden sm:contents" : "contents"}
                          key={`${part}-${index}`}
                        >
                          <BreadcrumbSeparator>
                            <IconChevronRight size={14} className="text-[#8b8b8b] dark:text-[#7f7f7f]" />
                          </BreadcrumbSeparator>
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage className="text-[#3b3b3b] dark:text-[#f0f0f0]">
                                {part}
                              </BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link
                                  to={toPath}
                                  className="flex h-8 items-center text-[#666666] dark:text-[#9c9c9c]"
                                >
                                  {part}
                                </Link>
                              </BreadcrumbLink>
                            )}
                          </BreadcrumbItem>
                        </div>
                      )
                    })
                  )}
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger className="hidden h-10 items-center gap-2 rounded-[14px] border border-[#d8d8d8] bg-white px-3.5 text-sm text-[#4e4e4e] transition-colors hover:bg-[#f5f5f5] md:flex dark:border-white/10 dark:bg-[#171717] dark:text-[#d1d1d1] dark:hover:bg-[#1d1d1d]">
                  {viewMode === "grid" ? (
                    <IconLayoutGrid size={16} />
                  ) : (
                    <IconListDetails size={16} />
                  )}
                  视图
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl">
                  <DropdownMenuRadioGroup
                    value={viewMode}
                    onValueChange={(value) =>
                      onViewModeChange(value as ViewMode)
                    }
                  >
                    <DropdownMenuRadioItem value="grid">网格</DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="list">列表</DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="hidden h-10 items-center gap-2 rounded-[14px] border border-[#d8d8d8] bg-white px-3.5 text-sm text-[#4e4e4e] transition-colors hover:bg-[#f5f5f5] md:flex dark:border-white/10 dark:bg-[#171717] dark:text-[#d1d1d1] dark:hover:bg-[#1d1d1d]">
                  <IconArrowsSort size={16} />
                  排序
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl">
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

              <DropdownMenu>
                <DropdownMenuTrigger className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-[#d8d8d8] bg-white text-[#4e4e4e] transition-colors hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-[#171717] dark:text-[#d1d1d1] dark:hover:bg-[#1d1d1d]">
                  <IconDots size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="rounded-2xl">
                  <div className="md:hidden">
                    <DropdownMenuItem
                      onClick={() =>
                        onViewModeChange(viewMode === "grid" ? "list" : "grid")
                      }
                    >
                      切换为{viewMode === "grid" ? "列表" : "网格"}视图
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
