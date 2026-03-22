/**
 * Mailbox eligibility - central function to evaluate if a mailbox can send or warmup.
 */

import { MIN_MAILBOX_HEALTH_SCORE } from "@/lib/api/constants";
import { evaluateDomainReadiness } from "@/lib/domain-readiness";
import type { DomainInput } from "@/lib/domain-readiness";

export interface MailboxEligibility {
  eligible_to_send: boolean;
  eligible_for_warmup: boolean;
  denial_reasons: string[];
  remaining_daily_capacity: number;
}

interface MailboxInput {
  id: string;
  sending_enabled: boolean;
  health_score: number;
  daily_limit: number;
  warmup_status?: string;
}

interface TodayStats {
  outbound_count: number;
}

/**
 * Evaluates mailbox eligibility for sending and warmup.
 */
export function evaluateMailboxEligibility(
  mailbox: MailboxInput,
  domain: DomainInput | null,
  todayStats: TodayStats
): MailboxEligibility {
  const denial_reasons: string[] = [];

  if (!domain) {
    return {
      eligible_to_send: false,
      eligible_for_warmup: false,
      denial_reasons: ["Domain not found"],
      remaining_daily_capacity: 0,
    };
  }

  const readiness = evaluateDomainReadiness(domain);

  if (!mailbox.sending_enabled) {
    denial_reasons.push("Sending is disabled for this mailbox");
  }

  if (mailbox.health_score < MIN_MAILBOX_HEALTH_SCORE) {
    denial_reasons.push(
      `Health score ${mailbox.health_score} below minimum ${MIN_MAILBOX_HEALTH_SCORE}`
    );
  }

  if (!readiness.can_send) {
    denial_reasons.push(...readiness.reasons.filter((r) => !r.startsWith("Domain is ready")));
  }

  const used = todayStats.outbound_count;
  const remaining = Math.max(0, mailbox.daily_limit - used);
  if (remaining === 0 && used > 0) {
    denial_reasons.push(`Daily limit reached (${used}/${mailbox.daily_limit})`);
  }

  const eligible_to_send =
    mailbox.sending_enabled &&
    mailbox.health_score >= MIN_MAILBOX_HEALTH_SCORE &&
    readiness.can_send &&
    remaining > 0;

  const eligible_for_warmup =
    readiness.can_warmup &&
    mailbox.health_score >= MIN_MAILBOX_HEALTH_SCORE;

  return {
    eligible_to_send,
    eligible_for_warmup,
    denial_reasons,
    remaining_daily_capacity: remaining,
  };
}
