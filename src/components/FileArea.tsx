import React from "react";
import {
  IconFolderFilled,
  IconFileText,
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileZip,
  IconCode,
} from "@tabler/icons-react";
import { cn } from "../lib/utils";
import { motion } from "motion/react";

interface FileItem {
  id: string;
  name: string;
  type: "folder" | "file";
  ext?: string;
}

const mockData: FileItem[] = [
  { id: "1", name: "设计资源", type: "folder" },
  { id: "2", name: "文档", type: "folder" },
  { id: "3", name: "公共分享", type: "folder" },
  { id: "4", name: "Alpha 项目", type: "folder" },
  { id: "5", name: "cloudrave-ui.fig", type: "file", ext: "fig" },
  { id: "6", name: "presentation.pptx", type: "file", ext: "pptx" },
  { id: "7", name: "vacation.mp4", type: "file", ext: "mp4" },
  { id: "8", name: "notes.txt", type: "file", ext: "txt" },
  { id: "9", name: "archive.zip", type: "file", ext: "zip" },
  { id: "10", name: "index.tsx", type: "file", ext: "tsx" },
  { id: "11", name: "logo.png", type: "file", ext: "png" },
  { id: "12", name: "background.jpg", type: "file", ext: "jpg" },
];

const getFileIcon = (ext?: string) => {
  switch (ext?.toLowerCase()) {
    case "png":
    case "jpg":
    case "jpeg":
    case "fig":
      return <IconPhoto size={20} className="text-blue-400" />;
    case "mp4":
    case "mov":
      return <IconVideo size={20} className="text-purple-400" />;
    case "mp3":
    case "wav":
      return <IconMusic size={20} className="text-pink-400" />;
    case "zip":
    case "rar":
    case "tar":
      return <IconFileZip size={20} className="text-orange-400" />;
    case "tsx":
    case "ts":
    case "js":
    case "html":
    case "css":
      return <IconCode size={20} className="text-green-400" />;
    default:
      return <IconFileText size={20} className="text-gray-400" />;
  }
};

interface FileAreaProps {
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onClearSelection?: () => void;
}

export function FileArea({ selectedIds, onToggleSelect, onClearSelection }: FileAreaProps) {
  const folders = mockData.filter((item) => item.type === "folder");
  const files = mockData.filter((item) => item.type === "file");

  const handleBackgroundClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && onClearSelection) {
      onClearSelection();
    }
  };

  return (
    <div 
      className="flex-1 overflow-y-auto p-6 bg-background rounded-xl shadow-sm border border-border/50 custom-scrollbar flex flex-col"
      onClick={handleBackgroundClick}
    >
      <div 
        className="max-w-7xl mx-auto w-full flex-1 space-y-8"
        onClick={handleBackgroundClick}
      >
        {/* Folders Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            文件夹
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {folders.map((folder, index) => (
              <FileCard
                key={folder.id}
                item={folder}
                selected={selectedIds.includes(folder.id)}
                onClick={() => onToggleSelect(folder.id)}
                index={index}
              />
            ))}
          </div>
        </section>

        {/* Files Section */}
        <section>
          <h2 className="text-sm font-medium text-muted-foreground mb-4">
            文件
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {files.map((file, index) => (
              <FileCard
                key={file.id}
                item={file}
                selected={selectedIds.includes(file.id)}
                onClick={() => onToggleSelect(file.id)}
                index={index}
              />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function FileCard({
  item,
  selected,
  onClick,
  index,
}: {
  key?: string | number;
  item: FileItem;
  selected: boolean;
  onClick: () => void;
  index: number;
}) {
  return (
    <motion.button
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: "spring",
        stiffness: 300,
        damping: 24,
        delay: index * 0.05,
      }}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        "h-12 w-full flex items-center gap-3 px-4 rounded-xl transition-all duration-200",
        "bg-card text-card-foreground hover:bg-accent hover:text-accent-foreground shadow-sm",
        selected
          ? "border border-blue-500 ring-1 ring-blue-500 bg-blue-50/50 dark:bg-blue-900/20"
          : "border border-border/50",
      )}
    >
      <div className="flex-shrink-0">
        {item.type === "folder" ? (
          <IconFolderFilled size={20} className="text-slate-400" />
        ) : (
          getFileIcon(item.ext)
        )}
      </div>
      <span className="text-sm font-medium truncate">{item.name}</span>
    </motion.button>
  );
}
