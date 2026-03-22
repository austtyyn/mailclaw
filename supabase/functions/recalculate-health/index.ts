import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HARD_BOUNCE_PENALTY = 20;
const SOFT_BOUNCE_PENALTY = 5;
const DELIVERED_BONUS = 1;
const REPLY_BONUS = 2;
const MIN_SCORE = 0;
const MAX_SCORE = 100;
const LOOKBACK_DAYS = 30;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const since = new Date();
    since.setDate(since.getDate() - LOOKBACK_DAYS);

    const { data: events } = await supabase
      .from("deliverability_events")
      .select("mailbox_id, event_type")
      .gte("created_at", since.toISOString());

    const mailboxCounts = new Map<
      string,
      { hard: number; soft: number; delivered: number; reply: number }
    >();

    for (const evt of events ?? []) {
      const c = mailboxCounts.get(evt.mailbox_id) ?? {
        hard: 0,
        soft: 0,
        delivered: 0,
        reply: 0,
      };
      if (evt.event_type === "hard_bounce") c.hard++;
      else if (evt.event_type === "soft_bounce") c.soft++;
      else if (evt.event_type === "delivered") c.delivered++;
      else if (evt.event_type === "reply") c.reply++;
      mailboxCounts.set(evt.mailbox_id, c);
    }

    const { data: mailboxes } = await supabase
      .from("mailboxes")
      .select("id, health_score, workspace_id, domain_id");

    let updated = 0;
    for (const mb of mailboxes ?? []) {
      const c = mailboxCounts.get(mb.id);
      if (!c) continue;

      const newScore = Math.max(
        MIN_SCORE,
        Math.min(
          MAX_SCORE,
          100 -
            c.hard * HARD_BOUNCE_PENALTY -
            c.soft * SOFT_BOUNCE_PENALTY +
            c.delivered * DELIVERED_BONUS +
            c.reply * REPLY_BONUS
        )
      );
      if (newScore !== mb.health_score) {
        await supabase
          .from("mailboxes")
          .update({ health_score: newScore })
          .eq("id", mb.id);
        updated++;
      }
    }

    const { data: mailboxesAfter } = await supabase
      .from("mailboxes")
      .select("id, health_score, domain_id");
    const domainIds = [...new Set((mailboxesAfter ?? []).map((m) => m.domain_id))];
    const { data: domains } = await supabase
      .from("domains")
      .select("id, health_score")
      .in("id", domainIds);

    for (const domain of domains ?? []) {
      const domainMailboxes = (mailboxesAfter ?? []).filter(
        (m) => m.domain_id === domain.id
      );
      if (domainMailboxes.length === 0) continue;
      const avgHealth = Math.round(
        domainMailboxes.reduce((s, m) => s + (m.health_score ?? 100), 0) /
          domainMailboxes.length
      );
      const newScore = Math.max(MIN_SCORE, Math.min(MAX_SCORE, avgHealth));
      const current = domain.health_score ?? 100;
      if (newScore !== current) {
        await supabase
          .from("domains")
          .update({ health_score: newScore })
          .eq("id", domain.id);
        updated++;
      }
    }

    return new Response(
      JSON.stringify({
        mailboxes_updated: updated,
        message: "Health recalculation completed",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
