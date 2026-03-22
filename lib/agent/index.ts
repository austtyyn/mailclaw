import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyApiKey, extractBearerKey } from "@/lib/api-keys";
import { unwrapRelation } from "@/lib/utils";
import { getTodayStart } from "@/lib/utils";
import {
  MIN_MAILBOX_HEALTH_SCORE,
  MIN_DOMAIN_HEALTH_SCORE,
} from "@/lib/api/constants";
import { evaluateDomainReadiness } from "@/lib/domain-readiness";
import { evaluateMailboxEligibility } from "@/lib/mailbox-eligibility";
import { scoreToStatus } from "@/lib/health";

export interface ApiKeyContext {
  workspaceId: string;
  keyId: string;
}

export async function validateApiKey(
  authHeader: string | null
): Promise<{ valid: boolean; context?: ApiKeyContext; error?: string }> {
  const rawKey = extractBearerKey(authHeader);
  if (!rawKey) {
    return { valid: false, error: "Missing or invalid Authorization header" };
  }

  const supabase = await createServiceRoleClient();
  const { data: keys } = await supabase
    .from("agent_api_keys")
    .select("id, workspace_id, hashed_key");

  if (!keys) {
    return { valid: false, error: "Unable to verify key" };
  }

  for (const key of keys) {
    if (verifyApiKey(rawKey, key.hashed_key)) {
      return {
        valid: true,
        context: {
          workspaceId: key.workspace_id,
          keyId: key.id,
        },
      };
    }
  }

  return { valid: false, error: "Invalid API key" };
}

export interface BestSenderResult {
  mailbox: {
    id: string;
    email: string;
    domain_id: string;
    health_score: number;
  } | null;
  reason: string;
  explanation: {
    total_candidates: number;
    filtered_by: string[];
    selected_reason?: string;
  };
}

export async function getBestSender(workspaceId: string): Promise<BestSenderResult> {
  const supabase = await createServiceRoleClient();
  const todayStart = getTodayStart();

  const { data: mailboxes, error } = await supabase
    .from("mailboxes")
    .select(`
      id,
      email,
      domain_id,
      health_score,
      daily_limit,
      sending_enabled,
      domains (id, status, spf_status, dkim_status, dmarc_status, health_score)
    `)
    .eq("workspace_id", workspaceId)
    .eq("sending_enabled", true);

  if (error) {
    return {
      mailbox: null,
      reason: "Database error",
      explanation: { total_candidates: 0, filtered_by: [] },
    };
  }

  const candidates = mailboxes ?? [];
  const filtered_by: string[] = [];

  const eligible: Array<{
    mb: (typeof candidates)[0];
    domain: NonNullable<ReturnType<typeof unwrapRelation>>;
    todayCount: number;
    remaining: number;
  }> = [];

  for (const mb of candidates) {
    const domain = unwrapRelation(mb.domains);
    if (!domain) {
      filtered_by.push(`${mb.email}: domain not found`);
      continue;
    }
    const readiness = evaluateDomainReadiness({
      spf_status: domain.spf_status,
      dkim_status: domain.dkim_status,
      dmarc_status: domain.dmarc_status,
      health_score: domain.health_score,
    });
    if (!readiness.can_send) {
      filtered_by.push(`${mb.email}: domain not ready (${readiness.reasons[0] ?? "unknown"})`);
      continue;
    }
    if ((domain.health_score ?? 0) < MIN_DOMAIN_HEALTH_SCORE) {
      filtered_by.push(
        `${mb.email}: domain health ${domain.health_score ?? 0} < ${MIN_DOMAIN_HEALTH_SCORE}`
      );
      continue;
    }
    if (mb.health_score < MIN_MAILBOX_HEALTH_SCORE) {
      filtered_by.push(
        `${mb.email}: mailbox health ${mb.health_score} < ${MIN_MAILBOX_HEALTH_SCORE}`
      );
      continue;
    }

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("mailbox_id", mb.id)
      .eq("direction", "outbound")
      .gte("created_at", todayStart);

    const todayCount = count ?? 0;
    const remaining = Math.max(0, mb.daily_limit - todayCount);

    if (remaining <= 0) {
      filtered_by.push(`${mb.email}: daily limit reached (${todayCount}/${mb.daily_limit})`);
      continue;
    }

    eligible.push({ mb, domain, todayCount, remaining });
  }

  if (eligible.length === 0) {
    return {
      mailbox: null,
      reason:
        candidates.length === 0
          ? "No mailboxes with sending enabled"
          : "All eligible mailboxes filtered out or at daily limit",
      explanation: {
        total_candidates: candidates.length,
        filtered_by,
      },
    };
  }

  eligible.sort((a, b) => {
    if (b.mb.health_score !== a.mb.health_score) {
      return b.mb.health_score - a.mb.health_score;
    }
    return a.todayCount - b.todayCount;
  });

  const selected = eligible[0];
  return {
    mailbox: {
      id: selected.mb.id,
      email: selected.mb.email,
      domain_id: selected.mb.domain_id,
      health_score: selected.mb.health_score,
    },
    reason: "Selected healthiest mailbox with remaining daily capacity",
    explanation: {
      total_candidates: candidates.length,
      filtered_by,
      selected_reason: `Health ${selected.mb.health_score}, ${selected.remaining} sends remaining today (least used among ties)`,
    },
  };
}

