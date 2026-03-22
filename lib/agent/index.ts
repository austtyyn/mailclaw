import { createServiceRoleClient } from "@/lib/supabase/server";
import { verifyApiKey, extractBearerKey } from "@/lib/api-keys";
import { unwrapRelation } from "@/lib/utils";
import { getTodayStart } from "@/lib/utils";
import {
  MIN_MAILBOX_HEALTH_SCORE,
  MIN_DOMAIN_HEALTH_SCORE,
} from "@/lib/api/constants";

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

export async function getBestSender(workspaceId: string): Promise<{
  mailbox: {
    id: string;
    email: string;
    domain_id: string;
    health_score: number;
  } | null;
  reason?: string;
}> {
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
      domains (id, health_score, status)
    `)
    .eq("workspace_id", workspaceId)
    .eq("sending_enabled", true)
    .gte("health_score", MIN_MAILBOX_HEALTH_SCORE)
    .order("health_score", { ascending: false });

  if (error) {
    return { mailbox: null, reason: "Database error" };
  }
  if (!mailboxes?.length) {
    return {
      mailbox: null,
      reason:
        "No eligible mailboxes: need sending_enabled=true, health_score>=60, verified domain",
    };
  }

  for (const mb of mailboxes) {
    const domain = unwrapRelation(mb.domains);
    if (
      !domain ||
      domain.status !== "verified" ||
      (domain.health_score ?? 0) < MIN_DOMAIN_HEALTH_SCORE
    )
      continue;

    const { count } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("mailbox_id", mb.id)
      .eq("direction", "outbound")
      .gte("created_at", todayStart);

    if ((count ?? 0) >= mb.daily_limit) continue;

    return {
      mailbox: {
        id: mb.id,
        email: mb.email,
        domain_id: mb.domain_id,
        health_score: mb.health_score,
      },
    };
  }

  return {
    mailbox: null,
    reason: "All eligible mailboxes have reached their daily send limit",
  };
}

export async function checkSendPermission(
  workspaceId: string,
  mailboxId: string
): Promise<{ allowed: boolean; reason: string }> {
  const supabase = await createServiceRoleClient();
  const todayStart = getTodayStart();

  const { data: mailbox, error } = await supabase
    .from("mailboxes")
    .select(`
      id,
      sending_enabled,
      health_score,
      daily_limit,
      domains (id, status, health_score)
    `)
    .eq("id", mailboxId)
    .eq("workspace_id", workspaceId)
    .single();

  if (error || !mailbox) {
    return { allowed: false, reason: "MAILBOX_NOT_FOUND" };
  }

  if (!mailbox.sending_enabled) {
    return { allowed: false, reason: "SENDING_DISABLED" };
  }

  if (mailbox.health_score < MIN_MAILBOX_HEALTH_SCORE) {
    return {
      allowed: false,
      reason: `HEALTH_BELOW_THRESHOLD: mailbox score ${mailbox.health_score} (min ${MIN_MAILBOX_HEALTH_SCORE})`,
    };
  }

  const domain = unwrapRelation(mailbox.domains);
  if (!domain) {
    return { allowed: false, reason: "DOMAIN_NOT_FOUND" };
  }
  if (domain.status !== "verified") {
    return {
      allowed: false,
      reason: `DOMAIN_NOT_VERIFIED: status "${domain.status}" (requires "verified")`,
    };
  }
  if ((domain.health_score ?? 0) < MIN_DOMAIN_HEALTH_SCORE) {
    return {
      allowed: false,
      reason: `DOMAIN_HEALTH_LOW: domain score ${domain.health_score ?? 0} (min ${MIN_DOMAIN_HEALTH_SCORE})`,
    };
  }

  const { count } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("mailbox_id", mailboxId)
    .eq("direction", "outbound")
    .gte("created_at", todayStart);

  if ((count ?? 0) >= mailbox.daily_limit) {
    return {
      allowed: false,
      reason: `DAILY_LIMIT_REACHED: ${count ?? 0}/${mailbox.daily_limit} sends today`,
    };
  }

  return { allowed: true, reason: "OK" };
}
