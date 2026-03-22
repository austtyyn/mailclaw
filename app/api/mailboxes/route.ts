import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { withAuth } from "@/lib/api/with-auth";
import { isValidEmail, isValidUuid } from "@/lib/validation";
import { PROVIDER_MAX_LENGTH, PROVIDER_ACCOUNT_REF_MAX_LENGTH } from "@/lib/api/constants";
import * as res from "@/lib/api/responses";

export const GET = (request: NextRequest) =>
  withAuth(async ({ workspaceId }) => {
    const { searchParams } = new URL(request.url);
    const domainId = searchParams.get("domain_id");
    if (domainId && !isValidUuid(domainId)) {
      return res.badRequest("Invalid domain_id");
    }

    const supabase = await createClient();
    let query = supabase
      .from("mailboxes")
      .select(`
        *,
        domains (
          id,
          domain,
          status
        )
      `)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (domainId) query = query.eq("domain_id", domainId);

    const { data, error } = await query;
    if (error) return res.serverError(error.message);
    return res.ok(data ?? []);
  });

export const POST = (request: NextRequest) =>
  withAuth(async ({ workspaceId }) => {
    const body = await request.json().catch(() => ({}));
    const email = String(body?.email ?? "").trim().toLowerCase();
    const domainId = String(body?.domain_id ?? "");
    const provider = String(body?.provider ?? "manual").slice(0, PROVIDER_MAX_LENGTH);
    const providerAccountRef = body?.provider_account_ref
      ? String(body.provider_account_ref).slice(0, PROVIDER_ACCOUNT_REF_MAX_LENGTH)
      : null;

    if (!email) return res.badRequest("Email is required");
    if (!isValidEmail(email)) return res.badRequest("Invalid email format");
    if (!domainId || !isValidUuid(domainId)) {
      return res.badRequest("Valid domain ID is required");
    }

    const supabase = await createClient();
    const { data: domain } = await supabase
      .from("domains")
      .select("id")
      .eq("id", domainId)
      .eq("workspace_id", workspaceId)
      .single();

    if (!domain) return res.notFound("Domain not found");

    const { data, error } = await supabase
      .from("mailboxes")
      .insert({
        workspace_id: workspaceId,
        domain_id: domainId,
        email,
        provider,
        provider_account_ref: providerAccountRef,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") return res.conflict("Email already exists");
      return res.serverError(error.message);
    }
    return res.created(data);
  });
