/**
 * Onboarding progress logic - derived from workspace state.
 * No separate onboarding table; completion is computed from domains and mailboxes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import {
  evaluateDomainReadiness,
  type DomainReadiness,
} from "@/lib/domain-readiness";

export type OnboardingStepStatus = "complete" | "current" | "blocked" | "not_started";

export interface OnboardingStep {
  id: string;
  title: string;
  status: OnboardingStepStatus;
  description?: string;
}

export interface OnboardingState {
  complete: boolean;
  currentStepId: string;
  steps: OnboardingStep[];
  readyDomains: { id: string; domain: string }[];
  primaryDomain: {
    id: string;
    domain: string;
    spf_status: string;
    dkim_status: string;
    dmarc_status: string;
  } | null;
  domainReadiness: DomainReadiness | null;
  mailboxCount: number;
}

const STEP_IDS = [
  "add_domain",
  "check_spf",
  "check_dkim",
  "check_dmarc",
  "verify_readiness",
  "add_mailbox",
  "complete",
] as const;

export async function getOnboardingState(
  supabase: SupabaseClient,
  workspaceId: string
): Promise<OnboardingState> {
  const { data: domains } = await supabase
    .from("domains")
    .select("id, domain, spf_status, dkim_status, dmarc_status, health_score")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: true });

  const { count: mailboxCount } = await supabase
    .from("mailboxes")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId);

  const domainCount = domains?.length ?? 0;
  const primaryDomain = domains?.[0]
    ? {
        id: domains[0].id,
        domain: domains[0].domain,
        spf_status: domains[0].spf_status,
        dkim_status: domains[0].dkim_status,
        dmarc_status: domains[0].dmarc_status,
      }
    : null;

  const readyDomains: { id: string; domain: string }[] = [];
  for (const d of domains ?? []) {
    const r = evaluateDomainReadiness({
      spf_status: d.spf_status,
      dkim_status: d.dkim_status,
      dmarc_status: d.dmarc_status,
      health_score: d.health_score,
    });
    if (r.can_warmup) readyDomains.push({ id: d.id, domain: d.domain });
  }

  const readiness = primaryDomain
    ? evaluateDomainReadiness({
        spf_status: domains![0].spf_status,
        dkim_status: domains![0].dkim_status,
        dmarc_status: domains![0].dmarc_status,
        health_score: domains![0].health_score,
      })
    : null;

  const spfPass = primaryDomain && domains![0].spf_status === "pass";
  const dkimAcceptable =
    primaryDomain && domains![0].dkim_status !== "fail"; // pass or unknown OK for warmup
  const dmarcOk =
    primaryDomain && domains![0].dmarc_status !== "fail"; // pass or unknown
  const canWarmup = readiness?.can_warmup ?? false;
  const hasMailbox = (mailboxCount ?? 0) >= 1;

  const hasReadyDomain = readyDomains.length >= 1;

  const steps: OnboardingStep[] = [
    {
      id: "add_domain",
      title: "Add domain",
      status: domainCount >= 1 ? "complete" : "current",
      description: "Add the domain you want to send from",
    },
    {
      id: "check_spf",
      title: "Check SPF",
      status: !primaryDomain
        ? "blocked"
        : spfPass
          ? "complete"
          : "current",
      description: "Verify your SPF record is configured",
    },
    {
      id: "check_dkim",
      title: "Check DKIM",
      status: !primaryDomain || !spfPass
        ? "blocked"
        : dkimAcceptable
          ? "complete"
          : "current",
      description: "Verify your DKIM setup",
    },
    {
      id: "check_dmarc",
      title: "Check DMARC",
      status: !primaryDomain || !spfPass || !dkimAcceptable
        ? "blocked"
        : dmarcOk
          ? "complete"
          : "current",
      description: "Add a DMARC record for deliverability",
    },
    {
      id: "verify_readiness",
      title: "Verify domain readiness",
      status: !primaryDomain
        ? "blocked"
        : canWarmup
          ? "complete"
          : "current",
      description: "Ensure your domain is ready for warmup",
    },
    {
      id: "add_mailbox",
      title: "Add mailbox",
      status: !hasReadyDomain
        ? "blocked"
        : hasMailbox
          ? "complete"
          : "current",
      description: "Add an email address to warm up",
    },
    {
      id: "complete",
      title: "Ready for warmup",
      status: hasMailbox && canWarmup ? "complete" : "blocked",
      description: "You're all set to start warming up",
    },
  ];

  // Set "current" for the first incomplete step; others stay complete/blocked
  let foundCurrent = false;
  const adjustedSteps = steps.map((s) => {
    if (s.status === "current") {
      if (!foundCurrent) {
        foundCurrent = true;
        return s;
      }
      return { ...s, status: "blocked" as const };
    }
    if (s.status === "blocked" && !foundCurrent) {
      foundCurrent = true;
      return { ...s, status: "current" as const };
    }
    return s;
  });

  const complete = hasMailbox && canWarmup;
  const currentStepId = adjustedSteps.find((s) => s.status === "current")?.id ?? "complete";

  return {
    complete,
    currentStepId,
    steps: adjustedSteps,
    primaryDomain,
    readyDomains,
    domainReadiness: readiness ?? null,
    mailboxCount: mailboxCount ?? 0,
  };
}

export function isOnboardingComplete(state: OnboardingState): boolean {
  return state.complete;
}
