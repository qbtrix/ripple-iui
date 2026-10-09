// routes/live/checkout.ts — The host's side of buying from the test store, for
// /live's order demo and the landing chat's `menu-order` card.
//
// TWO BODY SHAPES, one store request. A spec never makes HTTP calls.
//  - /live's order spec runs an `api` action shaped like this (body values must
//    be top-level "{expr}" strings: handleApi resolves one level only):
//      {"action":"api","url":"/api/checkout","method":"POST",
//       "body":{"items":"{state.menu}","customer":"{state.customer}","orderType":"{state.orderType}"}}
//    `items` is the menu array; each line is {id, name, price, qty}; lines with
//    qty 0 are dropped.
//  - The chat's `menu-order` card emits the `checkout` host event with a Cart:
//    {lines:[{product_id, qty, option_ids, name, unit_price}], fulfilment,
//    customer, total}.
// Both become {items:[{item:{id}, quantity, options?}], customer, orderType,
// returnTo:'ripple'}. The store reprices every line and option, so names and
// prices are display-only and never leave the page. The host re-checks what it
// sends (qty 1 to 20, at most 30 lines, ids and field lengths): the store
// wants name, email AND phone. The spec's URL is a marker; the store base is
// host config (PUBLIC_STORE_URL), never part of the card.
//
// checkout() validates, POSTs `${storeUrl}/api/checkout`, and resolves to
// {ok, data: Pay}: the payment url, the session id and the cart summary. It
// never navigates: the caller shows a pay card (pawbar/PayCard.svelte) whose
// link opens the url in a new tab. The url must pass isAllowedRedirect (Stripe
// Checkout, the store's own origin for its mock pay page, or this page), https
// unless the host is localhost, so a bad store response can't send visitors
// elsewhere. readReturn() accepts only a session-id-shaped `?order=`
// (ORDER_ID, shared with /pay/done) so a crafted link can't fake a receipt.

import type { RippleEvent } from '$lib/index.js';

export const CHECKOUT_PATH = '/api/checkout';

export interface OrderLine {
	id: string;
	name: string;
	price: number;
	qty: number;
}
export interface OrderSummary {
	lines: { name: string; qty: number; price: number }[];
	orderType: 'pickup' | 'delivery';
	/** Display only: the card's own total, or the lines' sum. The store's total wins once it answers. */
	total: number;
}

/** What a started checkout hands the pay card. */
export interface Pay {
	url: string;
	sessionId: string;
	summary: OrderSummary;
}

export function isCheckoutEvent(e: RippleEvent): boolean {
	return e.type === 'api' && typeof e.url === 'string' && e.url.endsWith(CHECKOUT_PATH);
}

type Fail = { ok: false; error: { message: string; status?: number } };
const fail = (message: string, status?: number): Fail => ({ ok: false, error: { message, status } });

const MAX_LINES = 30;
const MAX_QTY = 20;
const ID = /^[A-Za-z0-9_-]{1,64}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE = /^\+?[\d\s().-]{7,24}$/;
const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');

type Line = { id: string; name: string; price: number; qty: number; options?: string[] };

/** /live's menu array: rows without a positive whole qty are just menu rows. */
function legacyLines(items: unknown[]): Line[] {
	return (items as Partial<OrderLine & { quantity: number }>[])
		.map((l) => ({ id: l?.id, name: String(l?.name ?? l?.id ?? ''), price: Number(l?.price) || 0, qty: Number(l?.qty ?? l?.quantity) }))
		.filter((l): l is Line => typeof l.id === 'string' && !!l.id && Number.isInteger(l.qty) && l.qty > 0);
}

/** The menu-order card's Cart lines. */
function cartLines(lines: unknown[]): Line[] | string {
	const out: Line[] = [];
	for (const raw of lines) {
		const l = (raw ?? {}) as Record<string, unknown>;
		const options = l.option_ids ?? [];
		if (typeof l.product_id !== 'string' || !ID.test(l.product_id)) return 'The order has an item this page does not recognise.';
		if (!Array.isArray(options) || options.length > 20 || !options.every((o) => typeof o === 'string' && ID.test(o)))
			return 'The order has an option this page does not recognise.';
		out.push({ id: l.product_id, name: str(l.name).slice(0, 120) || l.product_id, price: Number(l.unit_price) || 0, qty: Number(l.qty), options });
	}
	return out;
}

