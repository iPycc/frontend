import { ReactNode } from "react";
import { 
  IconChevronRight, IconLayoutGrid, IconSortAscending, IconRefresh,
  IconCopy, IconCut, IconTrash, IconDownload, IconEdit, IconX,
  IconHome, IconLink, IconDots
} from "@tabler/icons-react";
import { cn } from "../lib/utils";
import { motion, AnimatePresence } from "motion/react";

interface ToolbarProps {
  selectedCount: number;
  onClearSelection: () => void;
}

export function Toolbar({ selectedCount, onClearSelection }: ToolbarProps) {
  return (
    <div className="h-14 bg-background rounded-xl shadow-sm border border-border/50 px-4 flex items-center justify-between relative overflow-hidden shrink-0">
      <AnimatePresence mode="wait">
        {selectedCount > 0 ? (
          <motion.div
            key="selected"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="absolute inset-0 bg-blue-50/50 dark:bg-blue-900/10 px-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <button 
                onClick={onClearSelection}
                className="p-1.5 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md text-blue-600 dark:text-blue-400 transition-colors"
              >
                <IconX size={18} />
              </button>
              <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
                已选择 {selectedCount} 个对象
              </span>
            </div>
            
            <div className="flex items-center gap-1">
              <ActionButton icon={<IconCopy size={18} />} label="复制" />
              <ActionButton icon={<IconCut size={18} />} label="剪切" />
              <ActionButton icon={<IconTrash size={18} />} label="删除" />
              <ActionButton icon={<IconDownload size={18} />} label="下载" />
              <ActionButton icon={<IconEdit size={18} />} label="重命名" />
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="default"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="w-full flex items-center justify-between"
          >
            {/* Breadcrumbs */}
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <IconHome size={18} className="text-muted-foreground" />
              <span>我的文件</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border/50">
                <IconRefresh size={18} />
              </button>
              <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border/50">
                <IconLink size={18} />
              </button>
              <button className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-transparent hover:border-border/50">
                <IconDots size={18} />
              </button>
              
              <div className="w-px h-4 bg-border mx-1" />
              
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-border/50 ml-1">
                <IconLayoutGrid size={16} />
                视图
              </button>
              <button className="flex items-center gap-1 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition-colors border border-border/50">
                <IconSortAscending size={16} />
                排序
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ActionButton({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-md transition-colors">
      {icon}
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}
