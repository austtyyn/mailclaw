"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function VerifyButton({ domainId }: { domainId: string }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    await fetch(`/api/domains/${domainId}/verify`, { method: "POST" });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
    >
      {loading ? "Verifying..." : "Verify DNS"}
    </button>
  );
}
