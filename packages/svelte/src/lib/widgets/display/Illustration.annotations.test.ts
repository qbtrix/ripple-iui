// widgets/display/Illustration.annotations.test.ts — illustration notes: pin
// placement from a stubbed getBBox / getScreenCTM (and again on resize), notes
// on a missing target dropped, text-only popovers, one open at a time, Esc and
// keyboard focus, the legend, a spec's on_select, the wide popover vs the
// narrow sheet, and stream parity with notes streaming in.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import Illustration from './Illustration.svelte';

const HEART = `<svg viewBox='0 0 200 100'><rect id='bg' width='200' height='100' fill='#fee'/><rect id='atrium' x='20' y='10' width='40' height='20' fill='#c33'/><circle id='valve' cx='150' cy='70' r='10' fill='#933'/></svg>`;
const NOTES = [
	{ id: 'a', label: 'Left atrium', note: 'Takes blood in from the lungs.', target: 'atrium' },
	{ id: 'v', label: 'Valve', note: 'Keeps blood moving one way.', target: 'valve' },
	{ id: 'p', label: 'Apex', note: 'The tip of the heart.', at: [100, 50] as [number, number] }
];

// The art drawn at 2x, its frame at (10, 20) on screen.
const view = { scale: 2, width: 400 };
let resize: (() => void) | undefined;

function fakeBBox(this: Element) {
	const n = (a: string) => Number(this.getAttribute(a) ?? 0);
	if (this.localName === 'circle') return { x: n('cx') - n('r'), y: n('cy') - n('r'), width: 2 * n('r'), height: 2 * n('r') };
	return { x: n('x'), y: n('y'), width: n('width'), height: n('height') };
}

beforeEach(() => {
	view.scale = 2;
	view.width = 400;
	Object.assign(SVGElement.prototype, {
		getBBox: fakeBBox,
		getScreenCTM: () => ({ a: view.scale, b: 0, c: 0, d: view.scale, e: 10, f: 20 }),
		pauseAnimations: () => {},
		unpauseAnimations: () => {}
	});
	vi.spyOn(HTMLDivElement.prototype, 'getBoundingClientRect').mockImplementation(
		() => ({ left: 10, top: 20, width: view.width, height: view.width / 2 }) as DOMRect
	);
	resize = undefined;
	vi.stubGlobal(
		'ResizeObserver',
		class {
			constructor(cb: () => void) {
				resize = cb;
			}
			observe() {}
			disconnect() {}
		}
	);
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
	vi.unstubAllGlobals();
	delete (SVGElement.prototype as { getBBox?: unknown }).getBBox;
	delete (SVGElement.prototype as { getScreenCTM?: unknown }).getScreenCTM;
});

const pins = (c: HTMLElement) => [...c.querySelectorAll('[data-slot="pin"]')] as HTMLButtonElement[];
const at = (b: HTMLElement) => [b.style.left, b.style.top];
const note = (c: HTMLElement) => c.querySelector('[data-slot="note"]') as HTMLElement | null;
const draw = async (props: Record<string, unknown> = {}) => {
	const r = render(Illustration, { props: { svg: HEART, title: 'A heart', annotations: NOTES, ...props } });
	await tick();
	return r;
};

describe('illustration notes: pins', () => {
	it('places target pins at the bbox centre and `at` pins in viewBox units, through the CTM', async () => {
		const { container } = await draw();
		const [a, v, p] = pins(container);
		// atrium centre (40, 20) -> screen (90, 60) -> frame (80, 40)
		expect(at(a)).toEqual(['80px', '40px']);
		// valve centre (150, 70) -> (310, 160) -> (300, 140)
		expect(at(v)).toEqual(['300px', '140px']);
		// at (100, 50) -> (210, 120) -> (200, 100)
		expect(at(p)).toEqual(['200px', '100px']);
		expect(pins(container).map((b) => b.textContent)).toEqual(['1', '2', '3']);
		expect(a.getAttribute('aria-label')).toBe('1. Left atrium');
	});

	it('re-places pins when the frame resizes', async () => {
		const { container } = await draw();
		view.scale = 1;
		resize?.();
		await tick();
		expect(at(pins(container)[0])).toEqual(['40px', '20px']);
		expect(at(pins(container)[2])).toEqual(['100px', '50px']);
	});

	it('drops a note whose target the rebuild does not keep, and malformed notes', async () => {
		const { container } = await draw({
			annotations: [
				...NOTES,
				{ id: 'x', label: 'Ghost', note: 'Not drawn.', target: 'nope' },
				{ id: 'y', label: 'Both', note: '', target: 'valve', at: [1, 2] },
				{ id: 'z', label: 'Neither', note: '' },
				{ id: 'w', label: 'Bad point', note: '', at: [1, Infinity] },
				{ id: 'a', label: 'Duplicate id', note: '', at: [1, 1] }
			]
		});
		expect(pins(container)).toHaveLength(3);
		expect(container.textContent).not.toMatch(/Ghost|Both|Neither|Bad point|Duplicate/);
	});

	it('keeps at most 8 notes and truncates long text', async () => {
		const many = Array.from({ length: 10 }, (_, i) => ({ id: `n${i}`, label: `Point ${i} ${'x'.repeat(60)}`, note: 'y'.repeat(400), at: [i, i] }));
		const { container } = await draw({ annotations: many });
		expect(pins(container)).toHaveLength(8);
		await fireEvent.click(pins(container)[0]);
		expect(container.querySelector('[data-slot="note-label"]')!.textContent).toHaveLength(40);
		expect(container.querySelector('[data-slot="note-text"]')!.textContent).toHaveLength(280);
	});

	it('pins stay out of the role="img" art', async () => {
		const { container } = await draw();
		const img = screen.getByRole('img', { name: 'A heart' });
		expect(pins(container).some((p) => img.contains(p))).toBe(false);
	});
});

