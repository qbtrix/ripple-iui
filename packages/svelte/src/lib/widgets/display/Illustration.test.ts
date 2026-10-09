// widgets/display/Illustration.test.ts — the illustration widget: registry and
// no bind contract, the rebuilt art (role="img", prefixed ids), two instances
// never sharing ids, the streaming placeholder and stream parity, re-render on
// a new `svg`, reduced motion pausing, and the pause/play toggle.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/svelte';
import { tick } from 'svelte';
import Ripple from '$lib/Ripple.svelte';
import { expectStreamParity } from '$lib/streaming/__fixtures__/stream-parity.js';
import { getWidget, hasWidget } from '../index.js';
import { getBindContract } from '@ripple-ui/core';
import Illustration from './Illustration.svelte';

const motion = vi.hoisted(() => ({ reduce: false }));
vi.mock('svelte/motion', async (orig) => ({
	...(await orig<typeof import('svelte/motion')>()),
	prefersReducedMotion: {
		get current() {
			return motion.reduce;
		}
	}
}));

const pause = vi.fn();
const unpause = vi.fn();
beforeEach(() => {
	motion.reduce = false;
	pause.mockClear();
	unpause.mockClear();
	// jsdom has no SMIL timeline.
	Object.assign(SVGSVGElement.prototype, { pauseAnimations: pause, unpauseAnimations: unpause });
});
afterEach(() => {
	cleanup();
	vi.restoreAllMocks();
});

const SUN = `<svg viewBox='0 0 200 120'><defs><linearGradient id='sky' x1='0' y1='0' x2='0' y2='1'><stop offset='0' stop-color='#bfe3ff'/><stop offset='1' stop-color='#fff'/></linearGradient></defs><rect width='200' height='120' fill='url(#sky)'/><circle id='sun' cx='100' cy='110' r='18' fill='#ffb703'><animate id='up' attributeName='cy' from='110' to='48' dur='3s' fill='freeze'/><animate attributeName='r' values='18;20;18' dur='2s' begin='up.end' repeatCount='indefinite'/></circle></svg>`;
const STILL = `<svg viewBox='0 0 10 10'><rect id='box' width='10' height='10' fill='#123'/></svg>`;

const art = (c: HTMLElement) => c.querySelector('[data-widget="illustration"] svg') as SVGSVGElement | null;
const placeholder = (c: HTMLElement) => c.querySelector('[data-slot="placeholder"]') as HTMLElement | null;

describe('illustration: registry', () => {
	it('is registered and has no bind contract of its own', () => {
		expect(hasWidget('illustration')).toBe(true);
		expect(getWidget('illustration')).toBe(Illustration);
		expect(getBindContract('illustration')).toEqual({ prop: 'value', event: 'onchange' });
	});
});

