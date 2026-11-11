const moneyFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 20 });
export function formatMoney(value: number) { return moneyFormat.format(value); }

/** Display Vietnamese grouping, while form state retains the ungrouped numeric string. */
export function formatMoneyInput(value: string): string {
  if (!value) return "";
  const parts = /^(\d+)(?:\.(\d*))?$/.exec(value);
  if (!parts) return Number.isFinite(Number(value)) ? formatMoney(Number(value)) : value;
  return parts[1].replace(/\B(?=(\d{3})+(?!\d))/g, ".") + (parts[2] === undefined ? "" : `,${parts[2]}`);
}
export function parseMoneyInput(value: string): string | null {
  const text = value.replace(/\s/g, "");
  if (!text) return "";
  if (!/^[\d.]*([,]\d*)?$/.test(text)) return null;
  const canonical = text.replace(/\./g, "").replace(",", ".");
  if (!canonical) return "";
  const [whole, fraction] = canonical.split(".");
  const normalized = (whole || "0").replace(/^0+(?=\d)/, "");
  return normalized + (fraction === undefined ? "" : `.${fraction}`);
}
