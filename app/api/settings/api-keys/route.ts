import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import { generateApiKey } from "@/lib/api-keys";
import { API_KEY_NAME_MAX_LENGTH } from "@/lib/api/constants";
import * as res from "@/lib/api/responses";

export const GET = () =>
  withAuth(async ({ workspaceId }) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_api_keys")
      .select("id, name, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) return res.serverError(error.message);

    const keys = (data ?? []).map((k) => ({
      id: k.id,
      name: k.name,
      created_at: k.created_at,
    }));
    return res.ok(keys);
  });

export const POST = (request: NextRequest) =>
  withAuth(async ({ workspaceId }) => {
    const body = await request.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim().slice(0, API_KEY_NAME_MAX_LENGTH);

    if (!name) return res.badRequest("Name is required");

    const { raw, hashed } = generateApiKey();

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("agent_api_keys")
      .insert({
        workspace_id: workspaceId,
        name,
        hashed_key: hashed,
      })
      .select("id, name, created_at")
      .single();

    if (error) return res.serverError(error.message);

    return res.created({
      ...data,
      raw_key: raw,
      message: "Store this key securely. It will not be shown again.",
    });
  });
