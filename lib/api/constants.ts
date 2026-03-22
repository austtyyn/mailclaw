export const MIN_MAILBOX_HEALTH_SCORE = 60;
export const MIN_DOMAIN_HEALTH_SCORE = 40;

export const DAILY_LIMIT_MIN = 0;
export const DAILY_LIMIT_MAX = 1000;

export const API_KEY_NAME_MAX_LENGTH = 64;
export const PROVIDER_MAX_LENGTH = 64;
export const PROVIDER_ACCOUNT_REF_MAX_LENGTH = 256;

/** Allowed mailbox providers for MVP */
export const ALLOWED_PROVIDERS = [
  "manual",
  "gmail",
  "google",
  "google_workspace",
  "outlook",
  "microsoft",
  "microsoft365",
  "sendgrid",
  "resend",
  "postmark",
  "ses",
  "mailgun",
  "custom",
] as const;

export type AllowedProvider = (typeof ALLOWED_PROVIDERS)[number];

export const HEALTH_STATUS_THRESHOLDS = {
  healthy: 80,
  caution: 60,
  restricted: 40,
} as const;
