import Link from "next/link";
import { unwrapRelation } from "@/lib/utils";
import { getTodayStart } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { evaluateMailboxEligibility } from "@/lib/mailbox-eligibility";
import { scoreToStatus } from "@/lib/health";
import { AddMailboxForm } from "./add-mailbox-form";

export default async function MailboxesPage() {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const supabase = await createClient();
  const todayStart = getTodayStart();

  const { data: mailboxes } = await supabase
    .from("mailboxes")
    .select(`
      *,
      domains (
        id,
        domain,
        spf_status,
        dkim_status,
        dmarc_status,
        health_score
      )
    `)
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  const { data: todayMessages } = await supabase
    .from("messages")
    .select("mailbox_id")
    .eq("direction", "outbound")
    .gte("created_at", todayStart);

  const outboundByMailbox = new Map<string, number>();
  for (const m of todayMessages ?? []) {
    outboundByMailbox.set(m.mailbox_id, (outboundByMailbox.get(m.mailbox_id) ?? 0) + 1);
  }

  const { data: domains } = await supabase
    .from("domains")
    .select("id, domain")
    .eq("workspace_id", workspace.id);

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Mailboxes</h1>
        <AddMailboxForm domains={domains ?? []} />
      </div>

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Email
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Domain
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Provider
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Warmup
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Daily Limit
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Health
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Eligible
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Sending
              </th>
            </tr>
          </thead>
          <tbody>
            {mailboxes?.length ? (
              mailboxes.map((mb) => {
                const domain = unwrapRelation(mb.domains);
                const eligibility = evaluateMailboxEligibility(
                  mb,
                  domain
                    ? {
                        spf_status: domain.spf_status,
                        dkim_status: domain.dkim_status,
                        dmarc_status: domain.dmarc_status,
                        health_score: domain.health_score,
                      }
                    : null,
                  { outbound_count: outboundByMailbox.get(mb.id) ?? 0 }
                );
                const healthStatus = scoreToStatus(mb.health_score);
                return (
                  <tr
                    key={mb.id}
                    className="border-b border-slate-700/50 hover:bg-slate-800/30"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/mailboxes/${mb.id}`}
                        className="text-blue-400 hover:underline"
                      >
                        {mb.email}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {domain?.domain ?? "—"}
                    </td>
                    <td className="px-4 py-3">{mb.provider}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-400">{mb.warmup_status}</span>
                    </td>
                    <td className="px-4 py-3">{mb.daily_limit}</td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          mb.health_score >= 80
                            ? "text-green-400"
                            : mb.health_score >= 60
                              ? "text-amber-400"
                              : "text-red-400"
                        }
                        title={healthStatus}
                      >
                        {mb.health_score} ({healthStatus})
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {eligibility.eligible_to_send ? (
                        <span className="text-green-400 text-sm" title={`${eligibility.remaining_daily_capacity} left today`}>
                          Yes ({eligibility.remaining_daily_capacity} left)
                        </span>
                      ) : (
                        <span
                          className="text-amber-400 text-sm"
                          title={eligibility.denial_reasons.join("; ")}
                        >
                          No
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {mb.sending_enabled ? (
                        <span className="text-green-400 text-sm">Yes</span>
                      ) : (
                        <span className="text-slate-500 text-sm">No</span>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                  No mailboxes yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
