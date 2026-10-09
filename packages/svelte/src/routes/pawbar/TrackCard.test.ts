// routes/pawbar/TrackCard.test.ts — The tracking card keeps one Ripple root,
// one order-status node and one Leaflet map from preparing to delivered,
// whether its tracking arrives as props or through the PayCard's polls, and
// builds its spec once. Leaflet is stubbed to count map creations and view
// changes: the map is created and fitted once, then never re-set, including a
// delivered poll that drops the courier and sends an empty route.

import { render } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import * as orders from '../pay/orders.js';
import { ORDER_ID, orderBody, storeFetch, trackBody } from '../pay/fixtures.js';
import { MAX_MS, POLL_MS } from '../pay/watch.svelte.js';
import Chat from './Chat.svelte';
import PayCard from './PayCard.svelte';
import { ChatSession } from './session.svelte.js';
import TrackCard from './TrackCard.svelte';

const leaflet = vi.hoisted(() => {
	const fitBounds = vi.fn();
	const setView = vi.fn();
	const create = vi.fn();
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const stub = (): any => new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : () => stub()) });
	const L = {
		map: () => (create(), { fitBounds, setView, on() {}, remove() {}, panTo() {} }),
		tileLayer: stub,
		layerGroup: stub,
		divIcon: (o: unknown) => o,
		polyline: stub,
		polygon: stub,
		marker: (p: [number, number]) => {
			let pos = { lat: p[0], lng: p[1] };
			const el = document.createElement('div');
			return { setLatLng: (q: [number, number]) => (pos = { lat: q[0], lng: q[1] }), getLatLng: () => pos, getElement: () => el, setIcon() {}, on() {} };
		}
	};
	return { L, fitBounds, setView, create };
});
vi.mock('leaflet', () => ({ default: leaflet.L }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

vi.mock('../pay/orders.js', async (importOriginal) => {
	const real = await importOriginal<typeof orders>();
	return { ...real, trackSpec: vi.fn(real.trackSpec) };
});

const nodes = (el: HTMLElement) => ['.track', '.track > *', '.rorder', '.rorder-map'].map((s) => el.querySelector(s));

beforeEach(() => {
	vi.mocked(orders.trackSpec).mockClear();
	for (const f of [leaflet.create, leaflet.fitBounds, leaflet.setView]) f.mockClear();
});

/** Created once, fitted once, never re-set. */
const mapUntouched = () => {
	expect(leaflet.create).toHaveBeenCalledOnce();
	expect(leaflet.fitBounds).toHaveBeenCalledOnce();
	expect(leaflet.setView).not.toHaveBeenCalled();
};
/** The real store's delivered answer: courier gone, route emptied. */
const delivered = () => trackBody('delivered', { courier: null, route: [] });

test('preparing, out-for-delivery, delivered: same root, same map, one spec', async () => {
	const tracking = (s: string) => orders.parseTracking(trackBody(s))!;
	const view = render(TrackCard, { orderId: ORDER_ID, tracking: tracking('preparing'), fulfilment: 'delivery' });
	const before = nodes(view.container);
	expect(before.every(Boolean)).toBe(true);
	await vi.waitFor(() => expect(leaflet.create).toHaveBeenCalled());
	for (const t of [tracking('out-for-delivery'), tracking('delivered'), orders.parseTracking(delivered())!]) {
		await view.rerender({ orderId: ORDER_ID, tracking: t, fulfilment: 'delivery' });
		before.forEach((n, i) => expect(nodes(view.container)[i]).toBe(n));
	}
	expect(view.getByText('Delivered', { selector: 'h2' })).toBeTruthy();
	expect(orders.trackSpec).toHaveBeenCalledOnce();
	mapUntouched();
});

describe('through the pay card polls', () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => vi.useRealTimers());

	test('the tracking card is not remounted when the order reaches delivered and polling stops', async () => {
		let trackStatus = 'preparing';
		const fetch = vi.fn(
			storeFetch({
				[`/api/orders/${ORDER_ID}`]: () => ({ body: orderBody('paid') }),
				[`/api/orders/${ORDER_ID}/track`]: () => ({ body: trackStatus === 'delivered' ? delivered() : trackBody(trackStatus) })
			})
		);
		const pay = { url: 'https://checkout.stripe.com/c/pay/cs_test_1', sessionId: ORDER_ID, summary: { lines: [], orderType: 'delivery' as const, total: 1 } };
		const view = render(PayCard, { pay, storeUrl: 'https://shop.example/test-store', fetch: fetch as never, channel: (() => ({ addEventListener() {}, close() {} })) as never });
		await vi.waitFor(() => expect(leaflet.create).toHaveBeenCalled());
		const before = nodes(view.container);
		for (const s of ['out-for-delivery', 'delivered']) {
			trackStatus = s;
			await vi.advanceTimersByTimeAsync(POLL_MS);
			before.forEach((n, i) => expect(nodes(view.container)[i]).toBe(n));
		}
		await vi.waitFor(() => expect(view.getByText('Delivered', { selector: 'h2' })).toBeTruthy());
		await vi.advanceTimersByTimeAsync(POLL_MS * 3);
		before.forEach((n, i) => expect(nodes(view.container)[i]).toBe(n));
		expect(orders.trackSpec).toHaveBeenCalledOnce();
		mapUntouched();
	});
});

