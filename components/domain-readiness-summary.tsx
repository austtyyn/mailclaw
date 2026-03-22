"use client";

import type { DomainReadiness } from "@/lib/domain-readiness";

interface DomainReadinessSummaryProps {
  readiness: DomainReadiness;
  domainName?: string;
  compact?: boolean;
}

export function DomainReadinessSummary({
  readiness,
  domainName,
  compact = false,
}: DomainReadinessSummaryProps) {
  const { can_warmup, can_send, reasons } = readiness;

  const statusVariant = can_send ? "success" : can_warmup ? "warning" : "error";
  const statusCopy = can_send
    ? "Ready to send"
    : can_warmup
      ? "Ready for warmup"
      : "Not ready yet";

  const statusStyles = {
    success: "bg-green-500/20 text-green-400 border border-green-500/30",
    warning: "bg-amber-500/20 text-amber-400 border border-amber-500/30",
    error: "bg-red-500/20 text-red-400 border border-red-500/30",
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border ${statusStyles[statusVariant]}`}
      >
        <span className="text-sm font-medium">{statusCopy}</span>
        {domainName && (
          <span className="text-slate-400 text-xs">{domainName}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-4 ${statusStyles[statusVariant]}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">{statusCopy}</h3>
        {domainName && (
          <span className="text-sm opacity-80">{domainName}</span>
        )}
      </div>
      {reasons.length > 0 && (
        <ul className="space-y-1 text-sm opacity-90">
          {reasons.map((r, i) => (
            <li key={i}>• {r}</li>
          ))}
        </ul>
      )}
      {can_send && (
        <p className="mt-3 text-sm opacity-90">
          Your domain is configured correctly. You can send and warm up.
        </p>
      )}
      {can_warmup && !can_send && (
        <p className="mt-3 text-sm opacity-90">
          Good enough for warmup. Add DMARC for full sending confidence.
        </p>
      )}
      {!can_warmup && (
        <p className="mt-3 text-sm opacity-90">
          Fix the items above to unlock warmup and sending.
        </p>
      )}
    </div>
  );
}
