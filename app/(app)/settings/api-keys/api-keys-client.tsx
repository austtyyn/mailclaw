"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface ApiKey {
  id: string;
  name: string;
  created_at: string;
}

export function ApiKeysClient({ initialKeys }: { initialKeys: ApiKey[] }) {
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const router = useRouter();

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNewRawKey(null);
    setLoading(true);

    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to create key");
      return;
    }

    setNewRawKey(data.raw_key);
    setName("");
    setKeys((prev) => [
      { id: data.id, name: data.name, created_at: data.created_at },
      ...prev,
    ]);
    router.refresh();
  }

  async function handleRevoke(id: string) {
    if (!confirm("Revoke this key? It will stop working immediately.")) return;

    await fetch(`/api/settings/api-keys/${id}`, { method: "DELETE" });
    setKeys((prev) => prev.filter((k) => k.id !== id));
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <form onSubmit={handleCreate} className="flex gap-2">
        {error && (
          <span className="text-red-400 text-sm self-center">{error}</span>
        )}
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Key name"
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create Key"}
        </button>
      </form>

      {newRawKey && (
        <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/30">
          <p className="text-amber-400 text-sm font-medium mb-1">
            Store this key now. It won&apos;t be shown again.
          </p>
          <div className="flex gap-2 items-start">
            <code className="flex-1 block text-xs break-all text-slate-300 bg-slate-900 p-2 rounded">
              {newRawKey}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(newRawKey);
              }}
              className="px-3 py-1.5 rounded bg-slate-700 text-slate-300 text-xs hover:bg-slate-600 shrink-0"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      <div className="rounded-lg bg-slate-800/50 border border-slate-700 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Name
              </th>
              <th className="text-left px-4 py-3 text-sm font-medium text-slate-400">
                Created
              </th>
              <th className="text-right px-4 py-3 text-sm font-medium text-slate-400">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {keys.length ? (
              keys.map((k) => (
                <tr key={k.id} className="border-b border-slate-700/50">
                  <td className="px-4 py-3">{k.name}</td>
                  <td className="px-4 py-3 text-slate-400 text-sm">
                    {new Date(k.created_at).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRevoke(k.id)}
                      className="text-red-400 hover:text-red-300 text-sm"
                    >
                      Revoke
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                  No API keys yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
