/**
 * Domain readiness rules - decides if a domain can warmup or send.
 * Central function used by mailboxes, agent, and UI.
 */

import type { DnsStatus } from "@/lib/types";
import {
  MIN_DOMAIN_HEALTH_SCORE,
  HEALTH_STATUS_THRESHOLDS,
} from "@/lib/api/constants";
import { scoreToStatus } from "@/lib/health";

export interface DomainReadiness {
  can_warmup: boolean;
  can_send: boolean;
  reasons: string[];
  health_status: string;
}

export interface DomainInput {
  spf_status: DnsStatus | null;
  dkim_status: DnsStatus | null;
  dmarc_status: DnsStatus | null;
  health_score: number | null;
  status?: string;
}

/**
 * MVP rules:
 * - SPF must pass
 * - DMARC should exist (pass or at least not completely missing); if missing, not ready
 * - DKIM: pass or unknown OK; if fail, not ready
 * - Domain health above minimum threshold
 */
export function evaluateDomainReadiness(domain: DomainInput): DomainReadiness {
  const reasons: string[] = [];
  const spf = domain.spf_status ?? "unknown";
  const dkim = domain.dkim_status ?? "unknown";
  const dmarc = domain.dmarc_status ?? "unknown";
  const healthScore = domain.health_score ?? 100;

  if (spf !== "pass") {
    reasons.push(
      spf === "fail"
        ? "SPF record is missing or invalid"
        : "SPF verification inconclusive - add or fix SPF TXT record"
    );
  }

  if (dmarc === "fail") {
    reasons.push("DMARC record is missing - add DMARC at _dmarc subdomain");
  } else if (dmarc === "unknown") {
    reasons.push(
      "DMARC status unknown - add a DMARC record for better deliverability"
    );
  }

  if (dkim === "fail") {
    reasons.push(
      "DKIM is misconfigured - fix or remove invalid DKIM records"
    );
  }

  if (healthScore < MIN_DOMAIN_HEALTH_SCORE) {
    reasons.push(
      `Domain health score ${healthScore} is below minimum ${MIN_DOMAIN_HEALTH_SCORE}`
    );
  }

  const healthStatus = scoreToStatus(
    healthScore,
    HEALTH_STATUS_THRESHOLDS
  );

  const can_send =
    spf === "pass" &&
    dkim !== "fail" &&
    dmarc !== "fail" &&
    healthScore >= MIN_DOMAIN_HEALTH_SCORE;

  const can_warmup =
    spf === "pass" &&
    dkim !== "fail" &&
    (dmarc === "pass" || dmarc === "unknown") &&
    healthScore >= MIN_DOMAIN_HEALTH_SCORE;

  if (reasons.length === 0) {
    reasons.push(can_send ? "Domain is ready for sending" : "Domain is ready for warmup");
  }

  return {
    can_warmup,
    can_send,
    reasons,
    health_status: healthStatus,
  };
}
