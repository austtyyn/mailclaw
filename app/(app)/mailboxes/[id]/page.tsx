import Link from "next/link";
import { unwrapRelation } from "@/lib/utils";
import { getTodayStart } from "@/lib/utils";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { evaluateDomainReadiness } from "@/lib/domain-readiness";
import { evaluateMailboxEligibility } from "@/lib/mailbox-eligibility";
import { scoreToStatus } from "@/lib/health";
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
        status,
        spf_status,
        dkim_status,
        dmarc_status,
        health_score
      )
    `)
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !mailbox) notFound();

  const domain = unwrapRelation(mailbox.domains);
  const readiness = evaluateDomainReadiness({
    spf_status: domain?.spf_status ?? null,
    dkim_status: domain?.dkim_status ?? null,
    dmarc_status: domain?.dmarc_status ?? null,
    health_score: domain?.health_score ?? null,
  });

  const todayStart = getTodayStart();
  const { count: todayCount } = await supabase
    .from("messages")
    .select("*", { count: "exact", head: true })
    .eq("mailbox_id", id)
    .eq("direction", "outbound")
    .gte("created_at", todayStart);

  const eligibility = evaluateMailboxEligibility(
    mailbox,
    domain
      ? {
          spf_status: domain.spf_status,
          dkim_status: domain.dkim_status,
          dmarc_status: domain.dmarc_status,
          health_score: domain.health_score,
        }
      : null,
    { outbound_count: todayCount ?? 0 }
  );

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
          domainCanSend={readiness.can_send}
          denialReasons={readiness.can_send ? [] : readiness.reasons}
        />
      </div>

      {!eligibility.eligible_to_send && eligibility.denial_reasons.length > 0 && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <div className="text-sm font-medium text-amber-400 mb-2">
            Not eligible to send
          </div>
          <ul className="text-sm text-slate-400 space-y-1">
            {eligibility.denial_reasons.map((r, i) => (
              <li key={i}>• {r}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid md:grid-cols-4 gap-4">
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
            title={scoreToStatus(mailbox.health_score)}
          >
            {mailbox.health_score}
          </div>
          <div className="text-xs text-slate-500 capitalize mt-1">
            {scoreToStatus(mailbox.health_score)}
          </div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-slate-400">Daily Limit</div>
          <div className="text-2xl font-bold">{mailbox.daily_limit}</div>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <div className="text-sm text-slate-400">Remaining Today</div>
          <div className="text-2xl font-bold text-green-400">
            {eligibility.remaining_daily_capacity}
          </div>
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
