import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { AddDomainForm } from "./add-domain-form";

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    verified: "bg-green-500/20 text-green-400",
    pending: "bg-amber-500/20 text-amber-400",
    failed: "bg-red-500/20 text-red-400",
    paused: "bg-slate-500/20 text-slate-400",
  };
  return (
    <span
      className={`px-2 py-0.5 rounded text-xs font-medium ${
        colors[status] ?? "bg-slate-500/20 text-slate-400"
      }`}
    >
      {status}
    </span>
  );
}

function DnsBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pass: "text-green-400",
    fail: "text-red-400",
    unknown: "text-slate-500",
  };
  return (
    <span className={`text-xs ${colors[status] ?? "text-slate-500"}`}>
      {status}
    </span>
  );
}

export default async function DomainsPage() {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const supabase = await createClient();

  const { data: domains } = await supabase
    .from("domains")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Domains</h1>
        <AddDomainForm />
      </div>

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Domain
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Status
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                SPF
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                DKIM
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                DMARC
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Health
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Last checked
              </th>
            </tr>
          </thead>
          <tbody>
            {domains?.length ? (
              domains.map((d) => (
                <tr
                  key={d.id}
                  className="border-b border-slate-700/50 hover:bg-slate-800/30"
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/domains/${d.id}`}
                      className="text-blue-400 hover:underline"
                    >
                      {d.domain}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="px-4 py-3">
                    <DnsBadge status={d.spf_status} />
                  </td>
                  <td className="px-4 py-3">
                    <DnsBadge status={d.dkim_status} />
                  </td>
                  <td className="px-4 py-3">
                    <DnsBadge status={d.dmarc_status} />
                  </td>
                  <td className="px-4 py-3">{d.health_score}</td>
                  <td className="px-4 py-3 text-slate-500 text-sm">
                    {d.dns_last_checked_at
                      ? new Date(d.dns_last_checked_at).toLocaleString()
                      : "—"}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                  No domains yet. Add one to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
