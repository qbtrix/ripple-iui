// routes/pay/resume.ts — The chat's open order in sessionStorage, so a pay
// link that opened in the same tab (in-app browsers do this) does not lose it:
// /pay/done's link back lands on a chat that brings back the pay or tracking
// card. One order per tab (ORDER_KEY): the session saves it when the store
// opens a checkout, the pay card updates its status, and a cancelled or
// finished order is cleared. Storage is untrusted on the way out: the id must
// pass ORDER_ID, the url the pay-link allowlist, and the summary its shape, or
// the entry is dropped. Every access is wrapped: blocked storage just means no
// resume.

import { isAllowedRedirect, ORDER_ID, type Pay } from '../live/checkout.js';
import { plain } from './orders.js';

export const ORDER_KEY = 'ripple.pawbar.order';
export type SavedStatus = 'pending' | 'paid';
export type Saved = Pay & { status: SavedStatus };
type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

const session = (): Store | undefined => globalThis.sessionStorage;

export function saveOrder(pay: Pay, status: SavedStatus, storage: () => Store | undefined = session) {
	try {
		storage()?.setItem(ORDER_KEY, JSON.stringify({ ...pay, status }));
	} catch {
		/* storage blocked: no resume after a same-tab payment */
	}
}

/** Drops the saved order, or only the one with this id. */
export function clearOrder(id?: string, storage: () => Store | undefined = session) {
	try {
		const s = storage();
		if (id === undefined || readRaw(s)?.sessionId === id) s?.removeItem(ORDER_KEY);
	} catch {
		/* nothing to clear */
	}
}

function readRaw(s: Store | undefined): Record<string, unknown> | null {
	const v: unknown = JSON.parse(s?.getItem(ORDER_KEY) ?? 'null');
	return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
}

const finite = (v: unknown, max: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= max;

/** The saved order if every field passes, else null (and the entry is dropped). */
export function loadOrder(origins: { pageOrigin: string; storeUrl: string }, storage: () => Store | undefined = session): Saved | null {
	let v: Record<string, unknown> | null;
	try {
		v = readRaw(storage());
	} catch {
		v = null;
	}
	if (!v) {
		clearOrder(undefined, storage);
		return null;
	}
	const s = v.summary as Record<string, unknown> | null | undefined;
	const lines = Array.isArray(s?.lines) && s.lines.length <= 30 ? (s.lines as unknown[]) : null;
	const parsed = lines?.map((l) => {
		const r = (l ?? {}) as Record<string, unknown>;
		const name = plain(r.name);
		return name && Number.isInteger(r.qty) && finite(r.qty, 20) && r.qty > 0 && finite(r.price, 100_000) ? { name, qty: r.qty, price: r.price } : null;
	});
	const ok =
		typeof v.sessionId === 'string' &&
		ORDER_ID.test(v.sessionId) &&
		typeof v.url === 'string' &&
		isAllowedRedirect(v.url, origins.pageOrigin, origins.storeUrl) &&
		(v.status === 'pending' || v.status === 'paid') &&
		(s?.orderType === 'pickup' || s?.orderType === 'delivery') &&
		finite(s?.total, 100_000) &&
		parsed?.every((l) => l !== null);
	if (!ok) {
		clearOrder(undefined, storage);
		return null;
	}
	return {
		url: v.url as string,
		sessionId: v.sessionId as string,
		status: v.status as SavedStatus,
		summary: { lines: parsed as Pay['summary']['lines'], orderType: s?.orderType as 'pickup' | 'delivery', total: s?.total as number }
	};
}
