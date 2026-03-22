"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SendingToggle({
  mailboxId,
  sendingEnabled,
  domainVerified,
}: {
  mailboxId: string;
  sendingEnabled: boolean;
  domainVerified: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleToggle() {
    if (!domainVerified && !sendingEnabled) return;
    setLoading(true);

    const res = await fetch(`/api/mailboxes/${mailboxId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sending_enabled: !sendingEnabled }),
    });

    setLoading(false);
    if (res.ok) router.refresh();
  }

  const canEnable = domainVerified;
  const disabled = loading || (!sendingEnabled && !canEnable);

  return (
    <div className="flex items-center gap-2">
      {!domainVerified && (
        <span className="text-amber-400 text-sm">
          Verify domain to enable sending
        </span>
      )}
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
