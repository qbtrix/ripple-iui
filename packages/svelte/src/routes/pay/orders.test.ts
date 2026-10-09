// routes/pay/orders.test.ts — The store order/track validators and the
// host-built order-status state: bad statuses, NaN and out-of-range
// coordinates and oversized routes are refused; labels arrive as capped plain
// text; trackState maps the tracking onto order-status's real props.

import { describe, expect, test, vi } from 'vitest';
import { fetchOrder, fetchTracking, LABEL_MAX, parseOrder, parseTracking, trackSpec, trackState, when } from './orders.js';
import { COURIER, DROP_OFF, ORDER_ID, orderBody, RESTAURANT, ROUTE, trackBody } from './fixtures.js';

describe('parseOrder', () => {
	test('reads the contract shape', () => {
		expect(parseOrder(orderBody('paid'), ORDER_ID)).toEqual({
			id: ORDER_ID,
			status: 'paid',
			total: 17.48,
			items: [
				{ name: 'Classic Cheeseburger', qty: 1 },
				{ name: 'Fresh Lemonade', qty: 1 }
			],
			fulfilment: 'delivery'
		});
	});

	test.each([
		['an unknown status', orderBody('pending', { status: 'refunded' })],
		['another order', orderBody('paid', { id: 'mock_other' })],
		['a NaN total', orderBody('paid', { total: Number.NaN })],
		['a string total', orderBody('paid', { total: '17.48' })],
		['no success flag', { order: orderBody('paid').order }],
		['an unknown fulfilment', orderBody('paid', { fulfilment: 'drone' })]
	])('refuses %s', (_n, body) => expect(parseOrder(body, ORDER_ID)).toBeNull());

	test('drops malformed items and keeps an HTML name as text', () => {
		const o = parseOrder(orderBody('paid', { items: [{ name: '<img src=x onerror=alert(1)>', qty: 1 }, { name: 'x', qty: 0 }, 'junk'] }), ORDER_ID);
		expect(o?.items).toEqual([{ name: '<img src=x onerror=alert(1)>', qty: 1 }]);
	});
});

describe('parseTracking', () => {
	test('reads the contract shape', () => {
		const t = parseTracking(trackBody('out-for-delivery'));
		expect(t).toMatchObject({ status: 'out-for-delivery', etaMinutes: 9, courier: COURIER, route: ROUTE });
		expect(t?.events).toHaveLength(2);
	});

	test.each([
		['a bad status', trackBody('teleported')],
		['a NaN courier coordinate', trackBody('out-for-delivery', { courier: { lat: Number.NaN, lng: -74 } })],
		['an out-of-range restaurant', trackBody('preparing', { restaurant: { lat: 91, lng: 0, label: 'x' } })],
		['an out-of-range destination', trackBody('preparing', { destination: { lat: 40, lng: 181, label: 'x' } })],
		['a string coordinate', trackBody('preparing', { restaurant: { lat: '40.7', lng: -74, label: 'x' } })],
		['an Infinity in the route', trackBody('preparing', { route: [[40.7, Infinity]] })],
		['a route point that is not a pair', trackBody('preparing', { route: [[40.7, -74, 3]] })],
		['51 route points', trackBody('preparing', { route: Array.from({ length: 51 }, () => [40.7, -74]) })]
	])('refuses %s', (_n, body) => expect(parseTracking(body)).toBeNull());

	test('takes exactly 50 route points', () => {
		expect(parseTracking(trackBody('preparing', { route: Array.from({ length: 50 }, () => [40.7, -74]) }))?.route).toHaveLength(50);
	});

	test('labels are plain text, one line, capped; bad event statuses are dropped', () => {
		const t = parseTracking(
			trackBody('preparing', {
				restaurant: { lat: 40.7, lng: -74, label: '<b>Tasty</b>\n\u0000Bites' + 'x'.repeat(200) },
				destination: { lat: 40.71, lng: -74.01, label: 42 },
				events: [{ status: 'confirmed', label: '<script>alert(1)</script>', at: 'x' }, { status: 'hacked', label: 'no', at: 'x' }]
			})
		);
		expect(t?.restaurant.label.startsWith('<b>Tasty</b> Bites')).toBe(true);
		expect(t?.restaurant.label).toHaveLength(LABEL_MAX);
		expect(t?.destination?.label).toBe('Drop-off');
		expect(t?.events).toEqual([{ status: 'confirmed', label: '<script>alert(1)</script>', at: 'x' }]);
	});

	test('an ETA that is not a sane number becomes null', () => {
		expect(parseTracking(trackBody('preparing', { etaMinutes: Number.NaN }))?.etaMinutes).toBeNull();
		expect(parseTracking(trackBody('preparing', { etaMinutes: -3 }))?.etaMinutes).toBeNull();
	});
});

