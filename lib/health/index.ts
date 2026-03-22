/**
 * Health scoring for domains and mailboxes.
 * Centralized logic used by agent, recalculate-health, and log-event.
 */

import type { DnsStatus } from "@/lib/types";
import { HEALTH_STATUS_THRESHOLDS } from "@/lib/api/constants";

export type HealthStatus = "healthy" | "caution" | "restricted" | "paused";

export interface HealthThresholds {
  healthy: number;
  caution: number;
  restricted: number;
}

export function scoreToStatus(
  score: number,
  thresholds: HealthThresholds = HEALTH_STATUS_THRESHOLDS
): HealthStatus {
  if (score >= thresholds.healthy) return "healthy";
  if (score >= thresholds.caution) return "caution";
  if (score >= thresholds.restricted) return "restricted";
  return "paused";
}

/**
 * Domain health from auth records (SPF, DKIM, DMARC).
 * Rules: missing SPF -20, missing DKIM -10, missing DMARC -15.
 * Failed checks get larger penalties than unknown.
 */
export function calculateDomainHealthFromAuth(
  spf: DnsStatus,
  dkim: DnsStatus,
  dmarc: DnsStatus
): number {
  let score = 100;

  if (spf === "fail") score -= 25;
  else if (spf === "unknown") score -= 20;
  if (dkim === "fail") score -= 25;
  else if (dkim === "unknown") score -= 10;
  if (dmarc === "fail") score -= 20;
  else if (dmarc === "unknown") score -= 15;

  return Math.max(0, Math.min(100, score));
}

/**
 * Adjust domain health based on average mailbox health.
 * Domain score is capped by mailbox aggregate when mailboxes exist.
 */
export function applyMailboxHealthToDomain(
  domainScore: number,
  avgMailboxHealth: number,
  mailboxCount: number
): number {
  if (mailboxCount === 0) return domainScore;
  const blended = Math.round(domainScore * 0.6 + avgMailboxHealth * 0.4);
  return Math.max(0, Math.min(100, blended));
}

/**
 * Mailbox bounce penalties: hard -20, soft -5.
 */
export function applyBounceToScore(
  currentScore: number,
  bounceType: "hard_bounce" | "soft_bounce"
): number {
  if (bounceType === "hard_bounce") {
    return Math.max(0, currentScore - 20);
  }
  return Math.max(0, currentScore - 5);
}

/**
 * Healthy delivery: +1 up to max 100.
 */
export function applyDeliveryToScore(currentScore: number): number {
  return Math.min(100, currentScore + 1);
}

/**
 * Penalty for sending while disabled (strong).
 */
export const SENDING_WHILE_DISABLED_PENALTY = 30;

/**
 * Small recovery when no recent issues (e.g. after 7 days clean).
 */
export const RECOVERY_PER_DAY_CLEAN = 1;
export const MAX_RECOVERY_DAYS = 7;
