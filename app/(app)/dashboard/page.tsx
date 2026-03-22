import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { requireAuth, getOrCreateDefaultWorkspace } from "@/lib/auth";
import { unwrapRelation } from "@/lib/utils";
import { MIN_MAILBOX_HEALTH_SCORE, MIN_DOMAIN_HEALTH_SCORE } from "@/lib/api/constants";

export default async function DashboardPage() {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const supabase = await createClient();

  const [
    { count: domainCount },
    { count: mailboxCount },
    { data: mailboxes },
    { data: recentEvents },
  ] = await Promise.all([
    supabase
      .from("domains")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("mailboxes")
      .select("*", { count: "exact", head: true })
      .eq("workspace_id", workspace.id),
    supabase
      .from("mailboxes")
      .select("id, health_score, sending_enabled")
      .eq("workspace_id", workspace.id),
    supabase
      .from("deliverability_events")
      .select(`
        id,
        event_type,
        created_at,
        mailboxes (
          email
        )
      `)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const healthyCount =
    mailboxes?.filter(
      (m) => m.health_score >= MIN_MAILBOX_HEALTH_SCORE && m.sending_enabled
    ).length ?? 0;
  const pausedCount =
    mailboxes?.filter((m) => m.health_score < MIN_DOMAIN_HEALTH_SCORE)
      ?.length ?? 0;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Link
          href="/domains"
          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition"
        >
          <div className="text-2xl font-bold text-white">
            {domainCount ?? 0}
          </div>
          <div className="text-sm text-slate-400">Domains</div>
        </Link>
        <Link
          href="/mailboxes"
          className="p-4 rounded-lg bg-slate-800/50 border border-slate-700 hover:border-slate-600 transition"
        >
          <div className="text-2xl font-bold text-white">
            {mailboxCount ?? 0}
          </div>
          <div className="text-sm text-slate-400">Mailboxes</div>
        </Link>
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-2xl font-bold text-green-400">{healthyCount}</div>
          <div className="text-sm text-slate-400">Healthy & Sending</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-2xl font-bold text-amber-400">{pausedCount}</div>
          <div className="text-sm text-slate-400">Paused / Low Health</div>
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <h2 className="px-4 py-3 border-b border-slate-700 font-medium">
          Recent Events
        </h2>
        <div className="divide-y divide-slate-700">
          {recentEvents && recentEvents.length > 0 ? (
            recentEvents.map((evt: { id: string; event_type: string; created_at: string; mailboxes: { email: string } | { email: string }[] }) => {
              const mb = unwrapRelation(evt.mailboxes);
              return (
                <div
                  key={evt.id}
                  className="px-4 py-3 flex items-center justify-between"
                >
                  <span className="text-slate-300">{evt.event_type}</span>
                  <span className="text-slate-500 text-sm">
                    {mb?.email ?? "—"} ·{" "}
                    {new Date(evt.created_at).toLocaleString()}
                  </span>
                </div>
              );
            })
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
