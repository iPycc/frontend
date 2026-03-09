import { Outlet } from "react-router-dom";
import { Navbar } from "./Navbar";
import { AppSidebar } from "./Sidebar";
import { SidebarProvider } from "./ui/sidebar";

export function MainLayout() {
  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background text-foreground">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 dark:bg-zinc-950">
          <Navbar />
          <main className="flex-1 flex flex-col min-w-0 p-4 gap-4 overflow-hidden">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
