import Link from "next/link";
import { unwrapRelation } from "@/lib/utils";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { SendingToggle } from "./sending-toggle";

export default async function MailboxDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const { id } = await params;
  const supabase = await createClient();

  const { data: mailbox, error } = await supabase
    .from("mailboxes")
    .select(`
      *,
      domains (
        id,
        domain,
        status
      )
    `)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !mailbox) notFound();

  const [schedulesResult, eventsResult] = await Promise.all([
    supabase
      .from("warmup_schedules")
      .select("*")
      .eq("mailbox_id", id)
      .order("schedule_date", { ascending: false })
      .limit(14),
    supabase
      .from("deliverability_events")
      .select("*")
      .eq("mailbox_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const domain = unwrapRelation(mailbox.domains);

  return (
    <div className="space-y-8">
      <Link href="/mailboxes" className="text-slate-400 hover:text-white text-sm">
        ← Mailboxes
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{mailbox.email}</h1>
          <p className="text-slate-400 text-sm mt-1">
            {domain?.domain} · {mailbox.provider} · Health: {mailbox.health_score}
          </p>
        </div>
        <SendingToggle
          mailboxId={id}
          sendingEnabled={mailbox.sending_enabled}
          domainVerified={domain?.status === "verified"}
        />
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-slate-400">Health Score</div>
          <div
            className={`text-2xl font-bold ${
              mailbox.health_score >= 80
                ? "text-green-400"
                : mailbox.health_score >= 60
                  ? "text-amber-400"
                  : "text-red-400"
            }`}
          >
            {mailbox.health_score}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-slate-400">Daily Limit</div>
          <div className="text-2xl font-bold">{mailbox.daily_limit}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-slate-400">Warmup Status</div>
          <div className="text-2xl font-bold capitalize">
            {mailbox.warmup_status}
          </div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <h2 className="px-4 py-3 border-b border-slate-700 font-medium">
          Recent Warmup Schedules
        </h2>
        <div className="divide-y divide-slate-700">
          {schedulesResult.data?.length ? (
            schedulesResult.data.map((s) => (
              <div
                key={s.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <span>{s.schedule_date}</span>
                <span className="text-slate-400">
                  {s.actual_send_count} / {s.target_send_count} ({s.stage})
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-slate-500">
              No warmup schedules. Generate from the Warmup page.
            </div>
          )}
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <h2 className="px-4 py-3 border-b border-slate-700 font-medium">
          Recent Events
        </h2>
        <div className="divide-y divide-slate-700">
          {eventsResult.data?.length ? (
            eventsResult.data.map((evt) => (
              <div
                key={evt.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <span className="text-slate-300">{evt.event_type}</span>
                <span className="text-slate-500 text-sm">
                  {new Date(evt.created_at).toLocaleString()}
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-slate-500">
              No events yet
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
