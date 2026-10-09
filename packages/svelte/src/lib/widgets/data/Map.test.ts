// widgets/data/Map.test.ts: live tracker motion on the map widget. Leaflet is
// replaced by a small fake (markers keep their icon DOM until setIcon swaps
// it), Date is faked, and requestAnimationFrame is a manual frame queue, so the
// tween can be stepped and read exactly.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/svelte';
import MapWidget from './Map.svelte';

type Pos = { lat: number; lng: number };

const fake = vi.hoisted(() => {
	class FakeMarker {
		pos: { lat: number; lng: number };
		el = document.createElement('div');
		// Same synchronous block as the widget's own clock read on creation.
		createdAt = Date.now();
		setLatLng = vi.fn((p: [number, number]) => {
			this.pos = { lat: p[0], lng: p[1] };
			return this;
		});
		setIcon = vi.fn((icon: { html: string }) => {
			this.el.innerHTML = icon.html;
			return this;
		});
		constructor(p: [number, number], opts: { icon: { html: string } }) {
			this.pos = { lat: p[0], lng: p[1] };
			this.el.innerHTML = opts.icon.html;
		}
		getLatLng() {
			return this.pos;
		}
		getElement() {
			return this.el;
		}
		on() {
			return this;
		}
		bindPopup() {
			return this;
		}
	}
	const markers: FakeMarker[] = [];
	const layer = () => ({ addTo: () => layer(), addLayer() {}, removeLayer() {}, clearLayers() {} });
	const path = () => ({ bindTooltip() {}, setLatLngs() {}, setStyle() {} });
	const L = {
		map: () => ({ setView() {}, fitBounds() {}, on() {}, remove() {}, panTo() {} }),
		tileLayer: () => ({ addTo() {} }),
		layerGroup: layer,
		divIcon: (o: { html: string }) => o,
		marker: (p: [number, number], o: { icon: { html: string } }) => {
			const m = new FakeMarker(p, o);
			markers.push(m);
			return m;
		},
		polyline: path,
		polygon: path
	};
	return { markers, L };
});

vi.mock('leaflet', () => ({ default: fake.L }));
vi.mock('leaflet/dist/leaflet.css', () => ({}));

let frames = new Map<number, FrameRequestCallback>();
let nextFrame = 1;
const raf = vi.fn((cb: FrameRequestCallback) => {
	frames.set(nextFrame, cb);
	return nextFrame++;
});
const caf = vi.fn((id: number) => {
	frames.delete(id);
});

/** Run every queued frame once (the callbacks may queue the next one). */
function flushFrame() {
	const queued = [...frames.values()];
	frames = new Map();
	for (const cb of queued) cb(0);
}

function courier(lat: number, lng: number, heading = 0) {
	return [{ id: 'c', lat, lng, heading, label: 'Driver' }];
}

/** Mount, wait for the async Leaflet load, and return the courier marker plus
 * `at(ms)`, which sets the fake clock relative to the marker's creation. */
async function mountAt(lat: number, lng: number) {
	const r = render(MapWidget, { props: { trackers: courier(lat, lng) } });
	await vi.waitFor(() => expect(fake.markers).toHaveLength(1));
	const m = fake.markers[0];
	return { ...r, m, at: (ms: number) => vi.setSystemTime(m.createdAt + ms) };
}

function pos(m: { getLatLng(): Pos }): [number, number] {
	const p = m.getLatLng();
	return [Math.round(p.lat * 1000) / 1000, Math.round(p.lng * 1000) / 1000];
}

beforeEach(() => {
	fake.markers.length = 0;
	frames = new Map();
	raf.mockClear();
	caf.mockClear();
	vi.useFakeTimers();
	vi.setSystemTime(0);
	vi.stubGlobal('requestAnimationFrame', raf);
	vi.stubGlobal('cancelAnimationFrame', caf);
});

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
	vi.useRealTimers();
});

describe('map tracker motion', () => {
	it('glides linearly over the measured gap between updates', async () => {
		const { m, at, rerender } = await mountAt(0, 0);
		at(2000);
		await rerender({ trackers: courier(10, 20) });

		flushFrame();
		expect(pos(m)).toEqual([0, 0]);
		at(3000);
		flushFrame();
		expect(pos(m)).toEqual([5, 10]);
		at(4000);
		flushFrame();
		expect(pos(m)).toEqual([10, 20]);
		expect(frames.size).toBe(0);
	});

	it('clamps a long gap to 5s and starts the next leg from where the marker is', async () => {
		const { m, at, rerender } = await mountAt(0, 0);
		at(60_000);
		await rerender({ trackers: courier(10, 0) });
		at(62_500);
		flushFrame();
		expect(pos(m)).toEqual([5, 0]);

		// New target mid-flight: gap 2.5s, from the displayed [5, 0].
		await rerender({ trackers: courier(5, 10) });
		flushFrame();
		expect(pos(m)).toEqual([5, 0]);
		at(63_750);
		flushFrame();
		expect(pos(m)).toEqual([5, 5]);
	});

	it('keeps the icon and its pulse element when only position and heading change', async () => {
		const { m, at, rerender } = await mountAt(0, 0);
		const pulse = m.el.querySelector('.rmap-tracker-pulse');
		expect(pulse).not.toBeNull();

		at(3000);
		await rerender({ trackers: courier(1, 1, 90) });
		flushFrame();

		expect(m.setIcon).not.toHaveBeenCalled();
		expect(m.el.querySelector('.rmap-tracker-pulse')).toBe(pulse);
		const wrap = m.el.querySelector<HTMLElement>('.rmap-tracker-wrap');
		expect(wrap?.style.getPropertyValue('--rmap-tracker-rot')).toBe('90deg');
	});

	it('does not restart the gap clock when the same position is passed again', async () => {
		const { m, at, rerender } = await mountAt(0, 0);
		at(3000);
		await rerender({ trackers: courier(0, 0) });
		expect(raf).not.toHaveBeenCalled();
		expect(m.setLatLng).not.toHaveBeenCalled();
	});

	it('jumps with no animation under prefers-reduced-motion', async () => {
		vi.stubGlobal('matchMedia', (q: string) => ({ matches: q.includes('reduce'), media: q }));
		const { m, at, rerender } = await mountAt(0, 0);
		at(3000);
		await rerender({ trackers: courier(10, 20) });

		expect(pos(m)).toEqual([10, 20]);
		expect(raf).not.toHaveBeenCalled();
	});

	it('cancels the pending animation frame on unmount', async () => {
		const { at, rerender, unmount } = await mountAt(0, 0);
		at(3000);
		await rerender({ trackers: courier(10, 20) });
		flushFrame();
		const pending = Number(raf.mock.results.at(-1)?.value);
		expect(frames.has(pending)).toBe(true);

		unmount();
		expect(caf).toHaveBeenCalledWith(pending);
		expect(frames.size).toBe(0);
	});
});
