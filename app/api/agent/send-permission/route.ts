import { NextRequest } from "next/server";
import { validateApiKey, checkSendPermission } from "@/lib/agent";
import * as res from "@/lib/api/responses";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const result = await validateApiKey(authHeader);

  if (!result.valid || !result.context) {
    return res.unauthorized(result.error ?? "Unauthorized");
  }

  const body = await request.json().catch(() => ({}));
  const mailboxId = body?.mailbox_id;

  if (!mailboxId || typeof mailboxId !== "string") {
    return res.badRequest("mailbox_id is required");
  }

  const { allowed, reason } = await checkSendPermission(
    result.context.workspaceId,
    mailboxId
  );

  return res.ok({ allowed, reason });
}