describe('illustration notes: popover', () => {
	it('renders label and note as text only', async () => {
		const evil = `<img src=x onerror="alert(1)"><b>bold</b>`;
		const { container } = await draw({ annotations: [{ id: 'e', label: '<i>Label</i>', note: evil, target: 'valve' }] });
		await fireEvent.click(pins(container)[0]);
		expect(container.querySelector('[data-slot="note-text"]')!.textContent).toBe(evil);
		expect(container.querySelector('[data-slot="note-label"]')!.textContent).toBe('<i>Label</i>');
		expect(note(container)!.querySelector('img, b, i')).toBeNull();
	});

	it('opens one note at a time and highlights its target with a class', async () => {
		const { container } = await draw();
		const [a, v] = pins(container);
		await fireEvent.click(a);
		expect(note(container)!.textContent).toContain('Takes blood in from the lungs.');
		expect(container.querySelector('svg [id$="-atrium"]')!.classList.contains('ill-note-target')).toBe(true);
		expect(a.getAttribute('aria-expanded')).toBe('true');
		await fireEvent.click(v);
		expect(container.querySelectorAll('[data-slot="note"]')).toHaveLength(1);
		expect(note(container)!.textContent).toContain('Keeps blood moving one way.');
		expect(container.querySelector('svg [id$="-atrium"]')!.classList.contains('ill-note-target')).toBe(false);
		expect(container.querySelector('svg [id$="-valve"]')!.classList.contains('ill-note-target')).toBe(true);
		expect(a.getAttribute('aria-expanded')).toBe('false');
	});

	it('Esc closes the note and returns focus to the pin without reopening it', async () => {
		const { container } = await draw();
		const [a] = pins(container);
		a.focus();
		await fireEvent.click(a);
		expect(note(container)).not.toBeNull();
		await fireEvent.keyDown(window, { key: 'Escape' });
		await tick();
		expect(note(container)).toBeNull();
		expect(document.activeElement).toBe(a);
		expect(container.querySelector('.ill-note-target')).toBeNull();
	});

	it('focusing a pin opens its note without firing onselect; a click fires it', async () => {
		const onselect = vi.fn();
		const { container } = await draw({ onselect });
		const [, v] = pins(container);
		v.focus();
		await tick();
		expect(note(container)!.textContent).toContain('Valve');
		expect(onselect).not.toHaveBeenCalled();
		await fireEvent.click(v);
		expect(onselect).toHaveBeenCalledWith({ id: 'v' });
	});

	it('sits beside its pin on a wide frame and becomes a sheet under the art when narrow', async () => {
		view.width = 600;
		const { container } = await draw();
		await fireEvent.click(pins(container)[0]);
		expect(note(container)!.dataset.layout).toBe('popover');
		expect(note(container)!.style.left).toBe('136px'); // clamped so the 256px popover fits
		view.width = 300;
		resize?.();
		await tick();
		expect(note(container)!.dataset.layout).toBe('sheet');
		expect(note(container)!.style.left).toBe('');
	});
});

describe('illustration notes: legend', () => {
	it('lists every kept note in pin order, and a legend click opens it', async () => {
		const onselect = vi.fn();
		const { container } = await draw({ onselect });
		const items = [...container.querySelectorAll('[data-slot="legend-item"]')] as HTMLButtonElement[];
		expect(items.map((b) => b.textContent!.replace(/\s+/g, ' ').trim())).toEqual(['1 Left atrium', '2 Valve', '3 Apex']);
		await fireEvent.click(items[2]);
		expect(note(container)!.textContent).toContain('The tip of the heart.');
		expect(items[2].getAttribute('aria-expanded')).toBe('true');
		expect(onselect).toHaveBeenCalledWith({ id: 'p' });
	});

	it('works without layout: no pins, the legend still opens notes as a sheet', async () => {
		delete (SVGElement.prototype as { getScreenCTM?: unknown }).getScreenCTM;
		const { container } = await draw();
		expect(pins(container)).toHaveLength(0);
		await fireEvent.click(container.querySelector('[data-slot="legend-item"]')!);
		expect(note(container)!.dataset.layout).toBe('sheet');
	});

	it('shows no legend without notes', async () => {
		const { container } = await draw({ annotations: undefined });
		expect(container.querySelector('[data-slot="legend"]')).toBeNull();
	});
});

describe('illustration notes: spec', () => {
	it('a spec on_select receives { id }', async () => {
		const spec = {
			ui: {
				type: 'flex',
				children: [
					{ type: 'illustration', on_select: { action: 'set', target: 'picked' }, props: { svg: HEART, title: 'A heart', annotations: NOTES } },
					{ type: 'text', props: { text: 'picked:{state.picked.id}' } }
				]
			}
		};
		const { container } = render(Ripple, { props: { spec } });
		await tick();
		await fireEvent.click(pins(container)[1]);
		await tick();
		expect(container.textContent).toContain('picked:v');
	});

	it('streams notes in and ends equal to the whole render', async () => {
		const { streamed } = await expectStreamParity(
			{ ui: { type: 'illustration', props: { title: 'A heart', svg: HEART, annotations: NOTES } } },
			{ chunkSize: 24 }
		);
		expect(pins(streamed as HTMLElement)).toHaveLength(3);
		expect(streamed.querySelectorAll('[data-slot="legend-item"]')).toHaveLength(3);
	});
});
