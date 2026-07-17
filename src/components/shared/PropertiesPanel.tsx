import * as React from "react"
import { createPortal } from "react-dom"
import {
  IconX,
  IconHome2,
  IconPlus,
  IconClock,
  IconPhoto,
  IconLock,
} from "@tabler/icons-react"
import { Files } from "lucide-react"
import { AnimatePresence, motion } from "motion/react"

import { type FileNode } from "@/lib/models"
import { cn } from "@/lib/utils"
import { FileGlyph } from "@/components/file-area/FileGlyph"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { useIsMobile } from "@/hooks/use-mobile"

/* ------------------------------------------------------------------ */
/*  Context                                                           */
/* ------------------------------------------------------------------ */

interface PropertiesPanelCtx {
  node: FileNode | null
  nodes: FileNode[]
  bucketName: string
  formatBytes: (size?: number) => string
  open: (node: FileNode) => void
  openMulti: (nodes: FileNode[]) => void
  toggle: (node: FileNode) => void
  close: () => void
}

const PropertiesPanelContext = React.createContext<PropertiesPanelCtx>({
  node: null,
  nodes: [],
  bucketName: "",
  formatBytes: () => "-",
  open: () => {},
  openMulti: () => {},
  toggle: () => {},
  close: () => {},
})

export function usePropertiesPanel() {
  return React.useContext(PropertiesPanelContext)
}

export function PropertiesPanelProvider({
  bucketName,
  formatBytes,
  children,
}: {
  bucketName: string
  formatBytes: (size?: number) => string
  children: React.ReactNode
}) {
  const [node, setNode] = React.useState<FileNode | null>(null)
  const [nodes, setNodes] = React.useState<FileNode[]>([])
  const sameNodeIds = React.useCallback((left: FileNode[], right: FileNode[]) => {
    return left.length === right.length && left.every((item, index) => item.id === right[index]?.id)
  }, [])
  const openPanel = React.useCallback((n: FileNode) => {
    setNode((current) => (current?.id === n.id ? current : n))
    setNodes((current) => (current.length === 1 && current[0]?.id === n.id ? current : [n]))
  }, [])
  const openMulti = React.useCallback((ns: FileNode[]) => {
    const nextNode = ns[0] ?? null
    setNode((current) => (current?.id === nextNode?.id ? current : nextNode))
    setNodes((current) => (sameNodeIds(current, ns) ? current : ns))
  }, [sameNodeIds])
  const togglePanel = React.useCallback((n: FileNode) => {
    setNode((current) => (current?.id === n.id ? null : n))
    setNodes((current) => (current.length === 1 && current[0]?.id === n.id ? [] : [n]))
  }, [])
  const closePanel = React.useCallback(() => {
    setNode((current) => (current === null ? current : null))
    setNodes((current) => (current.length === 0 ? current : []))
  }, [])

  const value = React.useMemo<PropertiesPanelCtx>(
    () => ({ node, nodes, bucketName, formatBytes, open: openPanel, openMulti, toggle: togglePanel, close: closePanel }),
    [node, nodes, bucketName, formatBytes, openPanel, openMulti, togglePanel, closePanel]
  )

  return (
    <PropertiesPanelContext.Provider value={value}>
      {children}
    </PropertiesPanelContext.Provider>
  )
}

/* ------------------------------------------------------------------ */
/*  Reusable panel content                                            */
/* ------------------------------------------------------------------ */

type PanelTab = "details" | "activity"

export interface PropertiesPanelContentProps {
  node: FileNode
  nodes?: FileNode[]
  bucketName: string
  formatBytes: (size?: number) => string
  onClose: () => void
  dark?: boolean
}

