"use client";

import { useState } from "react";
import {
  getSuggestedSpfRecord,
  getSuggestedDmarcRecord,
  getDkimInstructions,
} from "@/lib/dns/suggested-records";

interface DnsRecordsToAddProps {
  domain: string;
  spfStatus: string;
  dkimStatus: string;
  dmarcStatus: string;
}

export function DnsRecordsToAdd({
  domain,
  spfStatus,
  dkimStatus,
  dmarcStatus,
}: DnsRecordsToAddProps) {
  const [copied, setCopied] = useState<string | null>(null);

  function copy(value: string, id: string) {
    navigator.clipboard.writeText(value);
    setCopied(id);
    setTimeout(() => setCopied(null), 1500);
  }

  const needsSpf = spfStatus !== "pass";
  const needsDmarc = dmarcStatus !== "pass";
  const needsDkim = dkimStatus !== "pass";

  if (!needsSpf && !needsDmarc && !needsDkim) return null;

  const spfRecord = needsSpf ? getSuggestedSpfRecord(domain) : null;
  const dmarcRecord = needsDmarc ? getSuggestedDmarcRecord(domain) : null;
  const dkimInfo = needsDkim ? getDkimInstructions(domain) : null;

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800/50 p-4 space-y-6">
      <div>
        <h3 className="font-medium mb-1">Add these DNS records to your hosting provider</h3>
        <p className="text-sm text-slate-400">
          Log into your DNS panel (Cloudflare, Namecheap, GoDaddy, etc.), add the
          records below, then click &quot;Verify DNS&quot; to check. DNS can take a
          few minutes to propagate.
        </p>
      </div>

      {spfRecord && (
        <div className="space-y-2 p-3 rounded bg-slate-900/50">
          <div className="text-sm font-medium text-slate-300">SPF (TXT)</div>
          <p className="text-xs text-slate-500">{spfRecord.description}</p>
          <div className="text-xs text-slate-500 mb-1">
            Where: @ or {domain} (domain root)
          </div>
          <div className="flex gap-2">
            <code className="flex-1 min-w-0 p-2 rounded bg-slate-800 text-sm font-mono text-slate-300 break-all">
              {spfRecord.value}
            </code>
            <button
              type="button"
              onClick={() => copy(spfRecord.value, "spf")}
              className="shrink-0 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs font-medium"
            >
              {copied === "spf" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {dmarcRecord && (
        <div className="space-y-2 p-3 rounded bg-slate-900/50">
          <div className="text-sm font-medium text-slate-300">DMARC (TXT)</div>
          <p className="text-xs text-slate-500">{dmarcRecord.description}</p>
          <div className="text-xs text-slate-500 mb-1">
            Where: {dmarcRecord.host}.{domain}
          </div>
          <div className="flex gap-2">
            <code className="flex-1 min-w-0 p-2 rounded bg-slate-800 text-sm font-mono text-slate-300 break-all">
              {dmarcRecord.value}
            </code>
            <button
              type="button"
              onClick={() => copy(dmarcRecord.value, "dmarc")}
              className="shrink-0 px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-xs font-medium"
            >
              {copied === "dmarc" ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      )}

      {dkimInfo && (
        <div className="space-y-2">
          <div className="text-sm font-medium text-slate-300">DKIM (TXT)</div>
          <p className="text-sm text-slate-400">{dkimInfo.instructions}</p>
          <div className="flex flex-wrap gap-2">
            {dkimInfo.providerLinks.map((link) => (
              <a
                key={link.name}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:text-blue-300 underline"
              >
                {link.name} →
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