export interface SendPermissionResult {
  allow: boolean;
  denial_reasons: string[];
  remaining_daily_capacity?: number;
}

export async function checkSendPermission(
  workspaceId: string,
  mailboxId: string
): Promise<SendPermissionResult> {
  const supabase = await createServiceRoleClient();
  const todayStart = getTodayStart();

  const { data: mailbox, error } = await supabase
    .from("mailboxes")
    .select(`
      id,
      sending_enabled,
      health_score,
      daily_limit,
      domains (id, status, spf_status, dkim_status, dmarc_status, health_score)
    `)
    .eq("id", mailboxId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !mailbox) {
    return { allow: false, denial_reasons: ["MAILBOX_NOT_FOUND"] };
  }

  const domain = unwrapRelation(mailbox.domains);

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("mailbox_id", mailboxId)
    .eq("direction", "outbound")
    .gte("created_at", todayStart);

  const todayCount = count ?? 0;

  const eligibility = evaluateMailboxEligibility(
    {
      id: mailbox.id,
      sending_enabled: mailbox.sending_enabled,
      health_score: mailbox.health_score,
      daily_limit: mailbox.daily_limit,
    },
    domain
      ? {
          spf_status: domain.spf_status,
          dkim_status: domain.dkim_status,
          dmarc_status: domain.dmarc_status,
          health_score: domain.health_score,
        }
      : null,
    { outbound_count: todayCount }
  );

  if (eligibility.eligible_to_send) {
    return {
      allow: true,
      denial_reasons: [],
      remaining_daily_capacity: eligibility.remaining_daily_capacity,
    };
  }

  return {
    allow: false,
    denial_reasons: eligibility.denial_reasons,
    remaining_daily_capacity: eligibility.remaining_daily_capacity,
  };
}

export interface DomainHealthSummary {
  domain_id: string;
  domain: string;
  status: string;
  health_score: number;
  health_status: string;
  readiness: {
    can_warmup: boolean;
    can_send: boolean;
    reasons: string[];
  };
  authentication: {
    spf: string;
    dkim: string;
    dmarc: string;
  };
  verification_issues: string[];
  verification_recommendations: string[];
  dns_last_checked_at: string | null;
}

export async function getDomainHealthSummary(
  workspaceId: string,
  domainId?: string
): Promise<{ domains: DomainHealthSummary[] }> {
  const supabase = await createServiceRoleClient();

  let query = supabase
    .from("domains")
    .select(
      "id, domain, status, spf_status, dkim_status, dmarc_status, health_score, dns_last_checked_at, verification_issues, verification_recommendations"
    )
    .eq("workspace_id", workspaceId);

  if (domainId) query = query.eq("id", domainId);

  const { data: domains, error } = await query;

  if (error) {
    return { domains: [] };
  }

  const summaries: DomainHealthSummary[] = (domains ?? []).map((d) => {
    const readiness = evaluateDomainReadiness({
      spf_status: d.spf_status,
      dkim_status: d.dkim_status,
      dmarc_status: d.dmarc_status,
      health_score: d.health_score,
    });

    return {
      domain_id: d.id,
      domain: d.domain,
      status: d.status,
      health_score: d.health_score ?? 100,
      health_status: scoreToStatus(d.health_score ?? 100),
      readiness: {
        can_warmup: readiness.can_warmup,
        can_send: readiness.can_send,
        reasons: readiness.reasons,
      },
      authentication: {
        spf: d.spf_status ?? "unknown",
        dkim: d.dkim_status ?? "unknown",
        dmarc: d.dmarc_status ?? "unknown",
      },
      verification_issues: Array.isArray(d.verification_issues)
        ? d.verification_issues
        : [],
      verification_recommendations: Array.isArray(d.verification_recommendations)
        ? d.verification_recommendations
        : [],
      dns_last_checked_at: d.dns_last_checked_at,
    };
  });

  return { domains: summaries };
}
