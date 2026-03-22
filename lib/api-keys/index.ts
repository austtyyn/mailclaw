import { createHash, randomBytes } from "crypto";

const KEY_PREFIX = "mf_";
const KEY_BYTES = 32;

export function generateApiKey(): { raw: string; hashed: string } {
  const raw = KEY_PREFIX + randomBytes(KEY_BYTES).toString("hex");
  const hashed = hashApiKey(raw);
  return { raw, hashed };
}

export function hashApiKey(key: string): string {
  return createHash("sha256").update(key).digest("hex");
}

export function verifyApiKey(rawKey: string, hashedKey: string): boolean {
  if (!rawKey.startsWith(KEY_PREFIX)) return false;
  const hashed = hashApiKey(rawKey);
  return hashed === hashedKey;
}

export function extractBearerKey(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  return authHeader.slice(7).trim();
}
