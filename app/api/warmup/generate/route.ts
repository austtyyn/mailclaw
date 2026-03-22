import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import { getWarmupTargetForDay, getStageForDay } from "@/lib/warmup";
import { isValidDateString } from "@/lib/validation";
import * as res from "@/lib/api/responses";

export const POST = (request: NextRequest) =>
  withAuth(async ({ workspaceId }) => {
    const body = await request.json().catch(() => ({}));
    const dateStr = body?.date ?? new Date().toISOString().split("T")[0];

    if (!isValidDateString(dateStr)) {
      return res.badRequest("Invalid date format (use YYYY-MM-DD)");
    }

    const supabase = await createClient();
    const { data: mailboxes } = await supabase
      .from("mailboxes")
      .select("id, created_at")
      .eq("workspace_id", workspaceId)
      .in("warmup_status", ["warming", "active", "pending"]);

    if (!mailboxes?.length) {
      return res.ok({
        generated: 0,
        message: "No mailboxes to generate schedules for",
      });
    }

    const targetDate = new Date(dateStr);
    const schedules = mailboxes
      .map((mb) => {
        const created = new Date(mb.created_at);
        const diffDays = Math.floor(
          (targetDate.getTime() - created.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (diffDays < 0) return null;
        return {
          mailbox_id: mb.id,
          schedule_date: dateStr,
          target_send_count: getWarmupTargetForDay(diffDays),
          stage: getStageForDay(diffDays),
          status: "pending",
        };
      })
      .filter((s): s is NonNullable<typeof s> => s !== null);

    const { data: inserted, error } = await supabase
      .from("warmup_schedules")
      .upsert(schedules, {
        onConflict: "mailbox_id,schedule_date",
        ignoreDuplicates: false,
      })
      .select();

    if (error) return res.serverError(error.message);

    return res.ok({
      generated: inserted?.length ?? schedules.length,
      schedules: inserted ?? [],
    });
  });
