export type DomainStatus = "pending" | "verified" | "failed" | "paused";
export type DnsStatus = "pass" | "fail" | "unknown";
export type WarmupStatus = "pending" | "warming" | "active" | "paused";
export type HealthStatus = "healthy" | "caution" | "restricted" | "paused";

export interface Domain {
  id: string;
  workspace_id: string;
  domain: string;
  status: DomainStatus;
  spf_status: DnsStatus;
  dkim_status: DnsStatus;
  dmarc_status: DnsStatus;
  dns_last_checked_at: string | null;
  health_score: number;
  created_at: string;
}

export interface Mailbox {
  id: string;
  workspace_id: string;
  domain_id: string;
  email: string;
  provider: string;
  provider_account_ref: string | null;
  warmup_status: WarmupStatus;
  daily_limit: number;
  health_score: number;
  sending_enabled: boolean;
  created_at: string;
}

export interface WarmupSchedule {
  id: string;
  mailbox_id: string;
  schedule_date: string;
  target_send_count: number;
  actual_send_count: number;
  stage: string;
  status: string;
  created_at: string;
}
