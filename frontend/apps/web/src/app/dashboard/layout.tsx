import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { SessionProvider } from "@/lib/session-context";
import { requireSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Server-side session gate - redirect unauthenticated users.
  const session = await requireSession();
  if (!session) redirect("/login");

  return (
    <SessionProvider>
      <DashboardShell>
        <Sidebar />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Topbar initialSession={session} />
          <main className="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
            {children}
          </main>
        </div>
      </DashboardShell>
    </SessionProvider>
  );
}
