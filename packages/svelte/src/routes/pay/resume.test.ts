// routes/pay/resume.test.ts — The open order in sessionStorage: it round-trips,
// anything tampered with (id, pay url, status, summary) is dropped on load,
// blocked storage never throws, and a chat that comes back after a same-tab
// payment shows the pay card again from it.

import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import Chat from '../pawbar/Chat.svelte';
import { ChatSession } from '../pawbar/session.svelte.js';
import { clearOrder, loadOrder, ORDER_KEY, saveOrder } from './resume.js';
import { ORDER_ID, orderBody, storeFetch } from './fixtures.js';

const STORE = 'https://shop.example/test-store';
const PAGE = 'https://ripple.example';
const origins = { pageOrigin: PAGE, storeUrl: STORE };
const pay = {
	url: `${STORE}/pay/${ORDER_ID}`,
	sessionId: ORDER_ID,
	summary: { lines: [{ name: 'Classic Cheeseburger', qty: 1, price: 13.49 }], orderType: 'delivery' as const, total: 17.48 }
};
const put = (v: unknown) => sessionStorage.setItem(ORDER_KEY, JSON.stringify(v));

beforeEach(() => sessionStorage.clear());
afterEach(() => sessionStorage.clear());

describe('saveOrder / loadOrder', () => {
	test('round-trips a pending or paid order', () => {
		saveOrder(pay, 'pending');
		expect(loadOrder(origins)).toEqual({ ...pay, status: 'pending' });
		saveOrder(pay, 'paid');
		expect(loadOrder(origins)?.status).toBe('paid');
	});

	test.each([
		['a bad order id', { ...pay, sessionId: '../admin', status: 'pending' }],
		['a pay url off the allowlist', { ...pay, url: 'https://evil.example/pay', status: 'pending' }],
		['an http pay url', { ...pay, url: 'http://shop.example/test-store/pay/x', status: 'pending' }],
		['an unknown status', { ...pay, status: 'delivered' }],
		['a NaN total', { ...pay, summary: { ...pay.summary, total: null }, status: 'pending' }],
		['a bad line', { ...pay, summary: { ...pay.summary, lines: [{ name: 'x', qty: 99, price: 1 }] }, status: 'pending' }],
		['not an object', ['x']],
		['not JSON', '{']
	])('drops %s', (_n, v) => {
		if (typeof v === 'string') sessionStorage.setItem(ORDER_KEY, v);
		else put(v);
		expect(loadOrder(origins)).toBeNull();
		expect(sessionStorage.getItem(ORDER_KEY)).toBeNull();
	});

	test('blocked storage never throws', () => {
		const blocked = () => {
			throw new DOMException('denied', 'SecurityError');
		};
		expect(() => saveOrder(pay, 'pending', blocked)).not.toThrow();
		expect(loadOrder(origins, blocked)).toBeNull();
		expect(() => clearOrder(ORDER_ID, blocked)).not.toThrow();
	});

	test('clearOrder(id) leaves another order alone', () => {
		saveOrder(pay, 'pending');
		clearOrder('cs_test_other');
		expect(loadOrder(origins)).not.toBeNull();
		clearOrder(ORDER_ID);
		expect(sessionStorage.getItem(ORDER_KEY)).toBeNull();
	});
});

test('a chat that loads after a same-tab payment brings the pay card back and tracks it', async () => {
	saveOrder(pay, 'pending');
	const fetch = vi.fn(storeFetch({ [`/api/orders/${ORDER_ID}`]: () => ({ body: orderBody('pending') }) }));
	const session = new ChatSession(async function* () {}, undefined, { storeUrl: STORE, pageOrigin: PAGE, fetch: fetch as never });
	session.resume();
	const view = render(Chat, { session });
	const link = await view.findByRole('link', { name: /^Pay \$/ });
	expect(link.getAttribute('href')).toBe(pay.url);
	await vi.waitFor(() => expect(fetch).toHaveBeenCalledWith(`${STORE}/api/orders/${ORDER_ID}`, { credentials: 'omit' }));
	view.unmount();
});

test('resume() ignores a tampered entry', () => {
	put({ ...pay, url: 'https://evil.example/pay', status: 'pending' });
	const session = new ChatSession(async function* () {}, undefined, { storeUrl: STORE, pageOrigin: PAGE });
	session.resume();
	expect(session.resumed).toBeNull();
});
