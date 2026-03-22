import { requireAuth } from "@/lib/auth";
import { getOrCreateDefaultWorkspace } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { ApiKeysClient } from "./api-keys-client";

export default async function ApiKeysPage() {
  await requireAuth();
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const workspace = await getOrCreateDefaultWorkspace(user.id);
  const { data: keys } = await supabase
    .from("agent_api_keys")
    .select("id, name, created_at")
    .eq("workspace_id", workspace.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">API Keys</h1>

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 p-4 max-w-2xl">
        <h2 className="font-medium mb-2">Agent API</h2>
        <p className="text-slate-400 text-sm mb-4">
          Use these keys to authenticate external systems (e.g. OpenClaw). All
          requests require a Bearer token in the Authorization header.
        </p>
        <ul className="text-sm text-slate-400 space-y-1 list-disc list-inside">
          <li>
            <code className="text-slate-300">POST /api/agent/auth/validate</code>{" "}
            — Validate API key
          </li>
          <li>
            <code className="text-slate-300">GET /api/agent/best-sender</code> —
            Get healthiest mailbox for sending
          </li>
          <li>
            <code className="text-slate-300">POST /api/agent/send-permission</code>{" "}
            — Check if a mailbox can send
          </li>
          <li>
            <code className="text-slate-300">POST /api/agent/log-event</code> —
            Log sent, delivered, bounce, reply events
          </li>
          <li>
            <code className="text-slate-300">GET /api/agent/domain-health</code> —
            Get domain health summary
          </li>
        </ul>
      </div>

      <ApiKeysClient initialKeys={keys ?? []} />
    </div>
  );
}
