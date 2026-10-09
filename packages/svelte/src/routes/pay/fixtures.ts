// routes/pay/fixtures.ts — Store responses shaped exactly like the contract
// (docs/design/drafts/2026-10-09-ripple-pay-and-track.md), for the pay and
// tracking tests while the store API lands on its own branch. Fictional
// geography: a restaurant and a drop-off in one made-up city grid.

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

export const ROUTE: [number, number][] = [
	[40.7128, -74.006],
	[40.7138, -74.0052],
	[40.7149, -74.0043],
	[40.7161, -74.0031],
	[40.7172, -74.0024],
	[40.7183, -74.0015]
];

export const trackBody = (status: string, over: Record<string, unknown> = {}) => ({
	success: true,
	tracking: {
		status,
		etaMinutes: status === 'delivered' ? null : 9,
		restaurant: { lat: 40.7128, lng: -74.006, label: 'Tasty Bites Kitchen' },
		destination: { lat: 40.7183, lng: -74.0015, label: 'Drop-off' },
		courier: status === 'out-for-delivery' ? { lat: 40.7149, lng: -74.0043 } : null,
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
