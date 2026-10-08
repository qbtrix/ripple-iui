// routes/live/checkout.test.ts — The /live host's checkout handler against a
// mocked store: the body it posts (ids + quantities only, returnTo ripple), and
// the 400 / 429 / 503 / network / bad-URL failures it turns into messages.

import { describe, expect, test, vi } from 'vitest';
import { checkout, isCheckoutEvent, readReturn, toStoreRequest } from './checkout.js';

const STORE = 'http://store.test/test-store';
const PAGE = 'https://ripple.example';
const body = {
	items: [
		{ id: 'burger-1', name: 'Classic Cheeseburger', price: 0.01, qty: 2 },
		{ id: 'drink-1', name: 'Fresh Lemonade', price: 3.99, qty: 0 },
		{ id: 'app-2', name: 'Garlic Bread', price: 4.99, qty: 1 }
	],
	customer: { name: 'Sam', email: 'sam@example.com', phone: '555 0100', address: '' },
	orderType: 'pickup'
};
const reply = (status: number, json: unknown, headers: Record<string, string> = {}) =>
	vi.fn(async () => new Response(JSON.stringify(json), { status, headers }));

describe('checkout()', () => {
	test('posts ids and quantities only, with returnTo ripple, then navigates', async () => {
		const fetch = reply(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_1', sessionId: 'cs_test_1' });
		const navigate = vi.fn();
		const remember = vi.fn();
		const r = await checkout(body, { storeUrl: STORE + '/', pageOrigin: PAGE, fetch, navigate, remember });
		expect(r).toEqual({ ok: true, data: { sessionId: 'cs_test_1' } });
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe(`${STORE}/api/checkout`);
		expect(init.method).toBe('POST');
		const sent = JSON.parse(init.body as string);
		expect(sent).toEqual({
			items: [
				{ item: { id: 'burger-1' }, quantity: 2 },
				{ item: { id: 'app-2' }, quantity: 1 }
			],
			customer: { name: 'Sam', email: 'sam@example.com', phone: '555 0100' },
			orderType: 'pickup',
			returnTo: 'ripple'
		});
		expect(init.body).not.toMatch(/price|0\.01/);
		expect(navigate).toHaveBeenCalledWith('https://checkout.stripe.com/c/pay/cs_test_1');
		expect(remember.mock.calls[0][0].lines).toHaveLength(2);
	});

	test('delivery sends the address', async () => {
		const fetch = reply(200, { url: `${PAGE}/live?order=mock_1&mock=true`, sessionId: 'mock_1' });
		await checkout({ ...body, orderType: 'delivery', customer: { ...body.customer, address: '1 Main St' } }, { storeUrl: STORE, pageOrigin: PAGE, fetch, navigate: vi.fn() });
		expect(JSON.parse((fetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string).customer.address).toBe('1 Main St');
	});

	test.each([
		['empty cart', { ...body, items: body.items.map((i) => ({ ...i, qty: 0 })) }, /at least one item/],
		['bad email', { ...body, customer: { ...body.customer, email: 'nope' } }, /email/],
		['no phone', { ...body, customer: { ...body.customer, phone: '' } }, /phone/],
		['delivery without address', { ...body, orderType: 'delivery' }, /address/],
		['items not a list', { ...body, items: '{state.menu}' }, /items/]
	])('rejects %s before calling the store', async (_n, b, msg) => {
		const fetch = reply(200, {});
		const r = await checkout(b, { storeUrl: STORE, pageOrigin: PAGE, fetch, navigate: vi.fn() });
		expect(r.ok).toBe(false);
		expect(r.error?.message).toMatch(msg);
		expect(fetch).not.toHaveBeenCalled();
	});

	test.each([
		[400, { message: 'Invalid cart item' }, {}, /rejected the order: Invalid cart item/],
		[429, { error: 'rate_limited', retryAfter: 300 }, { 'retry-after': '300' }, /Try again in 5 min/],
		[503, { message: 'Failed to create checkout session' }, {}, /cannot take payments/],
		[200, { url: 'javascript:alert(1)', sessionId: 'x' }, {}, /Couldn't start checkout/]
	])('status %i becomes a clear message and no navigation', async (status, json, headers, msg) => {
		const navigate = vi.fn();
		const r = await checkout(body, { storeUrl: STORE, pageOrigin: PAGE, fetch: reply(status, json, headers), navigate });
		expect(r.ok).toBe(false);
		expect(r.error?.message).toMatch(msg);
		expect(navigate).not.toHaveBeenCalled();
	});

	test('network failure says the store is unreachable', async () => {
		const fetch = vi.fn(async () => {
			throw new TypeError('Failed to fetch');
		});
		const r = await checkout(body, { storeUrl: STORE, pageOrigin: PAGE, fetch, navigate: vi.fn() });
		expect(r).toMatchObject({ ok: false, error: { message: expect.stringMatching(/reach the store/) } });
	});
});

test('isCheckoutEvent keys on api + /api/checkout only', () => {
	expect(isCheckoutEvent({ type: 'api', url: '/api/checkout' })).toBe(true);
	expect(isCheckoutEvent({ type: 'api', url: '/api/todos' })).toBe(false);
	expect(isCheckoutEvent({ type: 'emit', url: '/api/checkout' } as never)).toBe(false);
});

test('toStoreRequest summary keeps display prices for the receipt only', () => {
	const r = toStoreRequest(body);
	expect('summary' in r && r.summary.lines[0]).toEqual({ name: 'Classic Cheeseburger', qty: 2, price: 0.01 });
});

describe('checkout() redirect allowlist', () => {
	const go = async (url: string, pageOrigin = PAGE) => {
		const navigate = vi.fn();
		const r = await checkout(body, { storeUrl: STORE, pageOrigin, fetch: reply(200, { url, sessionId: 's' }), navigate });
		return { r, navigate };
	};

	test.each([
		['https://checkout.stripe.com/c/pay/cs_test_1', PAGE],
		[`${PAGE}/live?order=mock_1&mock=true`, PAGE],
		['http://localhost:5282/live?order=mock_1&mock=true', 'http://localhost:5282'],
		['http://127.0.0.1:5282/live?order=mock_1&mock=true', 'http://127.0.0.1:5282']
	])('follows %s', async (url, origin) => {
		const { r, navigate } = await go(url, origin);
		expect(r.ok).toBe(true);
		expect(navigate).toHaveBeenCalledWith(url);
	});

	test.each([
		['https://evil.example/', PAGE],
		['http://checkout.stripe.com/c/pay/cs_test_1', PAGE],
		['https://checkout.stripe.com.evil.example/c/pay/x', PAGE],
		['http://ripple.example/live?order=mock_1', 'http://ripple.example'],
		['http://store.test/test-store/checkout/success', PAGE],
		['not a url', PAGE]
	])('refuses %s with no redirect', async (url, origin) => {
		const { r, navigate } = await go(url, origin);
		expect(r).toMatchObject({ ok: false, error: { message: expect.stringMatching(/Couldn't start checkout/) } });
		expect(navigate).not.toHaveBeenCalled();
	});
});

describe('readReturn()', () => {
	test('reads a Stripe or mock session and the cancelled flag', () => {
		expect(readReturn('?order=cs_test_a1B2&x=1')).toEqual({ order: 'cs_test_a1B2', mock: false, cancelled: false });
		expect(readReturn('?order=mock_1791&mock=true')).toEqual({ order: 'mock_1791', mock: true, cancelled: false });
		expect(readReturn('?cancelled=1')).toEqual({ order: null, mock: false, cancelled: true });
	});

	test.each(['?order=Free%20money%2C%20call%20555', '?order=', `?order=${'a'.repeat(256)}`, '?order=<b>x</b>', '?s=order-burger', ''])(
		'ignores %s',
		(q) => expect(readReturn(q)).toBeNull()
	);
});
