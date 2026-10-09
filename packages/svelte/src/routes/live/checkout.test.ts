// routes/live/checkout.test.ts — The host's checkout handler against a mocked
// store: the body it posts (ids + quantities only, returnTo ripple), the pay
// link it hands back (never followed), the allowlist on that link, and the
// 400 / 429 / 503 / network / bad-URL failures it turns into messages.

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
	test('posts ids and quantities only, with returnTo ripple, and hands back the pay link', async () => {
		const fetch = reply(200, { url: 'https://checkout.stripe.com/c/pay/cs_test_1', sessionId: 'cs_test_1' });
		const r = await checkout(body, { storeUrl: STORE + '/', pageOrigin: PAGE, fetch });
		expect(r).toMatchObject({ ok: true, data: { url: 'https://checkout.stripe.com/c/pay/cs_test_1', sessionId: 'cs_test_1' } });
		expect(r.ok && r.data.summary).toEqual({
			lines: [
				{ name: 'Classic Cheeseburger', qty: 2, price: 0.01 },
				{ name: 'Garlic Bread', qty: 1, price: 4.99 }
			],
			orderType: 'pickup',
			total: 5.01
		});
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
	});

	test('a store answer with no usable session id is refused', async () => {
		const r = await checkout(body, { storeUrl: STORE, pageOrigin: PAGE, fetch: reply(200, { url: 'https://checkout.stripe.com/c/pay/x' }) });
		expect(r).toMatchObject({ ok: false, error: { message: expect.stringMatching(/no order to follow/) } });
	});

	test('delivery sends the address', async () => {
		const fetch = reply(200, { url: `${PAGE}/live?order=mock_1&mock=true`, sessionId: 'mock_1' });
		await checkout({ ...body, orderType: 'delivery', customer: { ...body.customer, address: '1 Main St' } }, { storeUrl: STORE, pageOrigin: PAGE, fetch });
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
		const r = await checkout(b, { storeUrl: STORE, pageOrigin: PAGE, fetch });
		expect(r.ok).toBe(false);
		expect(!r.ok && r.error.message).toMatch(msg);
		expect(fetch).not.toHaveBeenCalled();
	});

	test.each([
		[400, { message: 'Invalid cart item' }, {}, /rejected the order: Invalid cart item/],
		[429, { error: 'rate_limited', retryAfter: 300 }, { 'retry-after': '300' }, /Try again in 5 min/],
		[503, { message: 'Failed to create checkout session' }, {}, /cannot take payments/],
		[200, { url: 'javascript:alert(1)', sessionId: 'x' }, {}, /Couldn't start checkout/]
	])('status %i becomes a clear message', async (status, json, headers, msg) => {
		const r = await checkout(body, { storeUrl: STORE, pageOrigin: PAGE, fetch: reply(status, json, headers) });
		expect(r.ok).toBe(false);
		expect(!r.ok && r.error.message).toMatch(msg);
	});

	test('network failure says the store is unreachable', async () => {
		const fetch = vi.fn(async () => {
			throw new TypeError('Failed to fetch');
		});
		const r = await checkout(body, { storeUrl: STORE, pageOrigin: PAGE, fetch });
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

describe('checkout() pay link allowlist', () => {
	const go = async (url: string, pageOrigin = PAGE, storeUrl = STORE) => {
		const r = await checkout(body, { storeUrl, pageOrigin, fetch: reply(200, { url, sessionId: 's' }) });
		return { r };
	};

	test('takes the store origin (its mock pay page), https or localhost', async () => {
		const url = 'https://shop.example/test-store/pay/mock_9b2c-4e1f';
		expect((await go(url, PAGE, 'https://shop.example/test-store')).r).toMatchObject({ ok: true, data: { url } });
		const local = 'http://localhost:3917/test-store/pay/mock_1';
		expect((await go(local, PAGE, 'http://localhost:3917/test-store')).r).toMatchObject({ ok: true, data: { url: local } });
		expect((await go('https://other.example/pay/mock_1', PAGE, 'https://shop.example/test-store')).r.ok).toBe(false);
	});

	test.each([
		['https://checkout.stripe.com/c/pay/cs_test_1', PAGE],
		[`${PAGE}/live?order=mock_1&mock=true`, PAGE],
		['http://localhost:5282/live?order=mock_1&mock=true', 'http://localhost:5282'],
		['http://127.0.0.1:5282/live?order=mock_1&mock=true', 'http://127.0.0.1:5282']
	])('takes %s', async (url, origin) => {
		const { r } = await go(url, origin);
		expect(r).toMatchObject({ ok: true, data: { url } });
	});

	test.each([
		['https://evil.example/', PAGE],
		['http://checkout.stripe.com/c/pay/cs_test_1', PAGE],
		['https://checkout.stripe.com.evil.example/c/pay/x', PAGE],
		['http://ripple.example/live?order=mock_1', 'http://ripple.example'],
		['http://store.test/test-store/checkout/success', PAGE],
		['not a url', PAGE]
	])('refuses %s', async (url, origin) => {
		const { r } = await go(url, origin);
		expect(r).toMatchObject({ ok: false, error: { message: expect.stringMatching(/Couldn't start checkout/) } });
	});
});

describe('readReturn()', () => {
	test('reads a Stripe or mock session and the cancelled flag', () => {
		expect(readReturn('?order=cs_test_a1B2&x=1')).toEqual({ order: 'cs_test_a1B2', mock: false, cancelled: false });
		expect(readReturn('?order=mock_1791&mock=true')).toEqual({ order: 'mock_1791', mock: true, cancelled: false });
		expect(readReturn('?cancelled=1')).toEqual({ order: null, mock: false, cancelled: true });
		expect(readReturn('?order=mock_0f8e-4b1a-9c2d&cancelled=1')).toEqual({ order: 'mock_0f8e-4b1a-9c2d', mock: false, cancelled: true });
		expect(readReturn('?order=mock_0f8e-4b1a-9c2d')).toMatchObject({ order: 'mock_0f8e-4b1a-9c2d' });
	});

	test.each(['?order=Free%20money%2C%20call%20555', '?order=', `?order=${'a'.repeat(256)}`, '?order=<b>x</b>', '?s=order-burger', ''])(
		'ignores %s',
		(q) => expect(readReturn(q)).toBeNull()
	);
});

describe('toStoreRequest with a menu-order Cart', () => {
	const cart = (over: Record<string, unknown> = {}) => ({
		lines: [
			{ product_id: 'burger-1', qty: 2, option_ids: ['size-large', 'extra-cheese'], name: 'Classic Cheeseburger', unit_price: 14.49 },
			{ product_id: 'drink-2', qty: 1, option_ids: [], name: 'Iced Tea', unit_price: 2.99 }
		],
		fulfilment: 'pickup',
		customer: { name: 'Sam', email: 'sam@example.com', phone: '555 0100' },
		total: 31.97,
		...over
	});

	test('maps lines to ids, quantities and option ids, fulfilment to orderType', () => {
		const r = toStoreRequest(cart());
		expect(r).toEqual({
			request: {
				items: [
					{ item: { id: 'burger-1' }, quantity: 2, options: ['size-large', 'extra-cheese'] },
					{ item: { id: 'drink-2' }, quantity: 1, options: [] }
				],
				customer: { name: 'Sam', email: 'sam@example.com', phone: '555 0100' },
				orderType: 'pickup',
				returnTo: 'ripple'
			},
			summary: {
				lines: [
					{ name: 'Classic Cheeseburger', qty: 2, price: 14.49 },
					{ name: 'Iced Tea', qty: 1, price: 2.99 }
				],
				orderType: 'pickup',
				total: 31.97
			}
		});
		// The card's prices and total never reach the store.
		expect(JSON.stringify((r as { request: unknown }).request)).not.toMatch(/14\.49|31\.97|unit_price|total/);
	});

	test('delivery carries the address', () => {
		const r = toStoreRequest(cart({ fulfilment: 'delivery', customer: { name: 'Sam', email: 'sam@example.com', phone: '555 0100', address: '1 Main St' } }));
		expect(r).toMatchObject({ request: { orderType: 'delivery', customer: { address: '1 Main St' } } });
		expect(toStoreRequest(cart({ fulfilment: 'delivery' }))).toEqual({ error: 'Enter a delivery address.' });
	});

	test.each([
		['qty 0', { lines: [{ product_id: 'burger-1', qty: 0, option_ids: [] }] }, 'Up to 20'],
		['qty 21', { lines: [{ product_id: 'burger-1', qty: 21, option_ids: [] }] }, 'Up to 20'],
		['qty 1.5', { lines: [{ product_id: 'burger-1', qty: 1.5, option_ids: [] }] }, 'Up to 20'],
		['31 lines', { lines: Array.from({ length: 31 }, () => ({ product_id: 'burger-1', qty: 1, option_ids: [] })) }, 'Up to 30 lines'],
		['no lines', { lines: [] }, 'Add at least one item'],
		['a bad product id', { lines: [{ product_id: '../x', qty: 1, option_ids: [] }] }, 'does not recognise'],
		['a bad option id', { lines: [{ product_id: 'burger-1', qty: 1, option_ids: [{ id: 'x' }] }] }, 'option this page'],
		['options not a list', { lines: [{ product_id: 'burger-1', qty: 1, option_ids: 'size-large' }] }, 'option this page'],
		['no phone (the store needs all three)', { customer: { name: 'Sam', email: 'sam@example.com' } }, 'needs a phone number'],
		['no name', { customer: { email: 'sam@example.com', phone: '555 0100' } }, 'Enter your name'],
		['no email', { customer: { name: 'Sam', phone: '555 0100' } }, 'valid email'],
		['a long name', { customer: { name: 'x'.repeat(81), email: 'sam@example.com', phone: '555 0100' } }, 'under 80'],
		['a junk phone', { customer: { name: 'Sam', email: 'sam@example.com', phone: 'call me' } }, 'valid phone'],
		['no fulfilment', { fulfilment: undefined }, 'pickup or delivery']
	])('refuses %s', (_, over, message) => {
		const r = toStoreRequest(cart(over));
		expect('error' in r && r.error).toContain(message);
	});

	test('checkout() posts the mapped Cart and returns its summary with the card total', async () => {
		const fetch = reply(200, { url: `${PAGE}/live?order=mock_1&mock=true`, sessionId: 'mock_1' });
		const r = await checkout(cart(), { storeUrl: STORE, pageOrigin: PAGE, fetch });
		expect(r.ok).toBe(true);
		const [, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(JSON.parse(init.body as string).items[0]).toEqual({ item: { id: 'burger-1' }, quantity: 2, options: ['size-large', 'extra-cheese'] });
		expect(r.ok && r.data).toMatchObject({ sessionId: 'mock_1', summary: { orderType: 'pickup' } });
	});
});