/** Parse either body shape into what the store accepts, or an error message. */
export function toStoreRequest(body: unknown):
	| { request: Record<string, unknown>; summary: OrderSummary }
	| { error: string } {
	const b = (body ?? {}) as { items?: unknown; lines?: unknown; customer?: unknown; orderType?: unknown; fulfilment?: unknown; total?: unknown };
	const isCart = Array.isArray(b.lines);
	if (!isCart && !Array.isArray(b.items)) return { error: 'The order has no items list.' };
	const lines = isCart ? cartLines(b.lines as unknown[]) : legacyLines(b.items as unknown[]);
	if (typeof lines === 'string') return { error: lines };
	if (lines.length === 0) return { error: 'Add at least one item before checking out.' };
	if (lines.length > MAX_LINES) return { error: `Up to ${MAX_LINES} lines per order.` };
	if (lines.some((l) => !Number.isInteger(l.qty) || l.qty < 1 || l.qty > MAX_QTY)) return { error: `Up to ${MAX_QTY} of each item per order.` };

	const c = (b.customer ?? {}) as Record<string, unknown>;
	const customer = { name: str(c.name), email: str(c.email), phone: str(c.phone), address: str(c.address) };
	if (!customer.name) return { error: 'Enter your name.' };
	if (!customer.phone) return { error: 'The store needs a phone number too. Add one under Details.' };
	if (customer.name.length > 80) return { error: 'Keep the name under 80 characters.' };
	if (customer.email.length > 254 || !EMAIL.test(customer.email)) return { error: 'Enter a valid email address.' };
	if (!PHONE.test(customer.phone) || customer.phone.replace(/\D/g, '').length < 7) return { error: 'Enter a valid phone number.' };
	const type = isCart ? b.fulfilment : b.orderType;
	const orderType = type === 'delivery' ? 'delivery' : type === 'pickup' ? 'pickup' : null;
	if (!orderType) return { error: 'Choose pickup or delivery.' };
	if (orderType === 'delivery' && !customer.address) return { error: 'Enter a delivery address.' };
	if (customer.address.length > 200) return { error: 'Keep the address under 200 characters.' };

	return {
		request: {
			items: lines.map((l) => ({ item: { id: l.id }, quantity: l.qty, ...(l.options ? { options: l.options } : {}) })),
			customer: orderType === 'delivery' ? customer : { name: customer.name, email: customer.email, phone: customer.phone },
			orderType,
			returnTo: 'ripple'
		},
		summary: {
			lines: lines.map(({ name, qty, price }) => ({ name, qty, price })),
			orderType,
			total: typeof b.total === 'number' && Number.isFinite(b.total) && b.total >= 0 ? b.total : lines.reduce((a, l) => a + l.price * l.qty, 0)
		}
	};
}

export interface CheckoutDeps {
	storeUrl: string;
	/** location.origin: an older store's mock mode returned here. */
	pageOrigin: string;
	fetch?: typeof fetch;
}

export async function checkout(body: unknown, deps: CheckoutDeps): Promise<{ ok: true; data: Pay } | Fail> {
	const parsed = toStoreRequest(body);
	if ('error' in parsed) return fail(parsed.error, 400);
	let res: Response;
	try {
		res = await (deps.fetch ?? fetch)(`${deps.storeUrl.replace(/\/$/, '')}${CHECKOUT_PATH}`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify(parsed.request)
		});
	} catch {
		return fail("Can't reach the store right now. Check your connection and try again.");
	}
	const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
	if (res.status === 429) {
		const wait = Number(data?.retryAfter ?? res.headers.get('retry-after'));
		return fail(`Too many checkouts from here. Try again in ${wait > 0 ? `${Math.ceil(wait / 60)} min` : 'a few minutes'}.`, 429);
	}
	if (res.status >= 500) return fail('The store cannot take payments right now. Try again shortly.', res.status);
	if (!res.ok) {
		const reason = typeof data?.message === 'string' ? data.message : res.statusText || 'bad request';
		return fail(`The store rejected the order: ${reason}`, res.status);
	}

	const url = typeof data?.url === 'string' ? data.url : '';
	const sessionId = typeof data?.sessionId === 'string' ? data.sessionId : '';
	if (!isAllowedRedirect(url, deps.pageOrigin, deps.storeUrl)) {
		return fail("Couldn't start checkout: the store sent back a payment link this page won't follow.", res.status);
	}
	if (!ORDER_ID.test(sessionId)) return fail("Couldn't start checkout: the store sent back no order to follow.", res.status);
	return { ok: true, data: { url, sessionId, summary: parsed.summary } };
}

const STRIPE_CHECKOUT = 'https://checkout.stripe.com';
export const LOCAL_HOSTS = ['localhost', '127.0.0.1'];

const originOf = (url: string) => {
	try {
		return new URL(url).origin;
	} catch {
		return null;
	}
};

/** Stripe Checkout, the store's origin (its mock pay page) or this page; https unless localhost. */
export function isAllowedRedirect(url: string, pageOrigin: string, storeUrl?: string): boolean {
	let u: URL;
	try {
		u = new URL(url);
	} catch {
		return false;
	}
	if (u.origin !== STRIPE_CHECKOUT && u.origin !== pageOrigin && u.origin !== (storeUrl && originOf(storeUrl))) return false;
	return u.protocol === 'https:' || (u.protocol === 'http:' && LOCAL_HOSTS.includes(u.hostname));
}

/** A checkout session id: Stripe `cs_test_...`, or the mock store's `mock_<uuid>`. */
export const ORDER_ID = /^[A-Za-z0-9_-]{1,255}$/;

/**
 * The store's return: `?order=<session>[&mock=true]` or `?cancelled=1` (with the
 * order when the store sends it); null otherwise. A malformed order reads as none.
 */
export function readReturn(search: string): { order: string | null; mock: boolean; cancelled: boolean } | null {
	const q = new URLSearchParams(search);
	const raw = q.get('order');
	const order = raw && ORDER_ID.test(raw) ? raw : null;
	if (q.has('cancelled')) return { order, mock: false, cancelled: true };
	return order ? { order, mock: q.get('mock') === 'true', cancelled: false } : null;
}
