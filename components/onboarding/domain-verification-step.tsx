"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DnsRecordCard } from "./dns-record-card";
import { DnsRecordsToAdd } from "@/components/dns-records-to-add";
import { DomainReadinessSummary } from "@/components/domain-readiness-summary";
import { evaluateDomainReadiness } from "@/lib/domain-readiness";

interface VerificationResult {
  overall_status: string;
  spf: string;
  dkim: string;
  dmarc: string;
  issues: string[];
  recommendations: string[];
  spf_records: string[];
  dkim_records: string[];
  dmarc_records: string[];
}

interface DomainVerificationStepProps {
  domainId: string;
  domainName: string;
  initialSpf: string;
  initialDkim: string;
  initialDmarc: string;
}

const SPF_EXPLANATION =
  "SPF tells receiving servers which mail servers are allowed to send email for your domain. Without it, your emails are more likely to land in spam.";
const DKIM_EXPLANATION =
  "DKIM adds a cryptographic signature to your emails so recipients can verify they really came from you. It builds trust and improves deliverability.";
const DMARC_EXPLANATION =
  "DMARC tells receiving servers what to do with emails that fail SPF or DKIM. It protects your domain from spoofing and improves your reputation.";

function getSpfAction(status: string): string {
  if (status === "pass")
    return "Your SPF record is set up correctly. No action needed.";
  if (status === "fail")
    return "Add an SPF TXT record at your domain root. Your DNS host (Cloudflare, Namecheap, etc.) will have a way to add TXT records.";
  return "Run a re-check after adding or updating your SPF record. DNS can take a few minutes to propagate.";
}

function getDkimAction(status: string): string {
  if (status === "pass")
    return "Your DKIM is configured. No action needed.";
  if (status === "fail")
    return "Fix or remove invalid DKIM records. Your email provider (Gmail, SendGrid, etc.) will provide the correct record.";
  return "Add a DKIM TXT record at selector._domainkey.yourdomain.com. Your email provider will give you the exact record.";
}

function getDmarcAction(status: string): string {
  if (status === "pass")
    return "Your DMARC record is set. No action needed.";
  if (status === "fail")
    return "Add a DMARC TXT record at _dmarc.yourdomain.com. Start with p=none for monitoring.";
  return "Add a DMARC record for better deliverability. p=none is a good start for monitoring.";
}

export function DomainVerificationStep({
  domainId,
  domainName,
  initialSpf,
  initialDkim,
  initialDmarc,
}: DomainVerificationStepProps) {
  const router = useRouter();
  const [verification, setVerification] = useState<VerificationResult | null>(
    null
  );
  const [rechecking, setRechecking] = useState(false);

  const spf = verification?.spf ?? initialSpf;
  const dkim = verification?.dkim ?? initialDkim;
  const dmarc = verification?.dmarc ?? initialDmarc;

  const readiness = evaluateDomainReadiness({
    spf_status: spf as "pass" | "fail" | "unknown",
    dkim_status: dkim as "pass" | "fail" | "unknown",
    dmarc_status: dmarc as "pass" | "fail" | "unknown",
    health_score: 100,
  });

  async function handleRecheck() {
    setRechecking(true);
    try {
      const res = await fetch(`/api/domains/${domainId}/verify`, {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok && data.verification) {
        setVerification(data.verification);
        router.refresh();
      }
    } finally {
      setRechecking(false);
    }
  }

  return (
    <div className="space-y-6">
      <DomainReadinessSummary
        readiness={readiness}
        domainName={domainName}
      />

      <DnsRecordsToAdd
        domain={domainName}
        spfStatus={spf}
        dkimStatus={dkim}
        dmarcStatus={dmarc}
      />

      <div className="grid gap-4 md:grid-cols-1">
        <DnsRecordCard
          name="SPF"
          status={spf as "pass" | "fail" | "unknown"}
          explanation={SPF_EXPLANATION}
          action={getSpfAction(spf)}
          records={verification?.spf_records}
          onRecheck={handleRecheck}
          rechecking={rechecking}
        />
        <DnsRecordCard
          name="DKIM"
          status={dkim as "pass" | "fail" | "unknown"}
          explanation={DKIM_EXPLANATION}
          action={getDkimAction(dkim)}
          records={verification?.dkim_records}
          onRecheck={handleRecheck}
          rechecking={rechecking}
        />
        <DnsRecordCard
          name="DMARC"
          status={dmarc as "pass" | "fail" | "unknown"}
          explanation={DMARC_EXPLANATION}
          action={getDmarcAction(dmarc)}
          records={verification?.dmarc_records}
          onRecheck={handleRecheck}
          rechecking={rechecking}
        />
      </div>

      <button
        type="button"
        onClick={handleRecheck}
        disabled={rechecking}
        className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-500 disabled:opacity-50"
      >
        {rechecking ? "Checking DNS…" : "Re-check all records"}
      </button>
    </div>
  );
}
