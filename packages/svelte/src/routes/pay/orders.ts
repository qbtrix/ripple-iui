// routes/pay/orders.ts — The landing's typed client for the test store's order
// API (docs/design/drafts/2026-10-09-ripple-pay-and-track.md): GET
// /api/orders/<id> and GET /api/orders/<id>/track, plus the host-built
// `order-status` spec the tracking card renders.
//
// TRUST BOUNDARY. Every store value is checked here before it reaches a spec:
// statuses are enums, coordinates finite and in range, a route has at most
// MAX_ROUTE points, labels are plain strings (control characters dropped,
// whitespace collapsed, at most LABEL_MAX chars). A response that breaks a hard
// rule (status, coordinates, route) parses to null and the caller treats it like
// a failed poll; soft fields (a label, an event, the ETA) fall back instead.
// The model never builds this spec: trackSpec() is fixed, and trackState()
// fills its state, so a poll updates the card without remounting it.

import { ORDER_ID } from '../live/checkout.js';

export const ORDER_CHANNEL = 'ripple-order';
export const LABEL_MAX = 80;
export const MAX_ROUTE = 50;

export type OrderStatus = 'pending' | 'paid' | 'cancelled';
export type TrackStatus = 'confirmed' | 'preparing' | 'out-for-delivery' | 'delivered' | 'ready-for-pickup' | 'picked-up';
export type LatLng = [number, number];

export interface Order {
	id: string;
	status: OrderStatus;
	total: number;
	items: { name: string; qty: number }[];
	fulfilment: 'delivery' | 'pickup';
}

export interface Tracking {
	status: TrackStatus;
	etaMinutes: number | null;
	restaurant: { lat: number; lng: number; label: string };
	destination: { lat: number; lng: number; label: string } | null;
	courier: { lat: number; lng: number } | null;
	route: LatLng[];
	events: { status: TrackStatus; label: string; at: string }[];
}

const ORDER_STATUSES: readonly OrderStatus[] = ['pending', 'paid', 'cancelled'];
const TRACK_STATUSES: readonly TrackStatus[] = ['confirmed', 'preparing', 'out-for-delivery', 'delivered', 'ready-for-pickup', 'picked-up'];
/** Tracking is over: the poll stops. The store's pickup orders end at ready-for-pickup. */
export const TRACK_DONE: readonly TrackStatus[] = ['delivered', 'ready-for-pickup', 'picked-up'];

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const oneOf = <T extends string>(list: readonly T[], v: unknown): v is T => typeof v === 'string' && (list as readonly string[]).includes(v);

/** A store label as plain text: a string, no control characters, one line, capped. */
export function plain(v: unknown, fallback = ''): string {
	if (typeof v !== 'string') return fallback;
	// eslint-disable-next-line no-control-regex
	const s = v.replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim();
	return s ? s.slice(0, LABEL_MAX) : fallback;
}

const lat = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= -90 && v <= 90;
const lng = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v) && v >= -180 && v <= 180;

function point(v: unknown): { lat: number; lng: number } | null {
	return isRecord(v) && lat(v.lat) && lng(v.lng) ? { lat: v.lat, lng: v.lng } : null;
}

export function parseOrder(data: unknown, id: string): Order | null {
	const o = isRecord(data) && data.success === true && isRecord(data.order) ? data.order : null;
	if (!o || o.id !== id || !oneOf(ORDER_STATUSES, o.status)) return null;
	if (typeof o.total !== 'number' || !Number.isFinite(o.total) || o.total < 0 || o.total > 100_000) return null;
	if (o.fulfilment !== 'delivery' && o.fulfilment !== 'pickup') return null;
	const items = (Array.isArray(o.items) ? o.items.slice(0, 50) : [])
		.filter(isRecord)
		.map((i) => ({ name: plain(i.name), qty: typeof i.qty === 'number' && Number.isInteger(i.qty) ? i.qty : 0 }))
		.filter((i) => !!i.name && i.qty > 0 && i.qty <= 99);
	return { id, status: o.status, total: o.total, items, fulfilment: o.fulfilment };
}

export function parseTracking(data: unknown): Tracking | null {
	const t = isRecord(data) && data.success === true && isRecord(data.tracking) ? data.tracking : null;
	if (!t || !oneOf(TRACK_STATUSES, t.status)) return null;
	const restaurant = point(t.restaurant);
	if (!restaurant) return null;
	const destination = t.destination == null ? null : point(t.destination);
	if (t.destination != null && !destination) return null;
	const courier = t.courier == null ? null : point(t.courier);
	if (t.courier != null && !courier) return null;
	if (!Array.isArray(t.route) || t.route.length > MAX_ROUTE) return null;
	const route: LatLng[] = [];
	for (const p of t.route) {
		if (!Array.isArray(p) || p.length !== 2 || !lat(p[0]) || !lng(p[1])) return null;
		route.push([p[0], p[1]]);
	}
	const eta = t.etaMinutes;
	const events = (Array.isArray(t.events) ? t.events.slice(0, 20) : [])
		.filter(isRecord)
		.flatMap((e) => (oneOf(TRACK_STATUSES, e.status) ? [{ status: e.status, label: plain(e.label, 'Update'), at: plain(e.at) }] : []));
	return {
		status: t.status,
		etaMinutes: typeof eta === 'number' && Number.isFinite(eta) && eta >= 0 && eta <= 1440 ? Math.round(eta) : null,
		restaurant: { ...restaurant, label: plain(isRecord(t.restaurant) ? t.restaurant.label : '', 'Restaurant') },
		destination: destination && { ...destination, label: plain(isRecord(t.destination) ? t.destination.label : '', 'Drop-off') },
		courier,
		route,
		events
	};
}

