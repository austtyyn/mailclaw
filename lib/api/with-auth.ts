import { NextResponse } from "next/server";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { requireAuth } from "@/lib/auth";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { fromError } from "./responses";
import type { User } from "@supabase/supabase-js";

export interface AuthContext {
  user: User;
  workspaceId: string;
  workspaceName: string;
}

export async function getAuthContext(): Promise<AuthContext> {
  const user = await requireAuth();
  const workspace = await getOrCreateDefaultWorkspace(user.id);
  return {
    user,
    workspaceId: workspace.id,
    workspaceName: workspace.name,
  };
}

export async function withAuth(
  handler: (ctx: AuthContext) => Promise<NextResponse>
): Promise<NextResponse> {
  try {
    const ctx = await getAuthContext();
    return await handler(ctx);
  } catch (err) {
    if (isRedirectError(err)) throw err;
    return fromError(err);
  }
}
