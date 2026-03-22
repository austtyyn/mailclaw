/**
 * Domain verification service - server-side DNS lookups for SPF, DKIM, DMARC.
 * Returns structured results. Marks unknown when we cannot fully verify (e.g. DKIM without selectors).
 */

import { promises as dns } from "dns";
import type { DnsStatus } from "@/lib/types";

export interface VerificationResult {
  overall_status: "pass" | "fail" | "partial";
  spf: DnsStatus;
  dkim: DnsStatus;
  dmarc: DnsStatus;
  issues: string[];
  recommendations: string[];
  checked_at: string;
  spf_records: string[];
  dkim_records: string[];
  dmarc_records: string[];
}

const COMMON_DKIM_SELECTORS = [
  "default",
  "mail",
  "selector1",
  "selector2",
  "google",
  "k1",
  "s1",
  "dkim",
];

async function resolveTxt(domain: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(domain);
    return records.flat().map((r) => String(r).trim());
  } catch {
    return [];
  }
}

function checkSpf(txtRecords: string[]): {
  status: DnsStatus;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const spfRecord = txtRecords.find(
    (r) =>
      r.toLowerCase().startsWith("v=spf1") || r.toLowerCase().includes("v=spf1")
  );

  if (!spfRecord) {
    return {
      status: "fail",
      issues: ["No SPF record found for domain"],
      recommendations: [
        "Add an SPF TXT record at your domain root",
        "Include all sending IPs/hosts (e.g. include:_spf.google.com for Gmail)",
        "End with -all (strict) or ~all (soft-fail) for best deliverability",
      ],
    };
  }

  const lower = spfRecord.toLowerCase();
  if (lower.includes("-all")) {
    // Strict - good
  } else if (lower.includes("~all")) {
    recommendations.push("Consider using -all instead of ~all for stricter SPF policy");
  } else if (lower.includes("?all")) {
    return {
      status: "unknown",
      issues: ["SPF uses neutral (?all) policy - receivers may treat as undefined"],
      recommendations: ["Replace ?all with ~all or -all for deterministic behavior"],
    };
  } else if (!lower.includes("all")) {
    return {
      status: "unknown",
      issues: ["SPF record has no terminating mechanism (all)"],
      recommendations: ["Add -all, ~all, or ?all to complete the SPF record"],
    };
  }

  return { status: "pass", issues: [], recommendations };
}

function checkDmarc(txtRecords: string[]): {
  status: DnsStatus;
  issues: string[];
  recommendations: string[];
} {
  const issues: string[] = [];
  const recommendations: string[] = [];
  const dmarcRecord = txtRecords.find(
    (r) =>
      r.toLowerCase().startsWith("v=dmarc1") ||
      r.toLowerCase().includes("v=dmarc1")
  );

  if (!dmarcRecord) {
    return {
      status: "fail",
      issues: ["No DMARC record found at _dmarc subdomain"],
      recommendations: [
        "Add a DMARC TXT record at _dmarc.yourdomain.com",
        "Start with p=none for monitoring, then p=quarantine or p=reject for enforcement",
      ],
    };
  }

  const lower = dmarcRecord.toLowerCase();
  if (
    lower.includes("p=reject") ||
    lower.includes("p=quarantine") ||
    lower.includes("p=none")
  ) {
    return { status: "pass", issues: [], recommendations };
  }

  return {
    status: "unknown",
    issues: ["DMARC record exists but policy (p=) not recognized"],
    recommendations: ["Ensure p=none, p=quarantine, or p=reject is set"],
  };
}

async function checkDkim(
  domain: string,
  selectors: string[] = COMMON_DKIM_SELECTORS
): Promise<{
  status: DnsStatus;
  records: string[];
  issues: string[];
  recommendations: string[];
}> {
  const allRecords: string[] = [];
  for (const sel of selectors) {
    const host = `${sel}._domainkey.${domain}`;
    const records = await resolveTxt(host);
    for (const r of records) {
      allRecords.push(r);
      const lower = r.toLowerCase();
      if (
        lower.includes("v=dkim1") &&
        (lower.includes("k=rsa") || lower.includes("k=ed25519") || lower.includes("p="))
      ) {
        return {
          status: "pass",
          records: allRecords,
          issues: [],
          recommendations: [],
        };
      }
    }
  }

  if (allRecords.length > 0) {
    return {
      status: "fail",
      records: allRecords,
      issues: ["DKIM records found but none are valid (missing v=DKIM1 or public key)"],
      recommendations: [
        "Ensure your DKIM record includes v=DKIM1 and a valid p= public key",
        "If using a custom selector, add it to your domain configuration",
      ],
    };
  }

  return {
    status: "unknown",
    records: [],
    issues: [
      "No DKIM record found for common selectors (default, mail, selector1, etc.)",
      "If you use a custom selector, configure it in domain settings",
    ],
    recommendations: [
      "Add a DKIM TXT record at selector._domainkey.yourdomain.com",
      "Your email provider (Gmail, SendGrid, etc.) will provide the record",
    ],
  };
}

/**
 * Verify domain DNS records. Uses server-side Node DNS only.
 * DKIM: if no selector config available, checks common selectors and returns unknown when none found.
 */
export async function verifyDomain(domain: string, dkimSelectors?: string[]): Promise<VerificationResult> {
  const baseDomain = domain.replace(/^\.+/, "").toLowerCase();
  const spfHost = baseDomain;
  const dmarcHost = `_dmarc.${baseDomain}`;

  const [spfTxt, dmarcTxt] = await Promise.all([
    resolveTxt(spfHost),
    resolveTxt(dmarcHost),
  ]);

  const spfResult = checkSpf(spfTxt);
  const dmarcResult = checkDmarc(dmarcTxt);
  const dkimResult = await checkDkim(baseDomain, dkimSelectors);

  const issues: string[] = [
    ...spfResult.issues,
    ...dmarcResult.issues,
    ...dkimResult.issues,
  ];
  const recommendations: string[] = [
    ...spfResult.recommendations,
    ...dmarcResult.recommendations,
    ...dkimResult.recommendations,
  ];

  const anyFail =
    spfResult.status === "fail" ||
    dmarcResult.status === "fail" ||
    dkimResult.status === "fail";
  const allPass =
    spfResult.status === "pass" &&
    dmarcResult.status === "pass" &&
    dkimResult.status === "pass";

  const overall_status = anyFail ? "fail" : allPass ? "pass" : "partial";

  return {
    overall_status,
    spf: spfResult.status,
    dkim: dkimResult.status,
    dmarc: dmarcResult.status,
    issues,
    recommendations,
    checked_at: new Date().toISOString(),
    spf_records: spfTxt,
    dkim_records: dkimResult.records,
    dmarc_records: dmarcTxt,
  };
}
