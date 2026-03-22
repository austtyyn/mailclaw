import type { DnsStatus } from "@/lib/types";

export type HealthStatus = "healthy" | "caution" | "restricted" | "paused";

export interface HealthThresholds {
  healthy: number;
  caution: number;
  restricted: number;
}

const DEFAULT_THRESHOLDS: HealthThresholds = {
  healthy: 80,
  caution: 60,
  restricted: 40,
};

export function scoreToStatus(
  score: number,
  thresholds: HealthThresholds = DEFAULT_THRESHOLDS
): HealthStatus {
  if (score >= thresholds.healthy) return "healthy";
  if (score >= thresholds.caution) return "caution";
  if (score >= thresholds.restricted) return "restricted";
  return "paused";
}

export function calculateDomainHealthFromAuth(
  spf: DnsStatus,
  dkim: DnsStatus,
  dmarc: DnsStatus
): number {
  let score = 100;
  if (spf === "fail" || spf === "unknown") score -= 25;
  if (dkim === "fail" || dkim === "unknown") score -= 25;
  if (dmarc === "fail" || dmarc === "unknown") score -= 15;
  return Math.max(0, score);
}

export function applyBounceToScore(
  currentScore: number,
  bounceType: "hard_bounce" | "soft_bounce"
): number {
  if (bounceType === "hard_bounce") {
    return Math.max(0, currentScore - 25);
  }
  return Math.max(0, currentScore - 10);
}

export function applyDeliveryToScore(currentScore: number): number {
  return Math.min(100, currentScore + 1);
}
