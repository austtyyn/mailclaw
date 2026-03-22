import { promises as dns } from "dns";

export type DnsCheckResult = "pass" | "fail" | "unknown";

export interface DnsVerificationResult {
  spf: DnsCheckResult;
  dkim: DnsCheckResult;
  dmarc: DnsCheckResult;
  spfRecords: string[];
  dkimRecords: string[];
  dmarcRecords: string[];
}

async function resolveTxt(domain: string): Promise<string[]> {
  try {
    const records = await dns.resolveTxt(domain);
    return records.flat().map((r) => r.toString());
  } catch {
    return [];
  }
}

export function parseSpfRecord(txtRecords: string[]): DnsCheckResult {
  const spfRecord = txtRecords.find(
    (r) =>
      r.toLowerCase().startsWith("v=spf1") || r.toLowerCase().includes("v=spf1")
  );
  if (!spfRecord) return "unknown";
  if (spfRecord.toLowerCase().includes("-all")) return "pass";
  if (spfRecord.toLowerCase().includes("~all")) return "pass";
  if (spfRecord.toLowerCase().includes("?all")) return "unknown";
  return "pass";
}

export function parseDmarcRecord(txtRecords: string[]): DnsCheckResult {
  const dmarcRecord = txtRecords.find(
    (r) =>
      r.toLowerCase().startsWith("v=dmarc1") ||
      r.toLowerCase().includes("v=dmarc1")
  );
  if (!dmarcRecord) return "unknown";
  if (dmarcRecord.toLowerCase().includes("p=reject")) return "pass";
  if (dmarcRecord.toLowerCase().includes("p=quarantine")) return "pass";
  if (dmarcRecord.toLowerCase().includes("p=none")) return "pass";
  return "pass";
}

const COMMON_DKIM_SELECTORS = ["default", "mail", "selector1", "selector2", "google", "k1"];

export async function verifyDkimForSelectors(
  domain: string,
  selectors: string[] = COMMON_DKIM_SELECTORS
): Promise<{ result: DnsCheckResult; records: string[] }> {
  const allRecords: string[] = [];
  for (const sel of selectors) {
    const host = `${sel}._domainkey.${domain}`;
    const records = await resolveTxt(host);
    for (const r of records) {
      allRecords.push(r);
      if (
        r.includes("v=DKIM1") ||
        r.toLowerCase().includes("k=rsa") ||
        r.toLowerCase().includes("p=")
      ) {
        return { result: "pass", records: allRecords };
      }
    }
  }
  return {
    result: allRecords.length > 0 ? "fail" : "unknown",
    records: allRecords,
  };
}

export async function verifyDomainDns(domain: string): Promise<DnsVerificationResult> {
  const baseDomain = domain.replace(/^\.+/, "").toLowerCase();
  const spfHost = baseDomain;
  const dmarcHost = `_dmarc.${baseDomain}`;

  const [spfTxt, dmarcTxt, dkimResult] = await Promise.all([
    resolveTxt(spfHost),
    resolveTxt(dmarcHost),
    verifyDkimForSelectors(baseDomain),
  ]);

  const spf = parseSpfRecord(spfTxt);
  const dmarc = parseDmarcRecord(dmarcTxt);

  return {
    spf,
    dkim: dkimResult.result,
    dmarc,
    spfRecords: spfTxt,
    dkimRecords: dkimResult.records,
    dmarcRecords: dmarcTxt,
  };
}

