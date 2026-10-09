// widgets/data-kit/format.ts — the data-hygiene helpers every data widget
// renders values through (design doc 2026-10-09 §2.8). Props are model output:
// text carries markdown habits, numbers arrive as NaN or strings, a currency
// code can be '$', a date can be "next Tuesday". Each helper returns a display
// string (or a sortable number) and never throws, so a bad value shows as
// 'n/a' or as written, never as an error box or "Invalid Date".
//
// Dates: dateLabel shows what the writer wrote. The one thing it formats is an
// ISO calendar day (YYYY-MM-DD, optionally followed by a time), and it formats
// that day's own digits in UTC, so no timezone can move it to the day before.
// dateKey is for sorting only and accepts ISO strings only (V8 reads
// "Fri 16 Oct" as the year 2001).
import { asText } from '@ripple-ui/core';

/** A finite number from a number or a numeric string, else undefined. */
export function finite(v: unknown): number | undefined {
	const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : v;
	return typeof n === 'number' && Number.isFinite(n) ? n : undefined;
}

/** A plain number for display; non-finite input renders 'n/a'. */
export function num(v: unknown, opts: { locale?: string; digits?: number } = {}): string {
	const n = finite(v);
	if (n === undefined) return 'n/a';
	try {
		return new Intl.NumberFormat(opts.locale, { maximumFractionDigits: opts.digits ?? 2 }).format(n);
	} catch {
		return String(n);
	}
}

/** Sum of the finite values; anything else drops out instead of poisoning the total. */
export function sum(values: unknown): number {
	let total = 0;
	if (Array.isArray(values)) for (const v of values) total += finite(v) ?? 0;
	return total;
}

/**
 * Money through Intl. `currency` is ISO 4217 from the widget (default USD);
 * a malformed code or locale falls back to USD instead of throwing a
 * RangeError into the widget. `sign: true` prints '+$8.00' for deltas.
 */
export function money(
	v: unknown,
	currency: unknown = 'USD',
	opts: { locale?: string; sign?: boolean } = {}
): string {
	const n = finite(v);
	if (n === undefined) return 'n/a';
	const base: Intl.NumberFormatOptions = { style: 'currency', signDisplay: opts.sign ? 'exceptZero' : 'auto' };
	const code = typeof currency === 'string' && currency.trim() ? currency.trim().toUpperCase() : 'USD';
	try {
		return new Intl.NumberFormat(opts.locale, { ...base, currency: code }).format(n);
	} catch {
		return new Intl.NumberFormat(undefined, { ...base, currency: 'USD' }).format(n);
	}
}

/**
 * Plain text from a prop: paired `**bold**` / `__bold__` markers and a leading
 * `- ` per line are stripped, so a model's markdown habit never shows raw.
 * There is no markdown renderer; long text belongs in structured `points[]`.
 */
export function plain(v: unknown): string {
	return asText(v)
		.replace(/\*\*([^*\s](?:[^*]*[^*\s])?)\*\*/g, '$1')
		.replace(/__([^_\s](?:[^_]*[^_\s])?)__/g, '$1')
		.replace(/^[ \t]*- +/gm, '')
		.trim();
}

const ISO_DAY = /^(\d{4}-\d{2}-\d{2})(?:$|[T ])/;

/** Sort key for an ISO date or datetime, else undefined. Never display it. */
export function dateKey(v: unknown): number | undefined {
	if (typeof v !== 'string' || !ISO_DAY.test(v.trim())) return undefined;
	const t = Date.parse(v.trim());
	return Number.isNaN(t) ? undefined : t;
}

/**
 * A date as the reader should see it. Labels ("Next Tuesday", "Fri 16 Oct")
 * come back as written; a valid ISO day is formatted from its own digits in
 * UTC ("2026-10-16" → "Fri, Oct 16"); an impossible ISO day ("2026-02-31")
 * comes back as written. Missing input is ''.
 */
export function dateLabel(v: unknown, locale?: string): string {
	const s = plain(v);
	const day = ISO_DAY.exec(s)?.[1];
	if (!day) return s;
	const t = Date.parse(day);
	// Date.parse rolls 2026-02-31 over to March 3; the round trip catches it.
	if (Number.isNaN(t) || new Date(t).toISOString().slice(0, 10) !== day) return s;
	const opts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric', timeZone: 'UTC' };
	try {
		return new Intl.DateTimeFormat(locale, opts).format(t);
	} catch {
		return new Intl.DateTimeFormat(undefined, opts).format(t);
	}
}
