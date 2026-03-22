/**
 * DNS verification - server-side only.
 * Uses lib/dns/verification.ts for full structured verification.
 */

import {
  verifyDomain,
  type VerificationResult,
} from "./verification";
import type { DnsStatus } from "@/lib/types";

export type DnsCheckResult = DnsStatus;
export type { VerificationResult };

export interface DnsVerificationResult {
  spf: DnsCheckResult;
  dkim: DnsCheckResult;
  dmarc: DnsCheckResult;
  spfRecords: string[];
  dkimRecords: string[];
  dmarcRecords: string[];
}

/** Full verification with issues and recommendations - preferred */
export { verifyDomain };

/** Legacy adapter - maps to old shape for backward compatibility */
export async function verifyDomainDns(domain: string): Promise<DnsVerificationResult> {
  const result = await verifyDomain(domain);
  return {
    spf: result.spf,
    dkim: result.dkim,
    dmarc: result.dmarc,
    spfRecords: result.spf_records,
    dkimRecords: result.dkim_records,
    dmarcRecords: result.dmarc_records,
  };
}
