import { SidebarNav } from '@/components/sidebar-nav';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <SidebarNav />
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
