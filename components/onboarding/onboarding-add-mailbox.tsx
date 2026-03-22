"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ALLOWED_PROVIDERS } from "@/lib/api/constants";

interface Domain {
  id: string;
  domain: string;
}

export function OnboardingAddMailbox({ domains }: { domains: Domain[] }) {
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
        email: email.trim().toLowerCase(),
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
      <p className="text-slate-400">
        Add and verify a domain first, then you can add mailboxes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-400">
        Add an email address on one of your verified domains. This mailbox will
        be used for warmup and sending.
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end"
      >
        {error && (
          <div className="w-full p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}
        <div>
          <label className="block text-xs text-slate-500 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-56"
            required
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Domain</label>
          <select
            value={domainId}
            onChange={(e) => setDomainId(e.target.value)}
            className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-48"
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
            className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-40"
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
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50 self-end"
        >
          {loading ? "Adding…" : "Add mailbox"}
        </button>
      </form>
    </div>
  );
}
