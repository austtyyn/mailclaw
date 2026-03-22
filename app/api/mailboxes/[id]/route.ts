import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import {
  isValidUuid,
  isValidWarmupStatus,
  isValidProvider,
} from "@/lib/validation";
import {
  DAILY_LIMIT_MIN,
  DAILY_LIMIT_MAX,
  ALLOWED_PROVIDERS,
} from "@/lib/api/constants";
import { unwrapRelation } from "@/lib/utils";
import { evaluateDomainReadiness } from "@/lib/domain-readiness";
import * as res from "@/lib/api/responses";

export const PATCH = (
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) =>
  withAuth(async ({ workspaceId }) => {
    const { id } = await params;
    if (!isValidUuid(id)) return res.badRequest("Invalid mailbox ID");

    const body = await request.json().catch(() => ({}));
    const supabase = await createClient();

    const { data: mailbox, error: fetchError } = await supabase
      .from("mailboxes")
      .select(`*, domains (id, status, spf_status, dkim_status, dmarc_status, health_score)`)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !mailbox) return res.notFound("Mailbox not found");

    if (body.sending_enabled === true) {
      const domain = unwrapRelation(mailbox.domains);
      const readiness = evaluateDomainReadiness({
        spf_status: domain?.spf_status ?? null,
        dkim_status: domain?.dkim_status ?? null,
        dmarc_status: domain?.dmarc_status ?? null,
        health_score: domain?.health_score ?? null,
      });
      if (!domain || !readiness.can_send) {
        return res.badRequest(
          readiness.reasons[0] ??
            "Domain must be verified before enabling sending. Run domain verification first."
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (typeof body.sending_enabled === "boolean") {
      updates.sending_enabled = body.sending_enabled;
    }
    if (
      typeof body.daily_limit === "number" &&
      body.daily_limit >= DAILY_LIMIT_MIN &&
      body.daily_limit <= DAILY_LIMIT_MAX
    ) {
      updates.daily_limit = body.daily_limit;
    }
    if (typeof body.warmup_status === "string" && isValidWarmupStatus(body.warmup_status)) {
      updates.warmup_status = body.warmup_status;
    }
    if (typeof body.provider === "string") {
      const providerRaw = body.provider.trim().toLowerCase().slice(0, 64);
      if (!isValidProvider(providerRaw, ALLOWED_PROVIDERS)) {
        return res.badRequest(
          `Provider must be one of: ${ALLOWED_PROVIDERS.join(", ")}`
        );
      }
      updates.provider = providerRaw;
    }

    if (Object.keys(updates).length === 0) {
      return res.ok(mailbox);
    }

    const { data: updated, error } = await supabase
      .from("mailboxes")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) return res.serverError(error.message);
    return res.ok(updated);
  });
