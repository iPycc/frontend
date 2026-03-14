import { type ReactNode } from "react"
import { Link } from "react-router-dom"
import {
  IconCopy,
  IconCut,
  IconDots,
  IconDownload,
  IconEdit,
  IconFolderPlus,
  IconHome,
  IconLayoutGrid,
  IconListDetails,
  IconRefresh,
  IconShare3,
  IconSortAscending,
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
    <div className="app-panel relative flex h-14 shrink-0 items-center justify-between overflow-hidden rounded-2xl border border-border/60 px-4 shadow-sm">
      <AnimatePresence mode="wait">
        {selectedCount > 0 ? (
          <motion.div
            key="selected"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15, ease: "easeInOut" }}
            className="absolute inset-0 flex items-center justify-between bg-primary/5 px-4"
          >
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={onClearSelection}
                className="rounded-md p-1.5 text-primary transition-colors hover:bg-primary/10"
              >
                <IconX size={18} />
              </button>
              <span className="text-sm font-medium text-primary">
                已选择 {selectedCount} 个对象
              </span>
            </div>
            <div className="hidden items-center gap-1 md:flex">
              <ActionButton
                icon={<IconCopy size={18} />}
                label="复制"
                onClick={onCopy}
              />
              <ActionButton
                icon={<IconCut size={18} />}
                label="剪切"
                onClick={onCut}
              />
              <ActionButton
                icon={<IconEdit size={18} />}
                label="重命名"
                onClick={onRename}
              />
              <ActionButton
                icon={<IconDownload size={18} />}
                label="下载"
                onClick={onDownload}
              />
              <ActionButton
                icon={<IconShare3 size={18} />}
                label="分享"
                onClick={onShare}
              />
              <ActionButton
                icon={<IconX size={18} />}
                label="删除"
                onClick={onDelete}
              />
            </div>
            <div className="md:hidden">
              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <IconDots size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
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
                <BreadcrumbList className="gap-1 sm:gap-1.5">
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link to="/app" className="flex h-6 items-center gap-1.5">
                        <IconHome
                          size={18}
                          className="mr-1 text-muted-foreground"
                        />
                        我的文件
                      </Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  {currentLabel ? (
                    <>
                      <BreadcrumbSeparator />
                      <BreadcrumbItem>
                        <BreadcrumbPage>{currentLabel}</BreadcrumbPage>
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
                        <div className={isMobileHidden ? "hidden sm:contents" : "contents"} key={`${part}-${index}`}>
                          <BreadcrumbSeparator />
                          <BreadcrumbItem>
                            {isLast ? (
                              <BreadcrumbPage>{part}</BreadcrumbPage>
                            ) : (
                              <BreadcrumbLink asChild>
                                <Link
                                  to={toPath}
                                  className="flex h-6 items-center"
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

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={onRefresh}
                className="rounded-md border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-border/50 hover:bg-accent hover:text-foreground"
              >
                <IconRefresh size={18} />
              </button>
              <button
                type="button"
                onClick={onCreateFolder}
                className="rounded-md border border-transparent p-1.5 text-muted-foreground transition-colors hover:border-border/50 hover:bg-accent hover:text-foreground"
              >
                <IconFolderPlus size={18} />
              </button>

              <DropdownMenu>
                <DropdownMenuTrigger className="hidden md:flex items-center gap-1 rounded-md border border-border/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  {viewMode === "grid" ? (
                    <IconLayoutGrid size={16} />
                  ) : (
                    <IconListDetails size={16} />
                  )}
                  视图
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuRadioGroup
                    value={viewMode}
                    onValueChange={(value) =>
                      onViewModeChange(value as ViewMode)
                    }
                  >
                    <DropdownMenuRadioItem value="grid">
                      网格
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="list">
                      列表
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger className="hidden md:flex items-center gap-1 rounded-md border border-border/50 px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <IconSortAscending size={16} />
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

              <DropdownMenu>
                <DropdownMenuTrigger className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                  <IconDots size={18} />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <div className="md:hidden">
                    <DropdownMenuItem
                      onClick={() => onViewModeChange(viewMode === "grid" ? "list" : "grid")}
                    >
                      切换为{viewMode === "grid" ? "列表" : "网格"}视图
                    </DropdownMenuItem>
                    <DropdownMenuItem
                       onClick={() => onSortChange(sortValue === "updated-desc" ? "name-asc" : "updated-desc")}
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
                  <DropdownMenuItem onClick={onRefresh}>
                    刷新内容
                  </DropdownMenuItem>
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
      className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
    >
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  )
}
