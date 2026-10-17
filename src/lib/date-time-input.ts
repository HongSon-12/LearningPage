export type DateTimeMode = "date" | "time" | "datetime-local";
export function isoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12);
  return y >= 1900 && y <= 2199 && isoDate(date) === value ? date : undefined;
}
export function parseDisplay(value: string, mode: DateTimeMode): string | null {
  const text = value.trim();
  if (!text) return "";
  if (mode === "time")
    return /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(text) ? text : null;
  const match = /^(\d{2})\/(\d{2})\/(\d{4})(?: (\d{2}:\d{2}))?$/.exec(text);
  if (!match) return null;
  const date = `${match[3]}-${match[2]}-${match[1]}`;
  if (!parseIsoDate(date)) return null;
  if (mode === "date") return match[4] ? null : date;
  return match[4] && parseDisplay(match[4], "time")
    ? date + "T" + match[4]
    : null;
}
export function displayDateTime(value: string, mode: DateTimeMode) {
  if (!value) return "";
  if (mode === "time") return value;
  const [date, time] = value.split("T");
  const display = date.split("-").reverse().join("/");
  return mode === "datetime-local" ? `${display} ${time || "00:00"}` : display;
}

// Numeric mobile keyboards can enter a full date without typing slash characters.
export function normalizeDateDraft(text: string, mode: DateTimeMode) {
  return mode === "date" && /^\d{8}$/.test(text)
    ? `${text.slice(0, 2)}/${text.slice(2, 4)}/${text.slice(4)}`
    : text;
}
