"use client";

import { useState } from "react";
import type { DnsStatus } from "@/lib/types";

interface DnsRecordCardProps {
  name: string;
  status: DnsStatus;
  explanation: string;
  action: string;
  records?: string[];
  onRecheck?: () => void;
  rechecking?: boolean;
}

const statusStyles: Record<string, string> = {
  pass: "bg-green-500/20 text-green-400 border-green-500/30",
  fail: "bg-red-500/20 text-red-400 border-red-500/30",
  unknown: "bg-slate-500/20 text-slate-400 border-slate-500/30",
};

export function DnsRecordCard({
  name,
  status,
  explanation,
  action,
  records = [],
  onRecheck,
  rechecking = false,
}: DnsRecordCardProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  function copyRecord(record: string, index: number) {
    navigator.clipboard.writeText(record);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  }

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3">
        <span className="font-medium">{name}</span>
        <span
          className={`px-2 py-1 rounded text-xs font-medium border ${
            statusStyles[status] ?? statusStyles.unknown
          }`}
        >
          {status}
        </span>
      </div>
      <p className="text-sm text-slate-400">{explanation}</p>
      <p className="text-sm text-slate-300">{action}</p>
      {records.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-slate-500 uppercase tracking-wide">
            Record{records.length > 1 ? "s" : ""}
          </span>
          {records.map((r, i) => (
            <div
              key={i}
              className="flex items-center gap-2 p-2 rounded bg-slate-900/50 text-sm font-mono text-slate-300 break-all"
            >
              <code className="flex-1 min-w-0">{r}</code>
              <button
                type="button"
                onClick={() => copyRecord(r, i)}
                className="shrink-0 px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-xs"
              >
                {copiedIndex === i ? "Copied" : "Copy"}
              </button>
            </div>
          ))}
        </div>
      )}
      {onRecheck && (
        <button
          type="button"
          onClick={onRecheck}
          disabled={rechecking}
          className="text-sm text-blue-400 hover:text-blue-300 disabled:opacity-50"
        >
          {rechecking ? "Checking..." : "Re-check DNS"}
        </button>
      )}
    </div>
  );
}
