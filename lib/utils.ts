/** Start of today in ISO format for date-range queries */
export function getTodayStart(): string {
  return new Date().toISOString().split("T")[0] + "T00:00:00";
}

/** Supabase returns relations as object or array; unwrap to single object */
export function unwrapRelation<T>(rel: T | T[] | null | undefined): T | null {
  if (rel == null) return null;
  return Array.isArray(rel) ? rel[0] ?? null : rel;
}
