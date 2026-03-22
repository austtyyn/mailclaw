import { redirect } from "next/navigation";
import { requireAuth, getOrCreateDefaultWorkspace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingState } from "@/lib/onboarding";
import { DashboardNav } from "@/components/dashboard-nav";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const supabase = await createClient();
  const state = await getOnboardingState(supabase, workspace.id);

  if (state.complete) {
    redirect("/dashboard");
  }

  return (
    <>
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </>
  );
}
