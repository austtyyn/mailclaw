import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import { verifyDomainDns } from "@/lib/dns";
import { calculateDomainHealthFromAuth } from "@/lib/health";
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

    const dnsResult = await verifyDomainDns(domain.domain);
    const healthScore = calculateDomainHealthFromAuth(
      dnsResult.spf,
      dnsResult.dkim,
      dnsResult.dmarc
    );

    const allPass =
      dnsResult.spf === "pass" &&
      dnsResult.dkim === "pass" &&
      dnsResult.dmarc === "pass";
    const anyFail =
      dnsResult.spf === "fail" ||
      dnsResult.dkim === "fail" ||
      dnsResult.dmarc === "fail";
    const status = anyFail ? "failed" : allPass ? "verified" : "pending";

    const { data: updated, error: updateError } = await supabase
      .from("domains")
      .update({
        spf_status: dnsResult.spf,
        dkim_status: dnsResult.dkim,
        dmarc_status: dnsResult.dmarc,
        dns_last_checked_at: new Date().toISOString(),
        health_score: healthScore,
        status,
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) return res.serverError(updateError.message);

    return res.ok({
      domain: updated,
      verification: {
        spf: dnsResult.spf,
        dkim: dnsResult.dkim,
        dmarc: dnsResult.dmarc,
        spfRecords: dnsResult.spfRecords,
        dkimRecords: dnsResult.dkimRecords,
        dmarcRecords: dnsResult.dmarcRecords,
      },
    });
  });
