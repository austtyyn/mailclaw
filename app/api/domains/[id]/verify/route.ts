import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import { verifyDomain } from "@/lib/dns";
import {
  calculateDomainHealthFromAuth,
  applyMailboxHealthToDomain,
} from "@/lib/health";
import { isValidUuid } from "@/lib/validation";
import * as res from "@/lib/api/responses";

export const POST = (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) =>
  withAuth(async ({ workspaceId }) => {
    const { id } = await params;
    if (!isValidUuid(id)) return res.badRequest("Invalid domain ID");

    const supabase = await createClient();
    const { data: domain, error: fetchError } = await supabase
      .from("domains")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (fetchError || !domain) return res.notFound("Domain not found");

    const result = await verifyDomain(domain.domain);

    let healthScore = calculateDomainHealthFromAuth(
      result.spf,
      result.dkim,
      result.dmarc
    );

    const { data: mailboxes } = await supabase
      .from("mailboxes")
      .select("health_score")
      .eq("domain_id", id);

    if (mailboxes && mailboxes.length > 0) {
      const avgMailbox = Math.round(
        mailboxes.reduce((s, m) => s + (m.health_score ?? 100), 0) /
          mailboxes.length
      );
      healthScore = applyMailboxHealthToDomain(
        healthScore,
        avgMailbox,
        mailboxes.length
      );
    }

    const allPass =
      result.spf === "pass" &&
      result.dkim === "pass" &&
      result.dmarc === "pass";
    const anyFail =
      result.spf === "fail" ||
      result.dkim === "fail" ||
      result.dmarc === "fail";
    const status = anyFail ? "failed" : allPass ? "verified" : "pending";

    const { data: updated, error: updateError } = await supabase
      .from("domains")
      .update({
        spf_status: result.spf,
        dkim_status: result.dkim,
        dmarc_status: result.dmarc,
        dns_last_checked_at: result.checked_at,
        health_score: healthScore,
        status,
        verification_issues: result.issues,
        verification_recommendations: result.recommendations,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return res.serverError(updateError.message);

    return res.ok({
      domain: updated,
      verification: {
        overall_status: result.overall_status,
        spf: result.spf,
        dkim: result.dkim,
        dmarc: result.dmarc,
        issues: result.issues,
        recommendations: result.recommendations,
        checked_at: result.checked_at,
        spf_records: result.spf_records,
        dkim_records: result.dkim_records,
        dmarc_records: result.dmarc_records,
      },
    });
  });
