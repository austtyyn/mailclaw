"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALLOWED_PROVIDERS } from "@/lib/api/constants";

interface Domain {
  id: string;
  domain: string;
}

export function AddMailboxForm({ domains }: { domains: Domain[] }) {
  const [email, setEmail] = useState("");
  const [domainId, setDomainId] = useState(domains[0]?.id ?? "");
  const [provider, setProvider] = useState("manual");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetch("/api/mailboxes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: email.trim(),
        domain_id: domainId,
        provider,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Failed to add mailbox");
      return;
    }

    setEmail("");
    router.refresh();
  }

  if (domains.length === 0) {
    return (
      <span className="text-slate-500 text-sm">
        Add a domain first to create mailboxes
      </span>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap gap-2 items-end">
      {error && (
        <span className="text-red-400 text-sm w-full">{error}</span>
      )}
      <div>
        <label className="block text-xs text-slate-500 mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
          required
        />
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Domain</label>
        <select
          value={domainId}
          onChange={(e) => setDomainId(e.target.value)}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {domains.map((d) => (
            <option key={d.id} value={d.id}>
              {d.domain}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs text-slate-500 mb-1">Provider</label>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {ALLOWED_PROVIDERS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Adding..." : "Add Mailbox"}
      </button>
    </form>
  );
}
