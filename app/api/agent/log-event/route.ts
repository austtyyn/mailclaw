import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/agent";
import { applyBounceToScore, applyDeliveryToScore } from "@/lib/health";
import * as res from "@/lib/api/responses";

const EVENT_TYPES = [
  "sent",
  "delivered",
  "soft_bounce",
  "hard_bounce",
  "reply",
] as const;

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const result = await validateApiKey(authHeader);

  if (!result.valid || !result.context) {
    return res.unauthorized(result.error ?? "Unauthorized");
  }

  const body = await request.json().catch(() => ({}));
  const eventType = body?.event_type;
  const mailboxId = body?.mailbox_id;
  const messageId = body?.message_id;
  const payload = body?.payload ?? {};

  if (
    !eventType ||
    !mailboxId ||
    typeof eventType !== "string" ||
    typeof mailboxId !== "string"
  ) {
    return res.badRequest("event_type and mailbox_id are required");
  }

  if (!EVENT_TYPES.includes(eventType as (typeof EVENT_TYPES)[number])) {
    return res.badRequest(
      `event_type must be one of: ${EVENT_TYPES.join(", ")}`
    );
  }

  const supabase = await createServiceRoleClient();

  const { data: mailbox } = await supabase
    .from("mailboxes")
    .select("id, workspace_id, health_score")
    .eq("id", mailboxId)
    .eq("workspace_id", result.context.workspaceId)
    .single();

  if (!mailbox) return res.notFound("Mailbox not found");

  const { error: eventError } = await supabase
    .from("deliverability_events")
    .insert({
      message_id: messageId ?? null,
      mailbox_id: mailboxId,
      event_type: eventType,
      payload: typeof payload === "object" && payload !== null ? payload : {},
    });

  if (eventError) return res.serverError(eventError.message);

  let newScore = mailbox.health_score;
  if (eventType === "hard_bounce") {
    newScore = applyBounceToScore(mailbox.health_score, "hard_bounce");
  } else if (eventType === "soft_bounce") {
    newScore = applyBounceToScore(mailbox.health_score, "soft_bounce");
  } else if (eventType === "delivered") {
    newScore = applyDeliveryToScore(mailbox.health_score);
  }

  if (newScore !== mailbox.health_score) {
    await supabase
      .from("mailboxes")
      .update({ health_score: newScore })
      .eq("id", mailboxId);
  }

  const deliveryStatusMap: Record<string, string> = {
    sent: "sent",
    delivered: "delivered",
    soft_bounce: "soft_bounce",
    hard_bounce: "hard_bounce",
  };
  const deliveryStatus = deliveryStatusMap[eventType];

  if (messageId && deliveryStatus) {
    const { data: msg } = await supabase
      .from("messages")
      .select("id")
      .eq("id", messageId)
      .eq("workspace_id", result.context.workspaceId)
      .single();

    if (msg) {
      const update: { delivery_status: string; sent_at?: string } = {
        delivery_status: deliveryStatus,
      };
      if (eventType === "sent") {
        update.sent_at = new Date().toISOString();
      }
      await supabase.from("messages").update(update).eq("id", messageId);
    }
  }

  return res.ok({
    ok: true,
    event_type: eventType,
    health_score_updated: newScore !== mailbox.health_score,
  });
}
