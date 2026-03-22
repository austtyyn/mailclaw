"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SendingToggle({
  mailboxId,
  sendingEnabled,
  domainCanSend,
  denialReasons = [],
}: {
  mailboxId: string;
  sendingEnabled: boolean;
  domainCanSend: boolean;
  denialReasons?: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function handleToggle() {
    if (!domainCanSend && !sendingEnabled) return;
    setLoading(true);
    setError(null);

    const res = await fetch(`/api/mailboxes/${mailboxId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sending_enabled: !sendingEnabled }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      setError(data.error ?? "Failed to update");
    }
  }

  const canEnable = domainCanSend;
  const disabled = loading || (!sendingEnabled && !canEnable);

  return (
    <div className="flex flex-col gap-1 items-end">
      {!domainCanSend && !sendingEnabled && (
        <span className="text-amber-400 text-sm" title={denialReasons.join("; ")}>
          {denialReasons[0] ?? "Domain not ready for sending"}
        </span>
      )}
      {error && <span className="text-red-400 text-sm">{error}</span>}
      <button
        onClick={handleToggle}
        disabled={disabled}
        className={`px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 ${
          sendingEnabled
            ? "bg-amber-600 hover:bg-amber-500 text-white"
            : "bg-green-600 hover:bg-green-500 text-white"
        }`}
      >
        {loading
          ? "..."
          : sendingEnabled
            ? "Disable Sending"
            : "Enable Sending"}
      </button>
    </div>
  );
}