export type Fetched<T> = { ok: true; value: T } | { ok: false; status: number };

async function get<T>(url: string, parse: (d: unknown) => T | null, doFetch: typeof fetch = fetch): Promise<Fetched<T>> {
	try {
		const res = await doFetch(url, { credentials: 'omit' });
		if (!res.ok) return { ok: false, status: res.status };
		const value = parse(await res.json());
		return value ? { ok: true, value } : { ok: false, status: 0 };
	} catch {
		return { ok: false, status: 0 };
	}
}

const ordersUrl = (storeUrl: string, id: string) => `${storeUrl.replace(/\/$/, '')}/api/orders/${encodeURIComponent(id)}`;

export function fetchOrder(storeUrl: string, id: string, doFetch?: typeof fetch): Promise<Fetched<Order>> {
	if (!ORDER_ID.test(id)) return Promise.resolve({ ok: false, status: 0 });
	return get(ordersUrl(storeUrl, id), (d) => parseOrder(d, id), doFetch);
}

export function fetchTracking(storeUrl: string, id: string, doFetch?: typeof fetch): Promise<Fetched<Tracking>> {
	if (!ORDER_ID.test(id)) return Promise.resolve({ ok: false, status: 0 });
	return get(`${ordersUrl(storeUrl, id)}/track`, parseTracking, doFetch);
}

const STEPS: Record<'delivery' | 'pickup', { id: TrackStatus; label: string }[]> = {
	delivery: [
		{ id: 'confirmed', label: 'Confirmed' },
		{ id: 'preparing', label: 'Preparing' },
		{ id: 'out-for-delivery', label: 'On the way' },
		{ id: 'delivered', label: 'Delivered' }
	],
	pickup: [
		{ id: 'confirmed', label: 'Confirmed' },
		{ id: 'preparing', label: 'Preparing' },
		{ id: 'ready-for-pickup', label: 'Ready' },
		{ id: 'picked-up', label: 'Picked up' }
	]
};
const TITLES: Record<TrackStatus, string> = {
	confirmed: 'Order confirmed',
	preparing: 'The kitchen is on it',
	'out-for-delivery': 'On the way',
	delivered: 'Delivered',
	'ready-for-pickup': 'Ready for pickup',
	'picked-up': 'Picked up'
};

const clock = (at: string) => {
	const d = new Date(at);
	return Number.isNaN(d.getTime()) ? '' : d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
};

/** The fixed tracking spec: every prop reads the host-filled state below. */
export function trackSpec() {
	const bind = (k: string) => `{state.${k}}`;
	const keys = ['orderId', 'title', 'steps', 'currentStep', 'eta', 'origin', 'destination', 'tracker', 'route', 'events'];
	return {
		version: '1.0',
		ui: {
			type: 'order-status',
			id: 'order-track',
			props: { ...Object.fromEntries(keys.map((k) => [k, bind(k)])), showMap: true, mapHeight: '260px', mapTiles: 'osm' }
		}
	};
}

/** The tracking state order-status reads, from a validated Tracking. */
export function trackState(orderId: string, t: Tracking, fulfilment: Order['fulfilment']) {
	const steps = STEPS[fulfilment];
	const reached = new Map(t.events.map((e) => [e.status, clock(e.at)]));
	const done = TRACK_DONE.includes(t.status);
	return {
		orderId: orderId.slice(-8).toUpperCase(),
		title: TITLES[t.status],
		steps: steps.map((s) => ({ id: s.id, label: s.label, ...(reached.get(s.id) ? { completedAt: reached.get(s.id) } : {}) })),
		currentStep: t.status,
		eta: !done && t.etaMinutes != null ? `${t.etaMinutes} min` : '',
		origin: { name: t.restaurant.label, lat: t.restaurant.lat, lng: t.restaurant.lng },
		destination: t.destination && { name: t.destination.label, lat: t.destination.lat, lng: t.destination.lng },
		tracker: t.courier && { lat: t.courier.lat, lng: t.courier.lng, label: 'Courier' },
		route: t.route,
		events: [...t.events].reverse().map((e) => ({ time: clock(e.at), label: e.label }))
	};
}
