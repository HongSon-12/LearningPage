// Never retain or transmit the other personal information embedded in a card QR.
export function cccdFromQr(payload: string): string | null {
  if (typeof payload !== "string" || payload.length > 4096) return null;
  const text = payload.trim();
  if (/^\d{12}$/.test(text)) return text;
  const fields = text.split("|");
  if (fields.length < 7 || fields.length > 12 || !/^\d{12}$/.test(fields[0]))
    return null;
  return fields[0];
}
