import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import { isValidUuid, isValidWarmupStatus } from "@/lib/validation";
import { DAILY_LIMIT_MIN, DAILY_LIMIT_MAX } from "@/lib/api/constants";
import { unwrapRelation } from "@/lib/utils";
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
      .select(`*, domains (id, status)`)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !mailbox) return res.notFound("Mailbox not found");

    if (body.sending_enabled === true) {
      const domain = unwrapRelation(mailbox.domains);
      if (!domain || domain.status !== "verified") {
        return res.badRequest(
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
