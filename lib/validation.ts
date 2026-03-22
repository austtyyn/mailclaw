const DOMAIN_REGEX = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const WARMUP_STATUSES = ["pending", "warming", "active", "paused"] as const;

export function isValidDomain(domain: string): boolean {
  const cleaned = domain.replace(/^\.+/, "").toLowerCase();
  if (cleaned.length > 253) return false;
  return DOMAIN_REGEX.test(cleaned);
}

export function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  return EMAIL_REGEX.test(email);
}

export function isValidWarmupStatus(s: string): s is (typeof WARMUP_STATUSES)[number] {
  return WARMUP_STATUSES.includes(s as (typeof WARMUP_STATUSES)[number]);
}

export function isValidDateString(s: string): boolean {
  const d = new Date(s);
  return !isNaN(d.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export function isValidUuid(s: string): boolean {
  return UUID_REGEX.test(s);
}

export function isValidProvider(
  s: string,
  allowed: readonly string[]
): boolean {
  return allowed.includes(s.toLowerCase());
}
