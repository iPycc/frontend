import { useState, ReactNode } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
  IconPhoto,
  IconVideo,
  IconMusic,
  IconFileText,
  IconDatabase,
  IconTrash,
  IconShare,
  IconActivity,
  IconChevronDown,
  IconChevronRight,
  IconUsers,
  IconFolderFilled,
  IconLink,
  IconDownload,
  IconBuildingStore,
  IconMessageCircle
} from "@tabler/icons-react";
import { cn } from "../lib/utils";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupContent,
} from "./ui/sidebar";

export function AppSidebar() {
  const [isTreeOpen, setIsTreeOpen] = useState(true);

  return (
    <Sidebar>
      <SidebarHeader className="px-5 py-5">
        <div className="flex items-center gap-2 text-blue-500 mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" className="w-8 h-8">
            <circle cx="12" cy="12" r="12" fill="#0ea5e9" />
            <path d="M6.5 9 v 4 a 5.5 5.5 0 0 0 11 0 v -4" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" fill="none" />
            <path d="M12 11.5 L14.5 14 L12 16.5 L9.5 14 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" />
            <g opacity="0.6">
              <path d="M12 5.5 L14.5 8 L12 10.5 L9.5 8 Z" fill="#ffffff" stroke="#ffffff" strokeWidth="1" strokeLinejoin="round" />
            </g>
          </svg>
          <span className="font-bold text-xl tracking-tight text-foreground">Cloudrave</span>
        </div>

        <button className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-accent transition-colors border border-border/50">
          <div className="flex items-center gap-3">
            <div className="bg-blue-500 text-white p-1.5 rounded-lg shadow-sm">
              <IconDatabase size={20} />
            </div>
            <div className="text-left">
              <div className="font-medium text-sm text-foreground">
                My Main Bucket
              </div>
              <div className="text-xs text-muted-foreground">Tencent COS</div>
            </div>
          </div>
          <IconChevronDown size={16} className="text-muted-foreground" />
        </button>
      </SidebarHeader>

      <SidebarContent className="px-2 custom-scrollbar">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center group">
                  <button 
                    onClick={() => setIsTreeOpen(!isTreeOpen)}
                    className="p-1 text-muted-foreground hover:bg-accent rounded-md shrink-0 transition-colors"
                  >
                    {isTreeOpen ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
                  </button>
                  <SidebarItem to="/app" icon={<IconFolderFilled size={18} className="text-blue-500" />} label="我的文件" exact />
                </div>
                
                {isTreeOpen && (
                  <div className="pl-6 mt-1 space-y-1">
                    <SidebarItem to="/app?folder=new" icon={<IconFolderFilled size={18} className="text-slate-400" />} label="新建文件夹" />
                    <SidebarItem to="/app?folder=public" icon={<IconFolderFilled size={18} className="text-blue-400" />} label="Public 公共目录" />
                  </div>
                )}
              </SidebarMenuItem>

              <div className="pt-2 space-y-1">
                <SidebarItem to="/app?type=image" icon={<IconPhoto size={18} />} label="图片" />
                <SidebarItem to="/app?type=video" icon={<IconVideo size={18} />} label="视频" />
                <SidebarItem to="/app?type=audio" icon={<IconMusic size={18} />} label="音乐" />
                <SidebarItem to="/app?type=document" icon={<IconFileText size={18} />} label="文档" />
              </div>

              <div className="pt-4 space-y-1">
                <SidebarItem to="/app/shared-with-me" icon={<IconUsers size={18} />} label="与我共享" />
                <SidebarItem to="/app/recycle" icon={<IconTrash size={18} />} label="回收站" />
              </div>

              <div className="pt-4 space-y-1">
                <SidebarItem to="/app/shares" icon={<IconShare size={18} />} label="我的分享" />
                <SidebarItem to="/app/mounts" icon={<IconLink size={18} />} label="连接与挂载" />
                <SidebarItem to="/app/tasks" icon={<IconActivity size={18} />} label="后台任务" />
                <SidebarItem to="/app/offline" icon={<IconDownload size={18} />} label="离线下载" />
                <SidebarItem to="/app/store" icon={<IconBuildingStore size={18} />} label="商店" />
              </div>

              <div className="pt-4 space-y-1">
                <SidebarItem to="/app/discussions" icon={<IconMessageCircle size={18} />} label="Discussions" />
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 border-t border-border/50">
        <div className="flex justify-between text-xs mb-2">
          <span className="text-muted-foreground">已用空间</span>
          <span className="text-blue-500 font-medium cursor-pointer hover:underline">
            详情
          </span>
        </div>
        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-blue-500 w-[45%] rounded-full" />
        </div>
        <div className="mt-2 text-xs text-muted-foreground">
          45.2 GB / 100 GB
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}

function SidebarItem({
  to,
  icon,
  label,
  exact,
}: {
  to: string;
  icon: ReactNode;
  label: string;
  exact?: boolean;
}) {
  const location = useLocation();
  
  const isActive = exact 
    ? location.pathname + location.search === to 
    : (location.pathname + location.search).startsWith(to);

  return (
    <SidebarMenuButton render={<NavLink to={to} className="flex items-center gap-3" />} isActive={isActive} className={cn("h-9", isActive ? "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20" : "")}>
      {icon}
      <span>{label}</span>
    </SidebarMenuButton>
  );
}
