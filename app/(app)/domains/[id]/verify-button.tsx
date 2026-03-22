"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyButton({ domainId }: { domainId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    setError(null);
    const res = await fetch(`/api/domains/${domainId}/verify`, {
      method: "POST",
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Verification failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-1 items-end">
      {error && (
        <span className="text-red-400 text-sm">{error}</span>
      )}
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {loading ? "Verifying..." : "Verify DNS"}
      </button>
    </div>
  );
}