describe('illustration: render', () => {
	it('renders the rebuilt art as role="img" named by the title, with prefixed ids', async () => {
		const { container } = render(Illustration, { props: { svg: SUN, title: 'Sun rising', caption: 'Morning' } });
		await tick();
		const img = screen.getByRole('img', { name: 'Sun rising' });
		const svg = art(container)!;
		expect(img.contains(svg)).toBe(true);
		expect(svg.namespaceURI).toBe('http://www.w3.org/2000/svg');
		const sky = svg.querySelector('linearGradient')!.id;
		expect(sky).toMatch(/^ill-.+-sky$/);
		expect(svg.querySelector('rect')!.getAttribute('fill')).toBe(`url(#${sky})`);
		expect(svg.querySelector('[begin]')!.getAttribute('begin')).toBe(`${sky.replace(/sky$/, 'up')}.end`);
		expect(placeholder(container)).toBeNull();
		expect(screen.getByText('Morning').tagName).toBe('FIGCAPTION');
	});

	it('two instances on one page never share an id', async () => {
		const { container } = render(Ripple, {
			props: {
				spec: {
					ui: {
						type: 'flex',
						children: [
							{ type: 'illustration', props: { svg: SUN, title: 'A' } },
							{ type: 'illustration', props: { svg: SUN, title: 'B' } }
						]
					}
				}
			}
		});
		await tick();
		const ids = [...container.querySelectorAll('[data-widget="illustration"] svg [id]')].map((e) => e.id);
		expect(ids).toHaveLength(6);
		expect(new Set(ids).size).toBe(6);
		const [a, b] = container.querySelectorAll('[data-widget="illustration"] svg rect[fill]');
		expect(a.getAttribute('fill')).not.toBe(b.getAttribute('fill'));
	});

	it('shows a quiet placeholder sized to max_height for a partial, and clamps max_height', async () => {
		const { container, rerender } = render(Illustration, { props: { svg: SUN.slice(0, 120), title: 'Partial', max_height: 200 } });
		await tick();
		expect(art(container)).toBeNull();
		expect(placeholder(container)!.style.height).toBe('200px');
		expect(placeholder(container)!.getAttribute('aria-hidden')).toBe('true');
		await rerender({ svg: SUN.slice(0, 120), title: 'Partial', max_height: 5000 });
		expect(placeholder(container)!.style.height).toBe('640px');
		await rerender({ svg: SUN.slice(0, 120), title: 'Partial', max_height: undefined });
		expect(placeholder(container)!.style.height).toBe('320px');
	});

	it('renders nothing but the placeholder for a hostile-over-cap string, and never runs script', async () => {
		const { container } = render(Illustration, {
			props: { svg: `<!DOCTYPE svg [<!ENTITY a 'x'>]><svg viewBox='0 0 1 1' onload='alert(1)'><rect/></svg>`, title: 'Bad' }
		});
		await tick();
		expect(art(container)).toBeNull();
		expect(placeholder(container)).not.toBeNull();
	});

	it('re-renders when svg changes', async () => {
		const { container, rerender } = render(Illustration, { props: { svg: STILL, title: 'Box' } });
		await tick();
		expect(art(container)!.querySelector('rect')!.getAttribute('fill')).toBe('#123');
		await rerender({ svg: STILL.replace('#123', '#456'), title: 'Box' });
		await tick();
		expect(container.querySelectorAll('[data-widget="illustration"] svg')).toHaveLength(1);
		expect(art(container)!.querySelector('rect')!.getAttribute('fill')).toBe('#456');
	});
});

describe('illustration: motion', () => {
	it('shows no pause button for still art', async () => {
		render(Illustration, { props: { svg: STILL, title: 'Box' } });
		await tick();
		expect(screen.queryByRole('button')).toBeNull();
		expect(pause).not.toHaveBeenCalled();
	});

	it('plays by default and the button toggles pause and play', async () => {
		render(Illustration, { props: { svg: SUN, title: 'Sun' } });
		await tick();
		expect(pause).not.toHaveBeenCalled();
		await fireEvent.click(screen.getByRole('button', { name: 'Pause animation' }));
		expect(pause).toHaveBeenCalledTimes(1);
		await fireEvent.click(screen.getByRole('button', { name: 'Play animation' }));
		expect(unpause).toHaveBeenCalled();
		expect(screen.getByRole('button', { name: 'Pause animation' })).toBeTruthy();
	});

	it('starts paused under prefers-reduced-motion, and play still works', async () => {
		motion.reduce = true;
		render(Illustration, { props: { svg: SUN, title: 'Sun' } });
		await tick();
		expect(pause).toHaveBeenCalled();
		unpause.mockClear();
		await fireEvent.click(screen.getByRole('button', { name: 'Play animation' }));
		expect(unpause).toHaveBeenCalledTimes(1);
	});
});

describe('illustration: streaming', () => {
	it('streams without an error box and ends equal to the whole render', async () => {
		const { streamed } = await expectStreamParity(
			{ ui: { type: 'illustration', props: { title: 'Sun rising', caption: 'Morning', max_height: 220, svg: SUN } } },
			{ chunkSize: 24 }
		);
		expect(art(streamed as HTMLElement)).not.toBeNull();
		expect(placeholder(streamed as HTMLElement)).toBeNull();
	});
});
