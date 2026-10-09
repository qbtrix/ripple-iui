// widgets/composite/OrderStatus.test.ts: order-status stepper states. The last
// step renders done (check, no pulse) once status lands on it, the pickup
// statuses get their own default pipeline, and an in-progress step still
// pulses. The map-framing case mounts the map on a small Leaflet fake and
// checks fitBounds runs at mount and on origin/destination moves only.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import OrderStatus from './OrderStatus.svelte';

const leaflet = vi.hoisted(() => {
	const fitBounds = vi.fn();
	const setView = vi.fn();
	const stub = (): any => new Proxy({}, { get: (_t, k) => (k === 'then' ? undefined : () => stub()) });
	const L = {
		map: () => ({ fitBounds, setView, on() {}, remove() {}, panTo() {} }),
		tileLayer: stub,
		layerGroup: stub,
		divIcon: (o: unknown) => o,
		polyline: stub,
		polygon: stub,
		marker: (p: [number, number]) => {
			let pos = { lat: p[0], lng: p[1] };
			const el = document.createElement('div');
			return {
				setLatLng: (q: [number, number]) => (pos = { lat: q[0], lng: q[1] }),
				getLatLng: () => pos,
				getElement: () => el,
				setIcon() {},
				on() {}
			};
		}
	};
	return { L, fitBounds, setView };
});
vi.mock('leaflet', () => ({ default: leaflet.L }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

function steps(container: HTMLElement) {
	return [...container.querySelectorAll<HTMLElement>('.rorder-step')].map((li) => ({
		label: li.querySelector('.rorder-step-label')?.textContent?.trim(),
		state: [...li.classList].find((c) => /^rorder-step-(done|active|pending|failed)$/.test(c))?.slice(12),
		check: li.querySelector('.rorder-step-pip svg') !== null,
		pulse: li.querySelector('.rorder-step-pulse') !== null
	}));
}

describe('order-status stepper', () => {
	it('shows delivered as a completed final step with a check, not a pulse', () => {
		const { container } = render(OrderStatus, { props: { orderId: 'A1', status: 'delivered' } });
		const s = steps(container);
		expect(s).toHaveLength(6);
		expect(s.every((x) => x.state === 'done' && x.check)).toBe(true);
		expect(container.querySelector('.rorder-step-pulse')).toBeNull();
		expect(container.querySelector('.rorder-title')?.textContent).toBe('Delivered');
	});

	it('still pulses a step that is in progress', () => {
		const { container } = render(OrderStatus, { props: { orderId: 'A1', status: 'out-for-delivery' } });
		const s = steps(container);
		expect(s[4]).toMatchObject({ label: 'Out for delivery', state: 'active', pulse: true });
		expect(s[5].state).toBe('pending');
	});

	it('uses the pickup pipeline: ready-for-pickup is active, picked-up completes it', () => {
		const ready = render(OrderStatus, { props: { orderId: 'A1', status: 'ready-for-pickup' } });
		const r = steps(ready.container);
		expect(r.map((x) => x.label)).toEqual(['Placed', 'Confirmed', 'Preparing', 'Ready for pickup', 'Picked up']);
		expect(r[3]).toMatchObject({ state: 'active', pulse: true });
		cleanup();

		const done = render(OrderStatus, { props: { orderId: 'A1', status: 'picked-up' } });
		const d = steps(done.container);
		expect(d.every((x) => x.state === 'done' && x.check)).toBe(true);
		expect(done.container.querySelector('.rorder-title')?.textContent).toBe('Picked up');
	});

	it('completes ready-for-pickup when the host steps end there', () => {
		const { container } = render(OrderStatus, {
			props: {
				orderId: 'A1',
				status: 'ready-for-pickup',
				steps: [
					{ id: 'placed', label: 'Placed' },
					{ id: 'preparing', label: 'Preparing' },
					{ id: 'ready-for-pickup', label: 'Ready for pickup' }
				]
			}
		});
		const s = steps(container);
		expect(s[2]).toMatchObject({ state: 'done', check: true, pulse: false });
		expect(container.querySelector('.rorder-title')?.textContent).toBe('Ready for pickup');
	});

	it('keeps an explicitly current last step in progress when it has no completion time', () => {
		const { container } = render(OrderStatus, {
			props: {
				orderId: 'J9',
				steps: [
					{ id: 'build', label: 'Build', completedAt: '10:00' },
					{ id: 'deploy', label: 'Deploy', current: true }
				]
			}
		});
		expect(steps(container)[1]).toMatchObject({ state: 'active', pulse: true });
	});
});

describe('order-status map framing', () => {
	it('fits the whole trip with 32px padding at mount and refits only when origin or destination move', async () => {
		vi.stubGlobal('requestAnimationFrame', () => 1);
		vi.stubGlobal('cancelAnimationFrame', () => {});
		leaflet.fitBounds.mockClear();
		const origin = { name: 'Kitchen', lat: 10, lng: 20 };
		const destination = { name: 'Home', lat: 10.2, lng: 20.3 };
		const { rerender } = render(OrderStatus, {
			props: { orderId: 'A1', origin, destination, route: [[9.9, 20.1]], tracker: { lat: 10.1, lng: 20.4 } }
		});
		await vi.waitFor(() => expect(leaflet.fitBounds).toHaveBeenCalledTimes(1));
		expect(leaflet.fitBounds).toHaveBeenLastCalledWith(
			[
				[9.9, 20],
				[10.2, 20.4]
			],
			{ padding: [32, 32] }
		);
		expect(leaflet.setView).not.toHaveBeenCalled();

		// Courier polls, with origin/destination re-sent as fresh but equal objects.
		await rerender({ tracker: { lat: 10.15, lng: 20.5 }, origin: { ...origin }, destination: { ...destination } });
		await rerender({ tracker: { lat: 10.18, lng: 20.6 } });
		expect(leaflet.fitBounds).toHaveBeenCalledTimes(1);

		await rerender({ destination: { name: 'Office', lat: 10.5, lng: 20.3 } });
		expect(leaflet.fitBounds).toHaveBeenCalledTimes(2);
		expect(leaflet.fitBounds).toHaveBeenLastCalledWith(
			[
				[9.9, 20],
				[10.5, 20.6]
			],
			{ padding: [32, 32] }
		);
	});
});
