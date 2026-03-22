"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function GenerateButton() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleClick() {
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    await fetch("/api/warmup/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: today }),
    });
    setLoading(false);
    router.refresh();
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 disabled:opacity-50"
    >
      {loading ? "Generating..." : "Generate Today's Schedules"}
    </button>
  );
}
