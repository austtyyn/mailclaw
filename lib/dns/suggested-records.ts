/**
 * Suggested DNS records for users to add at their hosting provider.
 * Users must add these in their DNS panel (Cloudflare, Namecheap, GoDaddy, etc.)
 * then run verification to confirm.
 */

export interface DnsRecordToAdd {
  type: "TXT";
  host: string;
  value: string;
  description: string;
}

/**
 * Generate suggested SPF record for a domain.
 * Generic starter - user may need to add include: for their provider (Gmail, SendGrid, etc.)
 */
export function getSuggestedSpfRecord(domain: string): DnsRecordToAdd {
  return {
    type: "TXT",
    host: "@",
    value: "v=spf1 mx ~all",
    description:
      "Add at your domain root. If you use Gmail, use include:_spf.google.com. For SendGrid: include:sendgrid.net",
  };
}

/**
 * Generate suggested DMARC record for monitoring.
 */
export function getSuggestedDmarcRecord(domain: string): DnsRecordToAdd {
  return {
    type: "TXT",
    host: "_dmarc",
    value: "v=DMARC1; p=none; rua=mailto:dmarc@" + domain,
    description: "Add at _dmarc subdomain. p=none monitors only; change to p=quarantine or p=reject later.",
  };
}

/**
 * DKIM cannot be generated - it requires a key pair from the email provider.
 * Return instructions instead.
 */
export function getDkimInstructions(domain: string): {
  host: string;
  instructions: string;
  providerLinks: { name: string; url: string }[];
} {
  return {
    host: "selector._domainkey",
    instructions:
      "DKIM requires a public key from your email provider. Log into your provider (Gmail, SendGrid, Resend, etc.), generate DKIM for this domain, then add the TXT record they give you.",
    providerLinks: [
      { name: "Gmail / Google Workspace", url: "https://support.google.com/a/answer/174124" },
      { name: "SendGrid", url: "https://docs.sendgrid.com/ui/account-and-settings/api-keys" },
      { name: "Resend", url: "https://resend.com/docs/dashboard/domains/introduction" },
      { name: "Postmark", url: "https://postmarkapp.com/support/article/1008-what-are-dkim-dns-records" },
    ],
  };
}