export function PropertiesPanelContent({
  node,
  nodes,
  bucketName,
  formatBytes,
  onClose,
  dark = false,
}: PropertiesPanelContentProps) {
  const [tab, setTab] = React.useState<PanelTab>("details")
  const multiNodes = nodes && nodes.length > 1 ? nodes : null

  React.useEffect(() => {
    setTab("details")
  }, [node.id, multiNodes?.length])

  return (
    <div
      className={cn(
        "flex h-full w-full flex-col",
        dark
          ? "border-l border-white/10 bg-[#1a1a1a]"
          : "md:rounded-xl border border-border bg-card shadow-sm dark:border-white/10"
      )}
    >
      {/* Sticky header: icon + name + close */}
      <div className="shrink-0 px-3 pt-3 pb-1.5 md:px-4 md:pt-4 md:pb-2">
        <div className="flex items-center gap-2 md:gap-3">
          {multiNodes ? (
            <>
              <Files size={20} className={cn("shrink-0 md:size-6", dark ? "text-white/70" : "text-muted-foreground")} />
              <p className={cn("flex-1 truncate text-sm font-medium md:text-base", dark ? "text-white/90" : "text-foreground")}>
                已选择 &ldquo;{multiNodes[0].name} 等{multiNodes.length}个{multiNodes[0].kind === "folder" ? "文件夹" : "文件"}&rdquo;
              </p>
            </>
          ) : (
            <>
              <div className="flex shrink-0 items-center justify-center">
                <FileGlyph item={node} />
              </div>
              <p className={cn("flex-1 truncate text-sm font-medium md:text-base", dark ? "text-white/90" : "text-foreground")} title={node.name}>
                {node.name}
              </p>
            </>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            className={cn("shrink-0", dark ? "text-white/60 hover:bg-white/10 hover:text-white" : "")}
            onClick={onClose}
          >
            <IconX size={18} />
          </Button>
        </div>
      </div>

      {/* Tabs – one row, two tabs */}
      <div className={cn("flex shrink-0 border-b px-3 md:px-4", dark ? "border-white/10" : "border-border")}>
        <TabButton active={tab === "details"} onClick={() => setTab("details")} dark={dark}>
          详情
        </TabButton>
        <TabButton active={tab === "activity"} onClick={() => setTab("activity")} dark={dark}>
          活动
        </TabButton>
      </div>

      {/* Scrollable content */}
      <div className="custom-scrollbar flex-1 overflow-y-auto px-3 py-3 md:px-4 md:py-4">
        {tab === "details" ? (
          multiNodes ? (
            <MultiDetailsTab nodes={multiNodes} bucketName={bucketName} formatBytes={formatBytes} dark={dark} />
          ) : (
            <DetailsTab node={node} bucketName={bucketName} formatBytes={formatBytes} dark={dark} />
          )
        ) : (
          <ActivityTab dark={dark} />
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Main-layout wrapper (animated aside)                              */
/* ------------------------------------------------------------------ */

export function PropertiesPanel() {
  const { node, nodes, bucketName, formatBytes, close } = usePropertiesPanel()
  const isOpen = !!node
  const isMobile = useIsMobile()

  // Keep a snapshot of the last valid data so content doesn't vanish mid-animation
  const snapshotRef = React.useRef<{
    node: FileNode
    nodes: FileNode[]
  } | null>(null)
  
  // Update snapshot only when panel is actually open with new data
  if (node) {
    snapshotRef.current = { node, nodes }
  }
  const display = node ? { node, nodes } : snapshotRef.current

  if (isMobile) {
    return createPortal(
      <AnimatePresence>
        {isOpen && display && (
          <motion.div
            key="mobile-props"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
            className="fixed inset-0 z-[100] flex flex-col bg-background"
          >
            <PropertiesPanelContent
              node={display.node}
              nodes={display.nodes}
              bucketName={bucketName}
              formatBytes={formatBytes}
              onClose={close}
            />
          </motion.div>
        )}
      </AnimatePresence>,
      document.body
    )
  }

  return (
    <aside
      data-state={isOpen ? "open" : "closed"}
      className={cn(
        // 一次性切换占位宽度，避免 auto-fill 文件网格在宽度动画期间逐帧重排
        "relative shrink-0 overflow-hidden",
        isOpen ? "w-[340px] ml-1.5 md:ml-2" : "w-0 ml-0"
      )}
    >
      {/* 面板内容独立滑入；文件区域只在开关时重排一次 */}
      <div
        className={cn(
          "absolute inset-y-0 left-0 w-[340px] transition-transform duration-200 ease-linear",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {display ? (
          <PropertiesPanelContent
            node={display.node}
            nodes={display.nodes}
            bucketName={bucketName}
            formatBytes={formatBytes}
            onClose={close}
          />
        ) : null}
      </div>
    </aside>
  )
}

/* ------------------------------------------------------------------ */
/*  Details tab (single file)                                         */
/* ------------------------------------------------------------------ */

function DetailsTab({
  node,
  bucketName,
  formatBytes,
  dark,
}: {
  node: FileNode
  bucketName: string
  formatBytes: (size?: number) => string
  dark: boolean
}) {
  const isImage = node.mediaType === "image"
  const isVideo = node.mediaType === "video"
  const hasPreview = isImage || isVideo

  const fg = dark ? "text-white/90" : "text-foreground"
  const fgMuted = dark ? "text-white/50" : "text-muted-foreground"
  const borderCls = dark ? "border-white/10" : "border-border"

  return (
    <div className="space-y-3 md:space-y-5">
      {hasPreview && node.preview ? (
        <div className={cn("overflow-hidden rounded-lg border", borderCls)}>
          <img src={node.preview} alt={node.name} className="h-36 w-full object-cover md:h-44" draggable={false} />
        </div>
      ) : null}

      {hasPreview ? (
        <div className="space-y-3 md:space-y-4">
          <h3 className={cn("text-sm font-medium mb-1.5 md:text-base md:mb-2", fg)}>媒体信息</h3>
          <InfoRow icon={<IconClock size={16} />} label="拍摄时间" value={node.updatedAt} dark={dark} />
          {isImage ? (
            <InfoRow icon={<IconPhoto size={16} />} label="分辨率" value="1179 × 1159" dark={dark} />
          ) : null}
        </div>
      ) : null}

      <div className="space-y-2 md:space-y-3">
        <h3 className={cn("text-sm font-medium mb-1.5 md:text-base md:mb-2", fg)}>自定义属性</h3>
        <button
          type="button"
          className={cn(
            "flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-sm md:py-2.5 md:text-base transition-colors",
            dark
              ? "border-white/20 text-white/50 hover:border-white/40 hover:text-white/70"
              : "border-border text-muted-foreground hover:border-foreground/30 hover:text-foreground"
          )}
        >
          <IconPlus size={18} />
          添加
        </button>
      </div>

      <Separator className={dark ? "bg-white/10" : ""} />

      <div className="space-y-3 md:space-y-4">
        <h3 className={cn("mb-1.5 text-sm font-medium md:mb-2 md:text-base", fg)}>基本信息</h3>
        <Field label="类型" value={node.kind === "folder" ? "文件夹" : (node.ext?.toUpperCase() || "文件")} dark={dark} />
        <div>
          <p className={cn("mb-0.5 text-xs font-medium md:mb-1 md:text-sm", dark ? "text-white/60" : "text-muted-foreground")}>所在目录</p>
          <div className={cn("inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-sm md:px-2.5 md:py-1 md:text-base", dark ? "bg-white/10 text-white/90" : "bg-muted text-foreground")}>
            <IconHome2 size={16} />
            我的文件
          </div>
        </div>
        <Field label="创建于" value={node.updatedAt} dark={dark} />
        <Field label="修改于" value={node.updatedAt} dark={dark} />
        <Field label="大小" value={formatBytes(node.size)} dark={dark} />
        <Field label="占用空间" value={formatBytes(node.size)} dark={dark} />
        <div>
          <p className={cn("mb-0.5 text-xs font-medium md:mb-1 md:text-sm", dark ? "text-white/60" : "text-muted-foreground")}>加密</p>
          <div className={cn("flex items-center gap-1.5 text-sm md:text-base", dark ? "text-white/90" : "text-foreground")}>
            <IconLock size={16} className={dark ? "text-white/50" : "text-muted-foreground"}/>
            未加密
          </div>
        </div>
        <Field label="存储策略" value={bucketName} dark={dark} />
        <Field label="我的权限" value="拥有此文件" dark={dark} />
      </div>

      <Separator className={dark ? "bg-white/10" : ""} />

      <div className="space-y-2 md:space-y-3">
        <h3 className={cn("text-sm font-medium md:text-base", fg)}>数据</h3>
        <div className={cn("overflow-hidden rounded-lg border text-sm md:text-base", borderCls)}>
          <div className={cn("grid grid-cols-2 border-b px-2.5 py-2 font-medium md:px-3 md:py-2.5", borderCls, dark ? "bg-white/5 text-white/80" : "bg-muted/50 text-foreground")}>
            <span>类型</span>
            <span className="text-right">大小</span>
          </div>
          <div className={cn("grid grid-cols-2 px-2.5 py-2 md:px-3 md:py-2.5", dark ? "text-white/70" : fgMuted)}>
            <span>文件数据和历史版本</span>
            <span className="text-right">{formatBytes(node.size)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Multi-select details tab                                          */
/* ------------------------------------------------------------------ */

function MultiDetailsTab({
  nodes,
  bucketName,
  formatBytes,
  dark,
}: {
  nodes: FileNode[]
  bucketName: string
  formatBytes: (size?: number) => string
  dark: boolean
}) {
  const [calculatedSize, setCalculatedSize] = React.useState<string | null>(null)
  const fg = dark ? "text-white/90" : "text-foreground"
  const fgMuted = dark ? "text-white/50" : "text-muted-foreground"

  const folderCount = nodes.filter((n) => n.kind === "folder").length
  const fileCount = nodes.filter((n) => n.kind === "file").length

  const handleCalculateSize = () => {
    const total = nodes.reduce((sum, n) => sum + (n.size ?? 0), 0)
    setCalculatedSize(formatBytes(total))
  }

  React.useEffect(() => {
    setCalculatedSize(null)
  }, [nodes.length])

  return (
    <div className="space-y-3 md:space-y-5">
      <div className="space-y-3 md:space-y-4">
        <h3 className={cn("mb-1.5 text-sm font-medium md:mb-2 md:text-base", fg)}>选择概览</h3>
        <Field label="选中数量" value={`${nodes.length} 个项目`} dark={dark} />
        {folderCount > 0 && <Field label="文件夹" value={`${folderCount} 个`} dark={dark} />}
        {fileCount > 0 && <Field label="文件" value={`${fileCount} 个`} dark={dark} />}
        <div>
          <p className={cn("mb-0.5 text-xs font-medium md:mb-1 md:text-sm", dark ? "text-white/60" : "text-muted-foreground")}>大小</p>
          {calculatedSize ? (
            <p className={cn("text-base break-all", dark ? "text-white/90" : "text-foreground")}>{calculatedSize}</p>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-sm"
              onClick={handleCalculateSize}
            >
              计算
            </Button>
          )}
        </div>
        <Field label="存储策略" value={bucketName} dark={dark} />
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Activity tab                                                      */
/* ------------------------------------------------------------------ */

function ActivityTab({ dark }: { dark: boolean }) {
  return (
    <div className={cn("flex h-32 items-center justify-center text-sm", dark ? "text-white/40" : "text-muted-foreground")}>
      暂无活动记录
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  Small helpers                                                     */
/* ------------------------------------------------------------------ */

function TabButton({
  active,
  onClick,
  dark,
  children,
}: {
  active: boolean
  onClick: () => void
  dark?: boolean
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex-1 px-4 py-2.5 text-center text-sm transition-colors",
        active
          ? dark ? "text-blue-400" : "text-primary"
          : dark ? "text-white/40 hover:text-white/70" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
      {active ? (
        <span className={cn("absolute inset-x-0 bottom-0 h-0.5 rounded-full", dark ? "bg-blue-400" : "bg-primary")} />
      ) : null}
    </button>
  )
}

function Field({ label, value, dark }: { label: string; value: React.ReactNode; dark?: boolean }) {
  return (
    <div>
      <p className={cn("mb-0.5 text-xs font-medium md:mb-1 md:text-sm", dark ? "text-white/60" : "text-muted-foreground")}>{label}</p>
      <div className={cn("text-sm break-all md:text-base", dark ? "text-white/90" : "text-foreground")}>{value}</div>
    </div>
  )
}

function InfoRow({
  icon,
  label,
  value,
  dark,
}: {
  icon: React.ReactNode
  label: string
  value: string
  dark?: boolean
}) {
  return (
    <div>
      <div className={cn("mb-0.5 flex items-center gap-1.5 text-xs font-medium md:mb-1 md:text-sm", dark ? "text-white/60" : "text-muted-foreground")}>
        {icon}
        <span>{label}</span>
      </div>
      <div className={cn("text-sm break-all md:text-base", dark ? "text-white/90" : "text-foreground")}>{value}</div>
    </div>
  )
}

