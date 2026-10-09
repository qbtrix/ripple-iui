// routes/pay/watch.test.ts — OrderWatch's polling against contract fixtures,
// on fake timers: pending polls every 3s, paid switches to /track, a
// BroadcastChannel ping only triggers a poll (its content is never trusted),
// and polling stops on delivered, cancelled, 15 minutes, or stop().

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import { MAX_MS, OrderWatch, POLL_MS } from './watch.svelte.js';
import { COURIER, ORDER_ID, orderBody, storeFetch, trackBody } from './fixtures.js';

const STORE = 'https://shop.example/test-store';
const ORDER = `/api/orders/${ORDER_ID}`;

function fakeChannel() {
	const listeners: ((e: MessageEvent) => void)[] = [];
	return {
		closed: false,
		addEventListener: (_t: string, fn: (e: MessageEvent) => void) => void listeners.push(fn),
		close() {
			this.closed = true;
		},
		emit: (data: unknown) => listeners.forEach((fn) => fn({ data } as MessageEvent))
	};
}

let orderStatus: 'pending' | 'paid' | 'cancelled';
let trackStatus: string;
let fetch: ReturnType<typeof vi.fn>;
let chan: ReturnType<typeof fakeChannel>;
let now: number;

function watch() {
	const w = new OrderWatch(ORDER_ID, { storeUrl: STORE, fetch: fetch as never, channel: () => chan as never, now: () => now });
	w.start();
	return w;
}
const calls = () => fetch.mock.calls.map((c) => String(c[0]).replace(STORE, ''));
// A 0 ms timer set during a fake tick fires 1 ms later (sinon), hence tick(1) after a paid poll.
const tick = async (ms: number) => {
	now += ms;
	await vi.advanceTimersByTimeAsync(ms);
};

beforeEach(() => {
	vi.useFakeTimers();
	now = 0;
	orderStatus = 'pending';
	trackStatus = 'preparing';
	chan = fakeChannel();
	fetch = vi.fn(
		storeFetch({
			[ORDER]: () => ({ body: orderBody(orderStatus) }),
			[`${ORDER}/track`]: () => ({ body: trackBody(trackStatus) })
		})
	);
});
afterEach(() => vi.useRealTimers());

describe('OrderWatch', () => {
	test('polls the order at once and every 3s while pending', async () => {
		const w = watch();
		await tick(0);
		expect(calls()).toEqual([ORDER]);
		expect(w.phase).toBe('pending');
		await tick(POLL_MS);
		await tick(POLL_MS);
		expect(calls()).toEqual([ORDER, ORDER, ORDER]);
		w.stop();
	});

	test('paid switches to /track straight away, then every 3s, and stops on delivered', async () => {
		const w = watch();
		await tick(0);
		orderStatus = 'paid';
		await tick(POLL_MS);
		expect(w.phase).toBe('tracking');
		await tick(1);
		expect(calls().at(-1)).toBe(`${ORDER}/track`);
		expect(w.tracking?.status).toBe('preparing');
		trackStatus = 'out-for-delivery';
		await tick(POLL_MS);
		expect(w.tracking?.courier).toEqual(COURIER);
		trackStatus = 'delivered';
		await tick(POLL_MS);
		expect(w.phase).toBe('done');
		const n = fetch.mock.calls.length;
		await tick(POLL_MS * 10);
		expect(fetch.mock.calls.length).toBe(n);
		expect(chan.closed).toBe(true);
	});

	test('a pickup order stops at ready-for-pickup (the store never sends picked-up)', async () => {
		orderStatus = 'paid';
		trackStatus = 'ready-for-pickup';
		const w = watch();
		await tick(0);
		await tick(1);
		expect(w.phase).toBe('done');
		const n = fetch.mock.calls.length;
		await tick(POLL_MS * 5);
		expect(fetch.mock.calls.length).toBe(n);
	});

	test('cancelled stops polling', async () => {
		orderStatus = 'cancelled';
		const w = watch();
		await tick(0);
		expect(w.phase).toBe('cancelled');
		await tick(POLL_MS * 5);
		expect(fetch).toHaveBeenCalledOnce();
	});

	test('a ping for this order polls now but changes nothing on its own', async () => {
		const w = watch();
		await tick(0);
		chan.emit({ type: 'paid-check', order: ORDER_ID, status: 'paid' });
		await tick(0);
		expect(calls()).toEqual([ORDER, ORDER]);
		expect(w.phase).toBe('pending');
		orderStatus = 'paid';
		chan.emit({ type: 'paid-check', order: ORDER_ID });
		await tick(0);
		expect(w.phase).toBe('tracking');
		w.stop();
	});

	test('pings for another order, or of another type, are ignored', async () => {
		const w = watch();
		await tick(0);
		chan.emit({ type: 'paid-check', order: 'mock_other' });
		chan.emit({ type: 'paid', order: ORDER_ID });
		chan.emit('paid-check');
		chan.emit(null);
		await tick(0);
		expect(fetch).toHaveBeenCalledOnce();
		w.stop();
	});

	test('stop() (the card unmounting) ends polling and closes the channel', async () => {
		const w = watch();
		await tick(0);
		w.stop();
		await tick(POLL_MS * 5);
		chan.emit({ type: 'paid-check', order: ORDER_ID });
		await tick(0);
		expect(fetch).toHaveBeenCalledOnce();
		expect(chan.closed).toBe(true);
	});

	test('backs off on errors and keeps the last good tracking', async () => {
		orderStatus = 'paid';
		const w = watch();
		await tick(0);
		await tick(1);
		const good = w.tracking;
		fetch.mockImplementation(async () => new Response('{}', { status: 503 }));
		const n = fetch.mock.calls.length;
		await tick(POLL_MS);
		expect(w.trouble).toBe(true);
		expect(fetch.mock.calls.length).toBe(n + 1);
		// The next try waits 6s, not 3s.
		await tick(POLL_MS);
		expect(fetch.mock.calls.length).toBe(n + 1);
		await tick(POLL_MS);
		expect(fetch.mock.calls.length).toBe(n + 2);
		expect(w.tracking).toBe(good);
		w.stop();
	});

	test('a malformed track answer counts as a failure, not new state', async () => {
		orderStatus = 'paid';
		const w = watch();
		await tick(0);
		await tick(1);
		const good = w.tracking;
		trackStatus = 'teleported';
		await tick(POLL_MS);
		expect(w.tracking).toBe(good);
		expect(w.trouble).toBe(true);
		w.stop();
	});

	test('gives up after 15 minutes', async () => {
		const w = watch();
		await tick(0);
		await tick(MAX_MS + POLL_MS);
		expect(w.phase).toBe('expired');
		const n = fetch.mock.calls.length;
		await tick(POLL_MS * 5);
		expect(fetch.mock.calls.length).toBe(n);
	});
});
