import { CURRENCY, LOCALE } from "./config";

const money = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY });
const moneyRound = new Intl.NumberFormat(LOCALE, { style: "currency", currency: CURRENCY, maximumFractionDigits: 0 });

/** All amounts are stored as integer minor units (pence) to avoid float drift. */
export function formatMoney(cents: number | bigint | null | undefined, opts?: { round?: boolean }) {
  const value = Number(cents ?? 0) / 100;
  return (opts?.round ? moneyRound : money).format(value);
}

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return d.toLocaleDateString(LOCALE, opts ?? { day: "numeric", month: "short", year: "numeric" });
}

/** "2026-10" -> "October 2026" */
export function formatPeriod(period: string) {
  const [y, m] = period.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(LOCALE, { month: "long", year: "numeric", timeZone: "UTC" });
}

/** Today's date as YYYY-MM-DD in UTC (matches Postgres current_date on Supabase). */
export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export function currentPeriod(date = new Date()) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Draws run on the last day of each month. */
export function nextDrawDate(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
}
