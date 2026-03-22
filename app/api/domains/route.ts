import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import { isValidDomain } from "@/lib/validation";
import * as res from "@/lib/api/responses";

export const GET = () =>
  withAuth(async ({ workspaceId }) => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("domains")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (error) return res.serverError(error.message);
    return res.ok(data ?? []);
  });

export const POST = (request: NextRequest) =>
  withAuth(async ({ workspaceId }) => {
    const body = await request.json().catch(() => ({}));
    const domain = String(body?.domain ?? "").trim().toLowerCase();

    if (!domain) return res.badRequest("Domain is required");
    if (!isValidDomain(domain)) return res.badRequest("Invalid domain format");

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("domains")
      .insert({
        workspace_id: workspaceId,
        domain,
        status: "pending",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.conflict("Domain already exists");
      }
      return res.serverError(error.message);
    }
    return res.created(data);
  });
