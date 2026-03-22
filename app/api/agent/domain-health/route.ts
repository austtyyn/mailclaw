import { NextRequest } from "next/server";
import { validateApiKey, getDomainHealthSummary } from "@/lib/agent";
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

  const { domains } = await getDomainHealthSummary(
    result.context.workspaceId,
    domainId ?? undefined
  );

  if (domainId && domains.length === 0) {
    return res.notFound("Domain not found");
  }

  return res.ok({ domains });
}
