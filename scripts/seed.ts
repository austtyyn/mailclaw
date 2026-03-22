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

  // --- Domains ---
  // Good domain: ready for sending
  const { data: goodDomain } = await supabase
    .from("domains")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("domain", "example.com")
    .single();

  let goodDomainId: string;
  if (goodDomain) {
    goodDomainId = goodDomain.id;
    await supabase
      .from("domains")
      .update({
        status: "verified",
        spf_status: "pass",
        dkim_status: "pass",
        dmarc_status: "pass",
        health_score: 90,
        dns_last_checked_at: new Date().toISOString(),
        verification_issues: [],
        verification_recommendations: [],
      })
      .eq("id", goodDomainId);
  } else {
    const { data: d, error: de } = await supabase
      .from("domains")
      .insert({
        workspace_id: workspaceId,
        domain: "example.com",
        status: "verified",
        spf_status: "pass",
        dkim_status: "pass",
        dmarc_status: "pass",
        health_score: 90,
        dns_last_checked_at: new Date().toISOString(),
        verification_issues: [],
        verification_recommendations: [],
      })
      .select("id")
      .single();
    if (de) {
      console.error("Good domain creation failed:", de);
      process.exit(1);
    }
    goodDomainId = d!.id;
  }

  // Partially misconfigured domain: SPF fail, DKIM unknown, DMARC fail
  const { data: badDomain } = await supabase
    .from("domains")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("domain", "misconfigured.test")
    .single();

  let badDomainId: string;
  if (badDomain) {
    badDomainId = badDomain.id;
    await supabase
      .from("domains")
      .update({
        status: "failed",
        spf_status: "fail",
        dkim_status: "unknown",
        dmarc_status: "fail",
        health_score: 35,
        verification_issues: [
          "No SPF record found for domain",
          "No DMARC record found at _dmarc subdomain",
        ],
        verification_recommendations: [
          "Add an SPF TXT record at your domain root",
          "Add a DMARC TXT record at _dmarc.yourdomain.com",
        ],
      })
      .eq("id", badDomainId);
  } else {
    const { data: d, error: de } = await supabase
      .from("domains")
      .insert({
        workspace_id: workspaceId,
        domain: "misconfigured.test",
        status: "failed",
        spf_status: "fail",
        dkim_status: "unknown",
        dmarc_status: "fail",
        health_score: 35,
        dns_last_checked_at: new Date().toISOString(),
        verification_issues: [
          "No SPF record found for domain",
          "No DMARC record found at _dmarc subdomain",
        ],
        verification_recommendations: [
          "Add an SPF TXT record at your domain root",
          "Add a DMARC TXT record at _dmarc.yourdomain.com",
        ],
      })
      .select("id")
      .single();
    if (de) {
      console.error("Bad domain creation failed (domain may exist elsewhere):", de.message);
      badDomainId = goodDomainId;
    } else {
      badDomainId = d!.id;
    }
  }

  // --- Mailboxes ---
  const { data: existingMailboxes } = await supabase
    .from("mailboxes")
    .select("id, email")
    .eq("workspace_id", workspaceId);

  let mb1Id: string;
  let mb2Id: string;
  let mb3Id: string;

  const needed = [
    { email: "sender1@example.com", domainId: goodDomainId, health: 85, sending: true },
    { email: "sender2@misconfigured.test", domainId: badDomainId, health: 75, sending: true },
    { email: "sender3@example.com", domainId: goodDomainId, health: 45, sending: false },
  ];

  const ids: string[] = [];
  for (const n of needed) {
    const existing = existingMailboxes?.find((m) => m.email === n.email);
    if (existing) {
      ids.push(existing.id);
      await supabase
        .from("mailboxes")
        .update({
          domain_id: n.domainId,
          health_score: n.health,
          sending_enabled: n.sending,
          daily_limit: 20,
          provider: "manual",
        })
        .eq("id", existing.id);
    } else {
      const { data: mb, error } = await supabase
        .from("mailboxes")
        .insert({
          workspace_id: workspaceId,
          domain_id: n.domainId,
          email: n.email,
          provider: "manual",
          warmup_status: n.sending ? "warming" : "pending",
          daily_limit: 20,
          health_score: n.health,
          sending_enabled: n.sending,
        })
        .select("id")
        .single();
      if (error) {
        console.error("Mailbox creation failed:", n.email, error);
        continue;
      }
      ids.push(mb!.id);
    }
  }

  mb1Id = ids[0];
  mb2Id = ids[1] ?? ids[0];
  mb3Id = ids[2] ?? ids[0];

  // --- Warmup schedules ---
  const today = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split("T")[0];
    const target = i === 0 ? 10 : 5;
    await supabase.from("warmup_schedules").upsert(
      [mb1Id, mb2Id, mb3Id].map((mailbox_id) => ({
        mailbox_id,
        schedule_date: dateStr,
        target_send_count: target,
        actual_send_count: i < 2 ? target : 0,
        stage: i < 3 ? "new" : "week1",
        status: i === 0 ? "in_progress" : "completed",
      })),
      { onConflict: "mailbox_id,schedule_date" }
    );
  }

  // --- Messages: mb1 has 3 outbound today (best-sender eligible, 17 left)
  const todayStr = today.toISOString().split("T")[0] + "T00:00:00";
  const { data: todayMessages } = await supabase
    .from("messages")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("mailbox_id", mb1Id)
    .eq("direction", "outbound")
    .gte("created_at", todayStr);

  if (!todayMessages || todayMessages.length < 3) {
    for (let i = 0; i < 3; i++) {
      await supabase.from("messages").insert({
        workspace_id: workspaceId,
        mailbox_id: mb1Id,
        external_message_id: `seed-msg-${Date.now()}-${i}`,
        direction: "outbound",
        subject: `Warmup test ${i + 1}`,
        delivery_status: "delivered",
        sent_at: new Date().toISOString(),
      });
    }
  }

  // --- Deliverability events: healthy + bounces for variety
  const { data: msgs } = await supabase
    .from("messages")
    .select("id, mailbox_id")
    .eq("workspace_id", workspaceId)
    .limit(5);

  if (msgs?.length) {
    const mb1Msgs = msgs.filter((m) => m.mailbox_id === mb1Id);
    for (const m of mb1Msgs) {
      await supabase
        .from("deliverability_events")
        .insert({ message_id: m.id, mailbox_id: mb1Id, event_type: "delivered", payload: {} });
    }
    await supabase.from("deliverability_events").insert({
      mailbox_id: mb2Id,
      event_type: "hard_bounce",
      payload: { reason: "seed test" },
    });
    await supabase.from("deliverability_events").insert({
      mailbox_id: mb3Id,
      event_type: "soft_bounce",
      payload: { reason: "seed test" },
    });
  }

  // --- API key ---
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
  console.log("  - Good domain (example.com): ready for sending");
  console.log("  - Bad domain (misconfigured.test): not ready");
  console.log("  - sender1@example.com: healthy, eligible for best-sender");
  console.log("  - sender2@misconfigured.test: send-permission denies (bad domain)");
  console.log("  - sender3@example.com: restricted health, sending disabled");
}

seed().catch(console.error);
