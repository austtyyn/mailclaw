import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function requireAuth() {
  const user = await getUser();
  if (!user) {
    redirect("/sign-in");
  }
  return user;
}

export async function getWorkspaceMemberships(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workspace_members")
    .select(`
      workspace_id,
      role,
      workspaces (
        id,
        name
      )
    `)
    .eq("user_id", userId);

  if (error) throw error;
  return data ?? [];
}

export async function getOrCreateDefaultWorkspace(userId: string) {
  const supabase = await createClient();
  const memberships = await getWorkspaceMemberships(userId);

  if (memberships.length > 0) {
    const first = memberships[0];
    const workspace = Array.isArray(first.workspaces)
      ? first.workspaces[0]
      : first.workspaces;
    return workspace as { id: string; name: string };
  }

  const { data: workspace, error } = await supabase
    .from("workspaces")
    .insert({ name: "Default Workspace", owner_user_id: userId })
    .select("id, name")
    .single();

  if (error) throw error;
  return workspace;
}
