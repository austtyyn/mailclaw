import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function seed() {
  // Create a test user via Auth Admin if needed - for local dev, use existing user
  const { data: { users } } = await supabase.auth.admin.listUsers();
  const testUser = users?.[0];
  if (!testUser) {
    console.log("No users found. Sign up at /sign-up first, then run seed again.");
    process.exit(1);
  }

  const userId = testUser.id;

  const { data: existingWorkspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .single();

  let workspaceId: string;
  if (existingWorkspace) {
    workspaceId = existingWorkspace.id;
    console.log("Using existing workspace:", workspaceId);
  } else {
    const { data: workspace, error: we } = await supabase
      .from("workspaces")
      .insert({ name: "Sample Workspace", owner_user_id: userId })
      .select("id")
      .single();
    if (we) {
      console.error("Workspace creation failed:", we);
      process.exit(1);
    }
    workspaceId = workspace!.id;
  }

  const { data: existingDomain } = await supabase
    .from("domains")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .single();

  let domainId: string;
  if (existingDomain) {
    domainId = existingDomain.id;
    console.log("Using existing domain");
  } else {
    const { data: domain, error: de } = await supabase
      .from("domains")
      .insert({
        workspace_id: workspaceId,
        domain: "example.com",
        status: "verified",
        spf_status: "pass",
        dkim_status: "pass",
        dmarc_status: "pass",
        health_score: 100,
        dns_last_checked_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (de) {
      console.error("Domain creation failed:", de);
      process.exit(1);
    }
    domainId = domain!.id;
  }

  const { data: mailboxes } = await supabase
    .from("mailboxes")
    .select("id")
    .eq("workspace_id", workspaceId);

  let mb1Id: string;
  let mb2Id: string;

  if (mailboxes && mailboxes.length >= 2) {
    mb1Id = mailboxes[0].id;
    mb2Id = mailboxes[1].id;
    console.log("Using existing mailboxes");
  } else {
    const emails = ["sender1@example.com", "sender2@example.com"];
    const ids: string[] = [];
    for (const email of emails) {
      const { data: mb, error: me } = await supabase
        .from("mailboxes")
        .insert({
          workspace_id: workspaceId,
          domain_id: domainId,
          email,
          provider: "manual",
          warmup_status: "warming",
          daily_limit: 20,
          health_score: 95,
          sending_enabled: true,
        })
        .select("id")
        .single();
      if (me) {
        console.error("Mailbox creation failed:", me);
        continue;
      }
      ids.push(mb!.id);
    }
    mb1Id = ids[0];
    mb2Id = ids[1] ?? ids[0];
  }

  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const target = i === 0 ? 10 : 5;

    await supabase.from("warmup_schedules").upsert(
      [
        {
          mailbox_id: mb1Id,
          schedule_date: dateStr,
          target_send_count: target,
          actual_send_count: i < 2 ? target : 0,
          stage: i < 3 ? "new" : "week1",
          status: i === 0 ? "in_progress" : "completed",
        },
        {
          mailbox_id: mb2Id,
          schedule_date: dateStr,
          target_send_count: target,
          actual_send_count: Math.floor(target * 0.8),
          stage: "week1",
          status: "completed",
        },
      ],
      { onConflict: "mailbox_id,schedule_date" }
    );
  }

  const { data: existingMessages } = await supabase
    .from("messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .single();

  if (!existingMessages) {
    await supabase.from("messages").insert([
      {
        workspace_id: workspaceId,
        mailbox_id: mb1Id,
        external_message_id: "msg-1",
        direction: "outbound",
        subject: "Warmup test",
        delivery_status: "delivered",
        sent_at: new Date().toISOString(),
      },
      {
        workspace_id: workspaceId,
        mailbox_id: mb1Id,
        external_message_id: "msg-2",
        direction: "outbound",
        subject: "Warmup test 2",
        delivery_status: "delivered",
        sent_at: new Date().toISOString(),
      },
    ]);

    const { data: msgs } = await supabase
      .from("messages")
      .select("id")
      .eq("workspace_id", workspaceId)
      .limit(2);

    if (msgs?.length) {
      await supabase.from("deliverability_events").insert([
        { message_id: msgs[0].id, mailbox_id: mb1Id, event_type: "delivered", payload: {} },
        { message_id: msgs[1].id, mailbox_id: mb1Id, event_type: "delivered", payload: {} },
      ]);
      await supabase
        .from("deliverability_events")
        .insert({
          mailbox_id: mb2Id,
          event_type: "sent",
          payload: { subject: "Warmup day 1" },
        });
      await supabase
        .from("deliverability_events")
        .insert({
          mailbox_id: mb2Id,
          event_type: "reply",
          payload: {},
        });
    }
  }

  const { data: existingKeys } = await supabase
    .from("agent_api_keys")
    .select("id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .single();

  if (!existingKeys) {
    const crypto = await import("crypto");
    const raw = "mf_" + crypto.randomBytes(32).toString("hex");
    const hashed = crypto.createHash("sha256").update(raw).digest("hex");
    await supabase.from("agent_api_keys").insert({
      workspace_id: workspaceId,
      name: "Seed API Key",
      hashed_key: hashed,
    });
    console.log("Created API key for testing. Raw key (save this):", raw);
  }

  console.log("Seed complete. Workspace:", workspaceId);
}

seed().catch(console.error);
