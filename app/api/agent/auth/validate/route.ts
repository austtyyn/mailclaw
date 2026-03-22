import { NextRequest } from "next/server";
import { validateApiKey } from "@/lib/agent";
import * as res from "@/lib/api/responses";

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("Authorization");
  const result = await validateApiKey(authHeader);

  if (!result.valid) {
    return res.unauthorized(result.error ?? "Unauthorized");
  }

  return res.ok({
    valid: true,
    workspace_id: result.context?.workspaceId,
  });
}
