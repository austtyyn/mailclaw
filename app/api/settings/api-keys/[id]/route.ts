import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import { isValidUuid } from "@/lib/validation";
import * as res from "@/lib/api/responses";

export const DELETE = (
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) =>
  withAuth(async ({ workspaceId }) => {
    const { id } = await params;
    if (!isValidUuid(id)) return res.badRequest("Invalid API key ID");

    const supabase = await createClient();
    const { error } = await supabase
      .from("agent_api_keys")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) return res.serverError(error.message);
    return res.ok({ deleted: true });
  });
