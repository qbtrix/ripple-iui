// routes/pay/fixtures.ts — Store responses shaped exactly like the contract
// (docs/design/drafts/2026-10-09-ripple-pay-and-track.md), for the pay and
// tracking tests. Same demo geography as the store (tasty-bite
// feat/order-tracking): restaurant and drop-off in Manhattan, 10 route points.
// courier is null before out-for-delivery and sits at the drop-off once
// delivered; etaMinutes is null at the final stage.

export const ORDER_ID = 'mock_6f1c2a4e-9b7d-4c3e-8a21-5d0f7e9b1c33';

export const orderBody = (status: 'pending' | 'paid' | 'cancelled', over: Record<string, unknown> = {}) => ({
	success: true,
	order: {
		id: ORDER_ID,
		status,
		total: 17.48,
		items: [
			{ name: 'Classic Cheeseburger', qty: 1 },
			{ name: 'Fresh Lemonade', qty: 1 }
		],
		fulfilment: 'delivery',
		createdAt: '2026-10-09T18:00:00.000Z',
		paidAt: status === 'paid' ? '2026-10-09T18:01:00.000Z' : null,
		...over
	}
});

export const RESTAURANT = { lat: 40.740298, lng: -74.002095 };
export const DROP_OFF = { lat: 40.742902, lng: -73.992804 };
export const ROUTE: [number, number][] = [
	[40.740298, -74.002095],
	[40.740938, -74.000913],
	[40.741377, -73.99987],
	[40.741821, -73.998817],
	[40.742264, -73.997765],
	[40.742706, -73.996713],
	[40.743146, -73.995661],
	[40.743591, -73.994609],
	[40.743235, -73.993705],
	[40.742902, -73.992804]
];
/** Where the courier is mid-route in the out-for-delivery fixture. */
export const COURIER = { lat: 40.741821, lng: -73.998817 };

export const trackBody = (status: string, over: Record<string, unknown> = {}) => ({
	success: true,
	tracking: {
		status,
		etaMinutes: status === 'delivered' || status === 'ready-for-pickup' ? null : 9,
		restaurant: { ...RESTAURANT, label: 'Tasty Bites Kitchen' },
		destination: { ...DROP_OFF, label: 'Drop-off' },
		courier: status === 'out-for-delivery' ? COURIER : status === 'delivered' ? DROP_OFF : null,
		route: ROUTE,
		events: [
			{ status: 'confirmed', label: 'Order confirmed', at: '2026-10-09T18:01:00.000Z' },
			{ status: 'preparing', label: 'The kitchen started your order', at: '2026-10-09T18:01:05.000Z' }
		],
		...over
	}
});

/** A fetch that answers each store GET from `routes`, keyed by the path after the store base. */
export function storeFetch(routes: Record<string, () => { status?: number; body: unknown }>) {
	return async (input: string | URL) => {
		const path = String(input).replace(/^https?:\/\/[^/]+\/test-store/, '');
		const hit = routes[path];
		if (!hit) return new Response('{}', { status: 404 });
		const { status = 200, body } = hit();
		return new Response(JSON.stringify(body), { status });
	};
}
