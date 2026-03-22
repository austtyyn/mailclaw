import { requireAuth, getOrCreateDefaultWorkspace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingState } from "@/lib/onboarding";
import { DashboardNav } from "@/components/dashboard-nav";
import { OnboardingGuard } from "@/components/onboarding-guard";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const supabase = await createClient();
  const onboardingState = await getOnboardingState(supabase, workspace.id);

  return (
    <OnboardingGuard isOnboardingComplete={onboardingState.complete}>
      <DashboardNav />
      <main className="max-w-6xl mx-auto px-4 py-8">{children}</main>
    </OnboardingGuard>
  );
}
