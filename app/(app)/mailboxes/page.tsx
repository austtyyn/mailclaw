import Link from "next/link";
import { unwrapRelation } from "@/lib/utils";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { AddMailboxForm } from "./add-mailbox-form";

export default async function MailboxesPage() {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const supabase = await createClient();

  const { data: mailboxes } = await supabase
    .from("mailboxes")
    .select(`
      *,
      domains (
        id,
        domain
      )
    `)
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

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
                Sending
              </th>
            </tr>
          </thead>
          <tbody>
            {mailboxes?.length ? (
              mailboxes.map((mb) => {
                const domain = unwrapRelation(mb.domains);
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
                      >
                        {mb.health_score}
                      </span>
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
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
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
