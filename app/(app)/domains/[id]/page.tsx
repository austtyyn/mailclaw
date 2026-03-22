import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { requireAuth } from "@/lib/auth";
import { evaluateDomainReadiness } from "@/lib/domain-readiness";
import { VerifyButton } from "./verify-button";

export default async function DomainDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const { id } = await params;
  const supabase = await createClient();

  const { data: domain, error } = await supabase
    .from("domains")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", workspace.id)
    .single();

  if (error || !domain) notFound();

  const readiness = evaluateDomainReadiness({
    spf_status: domain.spf_status,
    dkim_status: domain.dkim_status,
    dmarc_status: domain.dmarc_status,
    health_score: domain.health_score,
  });
  const issues = Array.isArray(domain.verification_issues)
    ? domain.verification_issues
    : [];
  const recommendations = Array.isArray(domain.verification_recommendations)
    ? domain.verification_recommendations
    : [];

  const { data: mailboxes } = await supabase
    .from("mailboxes")
    .select("*")
    .eq("domain_id", id)
    .order("email");

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <Link href="/domains" className="text-slate-400 hover:text-white text-sm">
          ← Domains
        </Link>
        <VerifyButton domainId={id} />
      </div>

      <div>
        <h1 className="text-2xl font-bold">{domain.domain}</h1>
        <p className="text-slate-400 text-sm mt-1">
          Status: {domain.status} · Health: {domain.health_score} ·{" "}
          {readiness.can_send ? (
            <span className="text-green-400">Ready for sending</span>
          ) : readiness.can_warmup ? (
            <span className="text-amber-400">Ready for warmup only</span>
          ) : (
            <span className="text-red-400">Not ready</span>
          )}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <h2 className="font-medium mb-3">DNS Verification</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-slate-400">SPF</dt>
              <dd
                className={
                  domain.spf_status === "pass"
                    ? "text-green-400"
                    : domain.spf_status === "fail"
                      ? "text-red-400"
                      : "text-slate-500"
                }
              >
                {domain.spf_status ?? "unknown"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">DKIM</dt>
              <dd
                className={
                  domain.dkim_status === "pass"
                    ? "text-green-400"
                    : domain.dkim_status === "fail"
                      ? "text-red-400"
                      : "text-slate-500"
                }
              >
                {domain.dkim_status ?? "unknown"}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-400">DMARC</dt>
              <dd
                className={
                  domain.dmarc_status === "pass"
                    ? "text-green-400"
                    : domain.dmarc_status === "fail"
                      ? "text-red-400"
                      : "text-slate-500"
                }
              >
                {domain.dmarc_status ?? "unknown"}
              </dd>
            </div>
          </dl>
          <p className="text-slate-500 text-xs mt-3">
            Last checked:{" "}
            {domain.dns_last_checked_at
              ? new Date(domain.dns_last_checked_at).toLocaleString()
              : "Never"}
          </p>
        </div>
        <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
          <h2 className="font-medium mb-3">Issues & Recommendations</h2>
          {issues.length > 0 ? (
            <ul className="space-y-1 text-sm text-amber-400 mb-3">
              {issues.map((i, idx) => (
                <li key={idx}>• {i}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500 mb-3">No issues found.</p>
          )}
          {recommendations.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-400">
              {recommendations.map((r, idx) => (
                <li key={idx}>• {r}</li>
              ))}
            </ul>
          ) : (
            !readiness.can_send && (
              <p className="text-sm text-slate-500">
                Run verification to get recommendations.
              </p>
            )
          )}
        </div>
      </div>

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <h2 className="px-4 py-3 border-b border-slate-700 font-medium">
          Mailboxes
        </h2>
        <div className="divide-y divide-slate-700">
          {mailboxes?.length ? (
            mailboxes.map((mb) => (
              <Link
                key={mb.id}
                href={`/mailboxes/${mb.id}`}
                className="block px-4 py-3 hover:bg-slate-800/30"
              >
                <div className="font-medium">{mb.email}</div>
                <div className="text-sm text-slate-500">
                  {mb.provider} · Health: {mb.health_score} ·{" "}
                  {mb.sending_enabled ? "Sending enabled" : "Sending disabled"}
                </div>
              </Link>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-slate-500">
              No mailboxes on this domain.{" "}
              <Link href="/mailboxes" className="text-blue-400 hover:underline">
                Add a mailbox
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
