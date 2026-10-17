// Normalize formatting only; preserve invalid legacy IDs for staff review.
export function normalizeCccd(value: string) {
  return value.trim().replace(/[\s.-]/g, "");
}
export function canonicalCccd(value?: string | null) {
  const normalized = normalizeCccd(value || "");
  return /^[0-9]{12}$/.test(normalized) ? normalized : null;
}
