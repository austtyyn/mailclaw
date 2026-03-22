import { NextRequest } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { validateApiKey } from "@/lib/agent";
import { scoreToStatus } from "@/lib/health";
import { isValidUuid } from "@/lib/validation";
import * as res from "@/lib/api/responses";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const result = await validateApiKey(authHeader);

  if (!result.valid || !result.context) {
    return res.unauthorized(result.error ?? "Unauthorized");
  }

  const { searchParams } = new URL(request.url);
  const domainId = searchParams.get("domain_id");
  if (domainId && !isValidUuid(domainId)) {
    return res.badRequest("Invalid domain_id");
  }

  const supabase = await createServiceRoleClient();

  let query = supabase
    .from("domains")
    .select(
      "id, domain, status, spf_status, dkim_status, dmarc_status, health_score, dns_last_checked_at"
    )
    .eq("workspace_id", result.context.workspaceId);

  if (domainId) query = query.eq("id", domainId);

  const { data: domains, error } = await query;

  if (error) return res.serverError(error.message);

  const healthSummaries = (domains ?? []).map((d) => ({
    domain_id: d.id,
    domain: d.domain,
    status: d.status,
    health_score: d.health_score,
    health_status: scoreToStatus(d.health_score),
    authentication: {
      spf: d.spf_status,
      dkim: d.dkim_status,
      dmarc: d.dmarc_status,
    },
    dns_last_checked_at: d.dns_last_checked_at,
  }));

  if (domainId && healthSummaries.length === 0) {
    return res.notFound("Domain not found");
  }

  return res.ok({ domains: healthSummaries });
}
