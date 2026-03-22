"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function OnboardingAddDomain() {
  const [domain, setDomain] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const addRes = await fetch("/api/domains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: domain.trim().toLowerCase() }),
      });

      const addData = await addRes.json();

      if (!addRes.ok) {
        setError(addData.error ?? "Failed to add domain");
        return;
      }

      const domainId = addData.id;
      await fetch(`/api/domains/${domainId}/verify`, { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-slate-400">
        Enter the domain you want to send email from (e.g. example.com). We'll
        save it and check your DNS records right away.
      </p>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
        {error && (
          <div className="w-full p-3 rounded-lg bg-red-500/10 text-red-400 text-sm">
            {error}
          </div>
        )}
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="example.com"
          className="flex-1 px-4 py-3 rounded-lg bg-slate-800 border border-slate-600 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
        >
          {loading ? "Adding & verifying…" : "Add domain"}
        </button>
      </form>
    </div>
  );
}
