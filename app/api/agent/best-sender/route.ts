import { NextRequest } from "next/server";
import { validateApiKey, getBestSender } from "@/lib/agent";
import * as res from "@/lib/api/responses";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const result = await validateApiKey(authHeader);

  if (!result.valid || !result.context) {
    return res.unauthorized(result.error ?? "Unauthorized");
  }

  const { mailbox, reason } = await getBestSender(result.context.workspaceId);

  if (!mailbox) {
    return res.ok({ mailbox: null, reason: reason ?? "No eligible sender" });
  }

  return res.ok({ mailbox });
}
