import { NextRequest } from "next/server";
import { validateApiKey, getBestSender } from "@/lib/agent";
import * as res from "@/lib/api/responses";

export async function GET(_request: NextRequest) {
  const authHeader = _request.headers.get("Authorization");
  const result = await validateApiKey(authHeader);

  if (!result.valid || !result.context) {
    return res.unauthorized(result.error ?? "Unauthorized");
  }

  const data = await getBestSender(result.context.workspaceId);

  return res.ok({
    mailbox: data.mailbox,
    reason: data.reason,
    explanation: data.explanation,
  });
}
