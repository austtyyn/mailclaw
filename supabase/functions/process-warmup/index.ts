import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const today = new Date().toISOString().split("T")[0];

    const { data: schedules } = await supabase
      .from("warmup_schedules")
      .select("id, mailbox_id, target_send_count")
      .eq("schedule_date", today)
      .eq("status", "pending");

    if (!schedules?.length) {
      return new Response(
        JSON.stringify({ processed: 0, message: "No pending schedules" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Mark pending schedules as in_progress.
    // To send actual warmup emails: integrate with your mail provider's API here,
    // then increment actual_send_count as each send completes.
    for (const s of schedules) {
      await supabase
        .from("warmup_schedules")
        .update({ status: "in_progress" })
        .eq("id", s.id);
    }

    return new Response(
      JSON.stringify({
        processed: schedules.length,
        message: "Schedules marked in progress (mail provider integration required for actual sends)",
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
