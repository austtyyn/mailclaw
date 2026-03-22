import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, getOrCreateDefaultWorkspace } from "@/lib/auth";
import { getOnboardingState } from "@/lib/onboarding";
import { OnboardingProgress } from "@/components/onboarding/onboarding-progress";
import { OnboardingAddDomain } from "@/components/onboarding/onboarding-add-domain";
import { DomainVerificationStep } from "@/components/onboarding/domain-verification-step";
import { OnboardingAddMailbox } from "@/components/onboarding/onboarding-add-mailbox";
import { DomainReadinessSummary } from "@/components/domain-readiness-summary";

export default async function OnboardingPage() {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const supabase = await createClient();

  const state = await getOnboardingState(supabase, workspace.id);

  if (state.complete) {
    redirect("/dashboard");
  }

  const currentStep = state.steps.find((s) => s.status === "current");
  const stepId = state.currentStepId;

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Get your domain ready for sending</h1>
        <p className="text-slate-400 mt-1">
          Follow these steps to set up your domain and mailbox. We'll guide you
          through each one.
        </p>
      </div>

      <OnboardingProgress steps={state.steps} currentStepId={stepId} />

      <div className="rounded-lg border border-slate-700 bg-slate-800/30 p-6">
        <h2 className="font-semibold mb-2">{currentStep?.title ?? "Next step"}</h2>
        {currentStep?.description && (
          <p className="text-slate-400 text-sm mb-6">{currentStep.description}</p>
        )}

        {stepId === "add_domain" && (
          <div className="space-y-6">
            {!state.primaryDomain && (
              <div className="space-y-2">
                <p className="text-slate-300">
                  Welcome. To send email safely, you need to:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 text-sm">
                  <li>Add your sending domain</li>
                  <li>Configure SPF, DKIM, and DMARC DNS records</li>
                  <li>Add at least one mailbox</li>
                </ol>
                <p className="text-slate-400 text-sm">
                  We'll explain each step in plain English. Let's start by adding
                  your domain.
                </p>
              </div>
            )}
            <OnboardingAddDomain />
          </div>
        )}

        {(stepId === "check_spf" ||
          stepId === "check_dkim" ||
          stepId === "check_dmarc" ||
          stepId === "verify_readiness") &&
          state.primaryDomain && (
            <DomainVerificationStep
              domainId={state.primaryDomain.id}
              domainName={state.primaryDomain.domain}
              initialSpf={state.primaryDomain.spf_status}
              initialDkim={state.primaryDomain.dkim_status}
              initialDmarc={state.primaryDomain.dmarc_status}
            />
          )}

        {stepId === "add_mailbox" && (
          <div className="space-y-4">
            {state.readyDomains.length === 0 ? (
              <p className="text-slate-400">
                Your domain needs to pass SPF, DKIM, and DMARC checks before you
                can add mailboxes. Complete the DNS setup steps above, then
                re-check your records.
              </p>
            ) : (
              <OnboardingAddMailbox domains={state.readyDomains} />
            )}
          </div>
        )}

        {stepId === "complete" && (
          <div className="space-y-4">
            <p className="text-green-400 font-medium">
              You're all set. Your domain is ready and you've added a mailbox.
            </p>
            <p className="text-slate-400">
              You can now start warming up your mailbox and sending email. Head
              to the dashboard to see your domains and mailboxes.
            </p>
            <Link
              href="/dashboard"
              className="inline-block mt-4 px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500"
            >
              Go to dashboard
            </Link>
          </div>
        )}
      </div>

      {state.domainReadiness && (
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-2">
            Domain readiness
          </h3>
          <DomainReadinessSummary
            readiness={state.domainReadiness}
            domainName={state.primaryDomain?.domain}
            compact
          />
        </div>
      )}
    </div>
  );
}
