// routes/live/checkout.ts — The /live host's side of the order-burger demo.
//
// EVENT CONTRACT. A spec never makes HTTP calls. The order spec's Checkout
// button runs an `api` action shaped exactly like this (body values must be
// top-level "{expr}" strings: handleApi resolves one level only):
//   {"action":"api","url":"/api/checkout","method":"POST",
//    "body":{"items":"{state.menu}","customer":"{state.customer}","orderType":"{state.orderType}"}}
// `items` is the menu array; each line is {id, name, price, qty}. The host
// keeps lines with qty > 0 and sends ONLY {item:{id}, quantity}: the store
// reprices every line server-side, so spec prices are display-only and never
// leave the page. The spec's URL is a marker; the store base is host config
// (PUBLIC_STORE_URL), never part of the fixture.
//
// checkout() validates, POSTs `${storeUrl}/api/checkout` with returnTo:'ripple',
// and resolves to a RippleEventResult so the spec's on_error can run too.
// On success it hands the Stripe Checkout (or mock) URL to `navigate`.

import type { RippleEvent, RippleEventResult } from '$lib/index.js';

export const CHECKOUT_PATH = '/api/checkout';
export const DEFAULT_STORE_URL = 'https://lab.pocketpaw.xyz/test-store';
export const ORDER_SUMMARY_KEY = 'ripple-live-order';

export interface OrderLine {
	id: string;
	name: string;
	price: number;
	qty: number;
}
export interface OrderSummary {
	lines: { name: string; qty: number; price: number }[];
	orderType: 'pickup' | 'delivery';
}

export function isCheckoutEvent(e: RippleEvent): boolean {
	return e.type === 'api' && typeof e.url === 'string' && e.url.endsWith(CHECKOUT_PATH);
}

type Fail = { ok: false; error: { message: string; status?: number } };
const fail = (message: string, status?: number): Fail => ({ ok: false, error: { message, status } });

/** Parse the spec's body into what the store accepts, or an error message. */
export function toStoreRequest(body: unknown):
	| { request: Record<string, unknown>; summary: OrderSummary }
	| { error: string } {
	const b = (body ?? {}) as { items?: unknown; customer?: unknown; orderType?: unknown };
	if (!Array.isArray(b.items)) return { error: 'The order has no items list.' };
	const lines = (b.items as Partial<OrderLine & { quantity: number }>[])
		.map((l) => ({ id: l?.id, name: String(l?.name ?? l?.id ?? ''), price: Number(l?.price) || 0, qty: Number(l?.qty ?? l?.quantity) }))
		.filter((l) => typeof l.id === 'string' && l.id && Number.isInteger(l.qty) && l.qty > 0);
	if (lines.length === 0) return { error: 'Add at least one item before checking out.' };
	if (lines.some((l) => l.qty > 20)) return { error: 'Up to 20 of each item per order.' };

	const c = (b.customer ?? {}) as Record<string, unknown>;
	const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '');
	const customer = { name: str(c.name), email: str(c.email), phone: str(c.phone), address: str(c.address) };
	if (!customer.name || !customer.phone) return { error: 'Enter your name and phone number.' };
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return { error: 'Enter a valid email address.' };
	const orderType = b.orderType === 'delivery' ? 'delivery' : b.orderType === 'pickup' ? 'pickup' : null;
	if (!orderType) return { error: 'Choose pickup or delivery.' };
	if (orderType === 'delivery' && !customer.address) return { error: 'Enter a delivery address.' };

	return {
		request: {
			items: lines.map((l) => ({ item: { id: l.id }, quantity: l.qty })),
			customer: orderType === 'delivery' ? customer : { name: customer.name, email: customer.email, phone: customer.phone },
			orderType,
			returnTo: 'ripple'
		},
		summary: { lines: lines.map(({ name, qty, price }) => ({ name, qty, price })), orderType }
	};
}

export interface CheckoutDeps {
	storeUrl: string;
	fetch?: typeof fetch;
	navigate: (url: string) => void;
	/** Called with the cart summary just before navigating, so /live?order= can show it. */
	remember?: (summary: OrderSummary) => void;
}

export async function checkout(body: unknown, deps: CheckoutDeps): Promise<RippleEventResult> {
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
	if (!res.ok) return fail(`The store rejected the order: ${String(data?.message ?? res.statusText ?? 'bad request')}`, res.status);

	const url = typeof data?.url === 'string' ? data.url : '';
	let safe = false;
	try {
		safe = ['https:', 'http:'].includes(new URL(url).protocol);
	} catch {
		/* not a URL */
	}
	if (!safe) return fail('The store sent back an unusable checkout link.', res.status);
	deps.remember?.(parsed.summary);
	deps.navigate(url);
	return { ok: true, data: { sessionId: data?.sessionId } };
}