describe('fetchOrder / fetchTracking', () => {
	test('GETs the contract paths, encoded, without credentials', async () => {
		const fetch = vi.fn(async () => new Response(JSON.stringify(orderBody('pending'))));
		expect(await fetchOrder('https://shop.example/test-store/', ORDER_ID, fetch)).toMatchObject({ ok: true, value: { status: 'pending' } });
		expect(fetch).toHaveBeenCalledWith(`https://shop.example/test-store/api/orders/${ORDER_ID}`, { credentials: 'omit' });
		const tfetch = vi.fn(async () => new Response(JSON.stringify(trackBody('preparing'))));
		expect(await fetchTracking('https://shop.example/test-store', ORDER_ID, tfetch)).toMatchObject({ ok: true });
		expect(tfetch.mock.calls[0]).toContain(`https://shop.example/test-store/api/orders/${ORDER_ID}/track`);
	});

	test('a bad id never reaches the network; 404, 409 and junk are failures', async () => {
		const fetch = vi.fn();
		expect(await fetchOrder('https://s.example', '../admin', fetch)).toEqual({ ok: false, status: 0 });
		expect(fetch).not.toHaveBeenCalled();
		expect(await fetchOrder('https://s.example', ORDER_ID, async () => new Response('{}', { status: 404 }))).toEqual({ ok: false, status: 404 });
		expect(await fetchTracking('https://s.example', ORDER_ID, async () => new Response('{}', { status: 409 }))).toEqual({ ok: false, status: 409 });
		expect(await fetchTracking('https://s.example', ORDER_ID, async () => new Response('not json'))).toEqual({ ok: false, status: 0 });
	});
});

describe('trackSpec / trackState', () => {
	test('the spec is a fixed order-status bound to state, never model input', () => {
		const spec = trackSpec();
		expect(spec.ui.type).toBe('order-status');
		expect(spec.ui.props).toMatchObject({ tracker: '{state.tracker}', route: '{state.route}', mapTiles: 'osm', showMap: true });
	});

	test('maps restaurant, drop-off, courier, route and steps onto order-status props', () => {
		const s = trackState(ORDER_ID, parseTracking(trackBody('out-for-delivery'))!, 'delivery');
		expect(s).toMatchObject({
			currentStep: 'out-for-delivery',
			title: 'On the way',
			eta: '9 min',
			origin: { name: 'Tasty Bites Kitchen', ...RESTAURANT },
			destination: { name: 'Drop-off', ...DROP_OFF },
			tracker: { ...COURIER, label: 'Courier' },
			route: ROUTE
		});
		expect(s.steps.map((x) => x.id)).toEqual(['confirmed', 'preparing', 'out-for-delivery', 'delivered']);
		expect(s.events.map((e) => e.label)).toEqual(['The kitchen started your order', 'Order confirmed']);
		const delivered = trackState(ORDER_ID, parseTracking(trackBody('delivered'))!, 'delivery');
		expect(delivered).toMatchObject({ eta: '', title: 'Delivered', tracker: { ...DROP_OFF, label: 'Courier' } });
		const pickup = trackState(ORDER_ID, parseTracking(trackBody('ready-for-pickup', { destination: null }))!, 'pickup');
		expect(pickup.steps.map((x) => x.id)).toEqual(['confirmed', 'preparing', 'ready-for-pickup', 'picked-up']);
		expect(pickup).toMatchObject({ destination: null, tracker: null });
	});
});

describe('when (tracking times)', () => {
	const at = '2026-10-09T18:01:00.000Z';
	const t0 = Date.parse(at);
	test('relative under an hour, the clock after, skew reads as just now', () => {
		expect(when(at, t0 + 20_000)).toBe('just now');
		expect(when(at, t0 - 5_000)).toBe('just now');
		expect(when(at, t0 + 60_000)).toBe('1 min ago');
		expect(when(at, t0 + 59 * 60_000)).toBe('59 min ago');
		expect(when(at, t0 + 61 * 60_000)).toBe(new Date(at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }));
		expect(when('not a date', t0)).toBe('');
	});

	test('trackState shows events seconds apart as relative times, not a repeated clock', () => {
		const s = trackState(ORDER_ID, parseTracking(trackBody('preparing'))!, 'delivery', Date.parse('2026-10-09T18:03:30.000Z'));
		expect(s.events.map((e) => e.time)).toEqual(['2 min ago', '2 min ago']);
		const fresh = trackState(ORDER_ID, parseTracking(trackBody('preparing'))!, 'delivery', Date.parse('2026-10-09T18:01:30.000Z'));
		expect(fresh.events.map((e) => e.time)).toEqual(['just now', 'just now']);
		expect(fresh.steps.find((x) => x.id === 'confirmed')?.completedAt).toBe('just now');
	});
});
