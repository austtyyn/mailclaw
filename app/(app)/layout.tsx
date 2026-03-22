import { requireAuth } from "@/lib/auth";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireAuth();

  return (
    <>
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