test('in the chat, the order reaching delivered keeps the tracking card and its map', async () => {
	vi.useFakeTimers();
	try {
		let orderStatus: 'pending' | 'paid' = 'pending';
		let trackStatus = 'preparing';
		const routes = storeFetch({
			[`/api/orders/${ORDER_ID}`]: () => ({ body: orderBody(orderStatus) }),
			[`/api/orders/${ORDER_ID}/track`]: () => ({ body: trackStatus === 'delivered' ? delivered() : trackBody(trackStatus) })
		});
		const fetch = vi.fn(async (input: string | URL, init?: RequestInit) =>
			init?.method === 'POST' ? new Response(JSON.stringify({ url: 'https://checkout.stripe.com/c/pay/cs_test_1', sessionId: ORDER_ID })) : routes(input)
		);
		const menu = { ui: { type: 'menu-order', props: { checkout: true, items: [] }, on_checkout: { action: 'emit', target: 'checkout' } } };
		const session = new ChatSession(
			async function* () {
				yield { event: 'card.start', data: { card_id: 'c' } };
				yield { event: 'card.final', data: { card_id: 'c', card: menu } };
			},
			undefined,
			{ storeUrl: 'https://shop.example/test-store', fetch: fetch as never, pageOrigin: 'https://ripple.example' }
		);
		const view = render(Chat, { session });
		await session.send('Order a burger');
		const part = session.turns[1].parts[0];
		if (part?.kind !== 'card') throw new Error('no card');
		const cart = {
			lines: [{ product_id: 'burger-1', qty: 1, option_ids: [], name: 'Classic Cheeseburger', unit_price: 13.49 }],
			fulfilment: 'delivery',
			customer: { name: 'Sam', email: 'sam@example.com', phone: '555 0100', address: '1 Main St' },
			total: 13.49
		};
		await session.hostEvent(part.card, { type: 'emit', name: 'checkout', target: 'checkout', payload: cart });
		await vi.waitFor(() => expect(view.getByRole('link', { name: /^Pay \$/ })).toBeTruthy());

		orderStatus = 'paid';
		await vi.advanceTimersByTimeAsync(POLL_MS);
		await vi.waitFor(() => expect(leaflet.create).toHaveBeenCalled());
		const before = nodes(view.container);
		expect(before.every(Boolean)).toBe(true);
		for (const s of ['out-for-delivery', 'delivered']) {
			trackStatus = s;
			await vi.advanceTimersByTimeAsync(POLL_MS);
			before.forEach((n, i) => expect(nodes(view.container)[i]).toBe(n));
		}
		await vi.waitFor(() => expect(view.getByText('Delivered', { selector: 'h2' })).toBeTruthy());
		expect(part.card.payPhase).toBe('done');
		await vi.advanceTimersByTimeAsync(POLL_MS * 3);
		before.forEach((n, i) => expect(nodes(view.container)[i]).toBe(n));
		mapUntouched();
	} finally {
		vi.useRealTimers();
	}
});

test('the watch expiring mid-delivery keeps the tracking card and its map', async () => {
	vi.useFakeTimers();
	try {
		const fetch = vi.fn(
			storeFetch({
				[`/api/orders/${ORDER_ID}`]: () => ({ body: orderBody('paid') }),
				[`/api/orders/${ORDER_ID}/track`]: () => ({ body: trackBody('out-for-delivery') })
			})
		);
		const pay = { url: 'https://checkout.stripe.com/c/pay/cs_test_1', sessionId: ORDER_ID, summary: { lines: [], orderType: 'delivery' as const, total: 1 } };
		const view = render(PayCard, { pay, storeUrl: 'https://shop.example/test-store', fetch: fetch as never, channel: (() => ({ addEventListener() {}, close() {} })) as never });
		await vi.waitFor(() => expect(leaflet.create).toHaveBeenCalled());
		const before = nodes(view.container);
		await vi.advanceTimersByTimeAsync(MAX_MS + POLL_MS * 2);
		before.forEach((n, i) => expect(nodes(view.container)[i]).toBe(n));
		expect(view.queryByText(/Stopped checking/)).toBeNull();
		mapUntouched();
	} finally {
		vi.useRealTimers();
	}
});
