// widgets/data-kit/kit.test.ts — the kit components in jsdom: every status
// maps to its icon, word and tokens; PhotoTile never shows a broken or refused
// image; StageRail, StatChip, SectionCard, SectionGrid and VerdictLine render
// their states; and every component survives junk props without throwing.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render } from '@testing-library/svelte';
import { createRawSnippet, tick, type Component } from 'svelte';
import {
	PhotoTile,
	SectionCard,
	SectionGrid,
	StageRail,
	StatChip,
	StatusPill,
	VerdictLine,
	STATUS_CLASS,
	STATUS_WORDS,
	STOP_ICONS,
	kindIcon,
	optionIconKey,
	OPTION_ICONS,
	FALLBACK_ICON
} from './index.js';
import { STATUSES } from './status.js';

afterEach(cleanup);

const kid = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe('StatusPill', () => {
	it.each(STATUSES)('%s renders its icon, word and text-safe token', (status) => {
		const { container } = render(StatusPill, { props: { status } });
		const pill = container.querySelector('[data-status]')!;
		expect(pill.getAttribute('data-status')).toBe(status);
		expect(pill.querySelector('svg')).not.toBeNull();
		expect(pill.textContent?.trim()).toBe(STATUS_WORDS[status]);
		expect(pill.className).toContain(STATUS_CLASS[status].text);
		expect(pill.className).toContain(STATUS_CLASS[status].tint);
	});

	it('keeps the type-size class next to the colour (no tailwind-merge loss)', () => {
		const { container } = render(StatusPill, { props: { status: 'good' } });
		expect(container.querySelector('[data-status]')!.className).toContain('text-subheadline');
	});

	it('shows the domain word and treats an unknown status as neutral', () => {
		const { container } = render(StatusPill, { props: { status: 'elevated?', label: '**elevated**' } });
		const pill = container.querySelector('[data-status]')!;
		expect(pill.getAttribute('data-status')).toBe('neutral');
		expect(pill.textContent?.trim()).toBe('elevated');
	});
});

const img = (c: HTMLElement) => c.querySelector('img');
const tile = (c: HTMLElement) => c.querySelector('[data-state]')!;

describe('PhotoTile', () => {
	it.each([
		['missing', undefined],
		['empty', ''],
		['javascript:', 'javascript:alert(1)'],
		['svg data', 'data:image/svg+xml,<svg onload=alert(1)>'],
		['protocol-relative', '//evil.example/x.png'],
		['non-string', { url: '/x.png' }]
	])('%s src shows the icon tile and no <img>', (_n, src) => {
		const { container } = render(PhotoTile, { props: { src, alt: 'Burger', icon: STOP_ICONS.food } });
		expect(img(container)).toBeNull();
		expect(tile(container).getAttribute('data-state')).toBe('fallback');
		expect(container.querySelector('[role="img"]')?.getAttribute('aria-label')).toBe('Burger');
		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('loads a safe src lazily behind a skeleton, then shows it', async () => {
		const { container } = render(PhotoTile, { props: { src: '/photos/burger.webp', alt: 'Burger', ratio: '4:3' } });
		const el = img(container)!;
		expect(el.getAttribute('src')).toBe('/photos/burger.webp');
		expect(el.getAttribute('loading')).toBe('lazy');
		expect(el.getAttribute('decoding')).toBe('async');
		expect(tile(container).getAttribute('data-state')).toBe('loading');
		expect(tile(container).className).toContain('aspect-[4/3]');
		await fireEvent.load(el);
		expect(tile(container).getAttribute('data-state')).toBe('loaded');
	});

	it('swaps a failed image for the icon tile', async () => {
		const { container } = render(PhotoTile, { props: { src: 'https://cdn.example/404.png', alt: '' } });
		await fireEvent.error(img(container)!);
		expect(img(container)).toBeNull();
		expect(tile(container).getAttribute('data-state')).toBe('fallback');
		// Decorative: no alt, so the fallback is hidden from assistive tech.
		expect(container.querySelector('[aria-hidden="true"]')).not.toBeNull();
	});

	it('starts over when the src changes after a failure', async () => {
		const r = render(PhotoTile, { props: { src: '/a.png', alt: 'A' } });
		await fireEvent.error(img(r.container)!);
		await r.rerender({ src: '/b.png', alt: 'A' });
		expect(img(r.container)?.getAttribute('src')).toBe('/b.png');
		expect(tile(r.container).getAttribute('data-state')).toBe('loading');
	});
});

describe('StageRail', () => {
	const stages = ['Browse', 'Customise', 'Details', 'Review'];

	it('marks the current stage and lets done stages go back', async () => {
		const onselect = vi.fn();
		const { container } = render(StageRail, { props: { stages, current: 2, onselect } });
		const items = [...container.querySelectorAll('li')];
		expect(items.map((li) => li.getAttribute('data-state'))).toEqual(['done', 'done', 'current', 'todo']);
		expect(items[2].getAttribute('aria-current')).toBe('step');
		const back = container.querySelectorAll('button');
		expect(back).toHaveLength(2);
		await fireEvent.click(back[1]);
		expect(onselect).toHaveBeenCalledWith(1);
	});

	it('is inert while disabled and clamps a bad current', () => {
		const { container } = render(StageRail, { props: { stages, current: 99, onselect: () => {}, disabled: true } });
		expect(container.querySelector('[aria-current="step"]')?.textContent).toContain('Review');
		for (const b of container.querySelectorAll('button')) expect(b.disabled).toBe(true);
	});
});

describe('StatChip', () => {
	it('renders n/a for a non-finite value, the unit, and a status pill', () => {
		const { container } = render(StatChip, { props: { label: 'LDL', value: NaN, unit: 'mg/dL', status: 'bad' } });
		expect(container.textContent).toContain('n/a');
		expect(container.textContent).toContain('mg/dL');
		expect(container.querySelector('[data-status="bad"]')).not.toBeNull();
	});

	it('colours a trend only when `good` says which way is good', () => {
		const good = render(StatChip, { props: { label: 'BP', value: '138/86', trend: { dir: 'down', text: 'improving', good: 'down' } } });
		expect(good.container.querySelector('[data-trend="down"]')!.className).toContain('text-ripple-success-text');
		cleanup();
		const bad = render(StatChip, { props: { label: 'BP', value: 120, trend: { dir: 'up', good: 'down' } } });
		expect(bad.container.querySelector('[data-trend="up"]')!.className).toContain('text-ripple-error-text');
		cleanup();
		const plainTrend = render(StatChip, { props: { label: 'Visits', value: 3, trend: { dir: 'sideways' as never } } });
		expect(plainTrend.container.querySelector('[data-trend="flat"]')!.className).toContain('text-ripple-muted-foreground');
	});
});

describe('SectionCard', () => {
	it('shows skeleton rows while pending, the empty line at final, else children', () => {
		const pending = render(SectionCard, { props: { title: 'Stops', pending: true, children: kid('<p>row</p>') } });
		expect(pending.container.querySelector('[data-slot="section-skeleton"]')).not.toBeNull();
		expect(pending.container.textContent).not.toContain('row');
		cleanup();
		const empty = render(SectionCard, { props: { title: 'Stops', empty: 'No stops yet. Ask for a day plan.' } });
		expect(empty.container.textContent).toContain('No stops yet. Ask for a day plan.');
		cleanup();
		const full = render(SectionCard, { props: { title: '**Vital** signs', children: kid('<p>row</p>') } });
		expect(full.container.querySelector('h3')?.textContent).toBe('Vital signs');
		expect(full.container.textContent).toContain('row');
	});
});

describe('SectionGrid', () => {
	it('spans each section by the pairing rule', async () => {
		const sections = [{ kind: 'list' }, { kind: 'kv' }, { kind: 'table' }, { kind: 'list' }];
		const section = createRawSnippet((s: () => { kind: string }) => ({ render: () => `<div>${s().kind}</div>` }));
		const { container } = render(SectionGrid<{ kind: string }>, {
			props: { sections, half: (s: { kind: string }) => s.kind !== 'table', section }
		});
		await tick();
		const spans = [...container.querySelectorAll('[data-span]')].map((c) => c.getAttribute('data-span'));
		expect(spans).toEqual(['half', 'half', 'full', 'full']);
		expect(container.firstElementChild!.className).toContain('@container');
	});
});

describe('VerdictLine', () => {
	it('renders the sentence with a status, and nothing without text', () => {
		const { container } = render(VerdictLine, { props: { verdict: { text: 'Nimbus Pro 15 if you edit video.', status: 'good' } } });
		expect(container.querySelector('[data-status="good"]')?.textContent).toContain('Nimbus Pro 15 if you edit video.');
		cleanup();
		const none = render(VerdictLine, { props: { verdict: { text: '  ' } } });
		expect(none.container.querySelector('p')).toBeNull();
	});
});

describe('kindIcon', () => {
	it('maps a known kind and falls back to CircleDot', () => {
		expect(kindIcon(STOP_ICONS, 'food')).toBe(STOP_ICONS.food);
		for (const k of ['🍔', undefined, 42, 'constructor', 'toString']) expect(kindIcon(STOP_ICONS, k)).toBe(FALLBACK_ICON);
	});
});

describe('every kit component survives junk props', () => {
	const junk = { status: 42, label: { a: 1 }, value: {}, src: 7, stages: 'x', current: 'y', verdict: 'z', title: null, sections: null, half: () => true, section: kid('<i></i>') };
	it.each([
		['StatusPill', StatusPill],
		['StatChip', StatChip],
		['SectionCard', SectionCard],
		['SectionGrid', SectionGrid],
		['PhotoTile', PhotoTile],
		['StageRail', StageRail],
		['VerdictLine', VerdictLine]
	] as Array<[string, Component<any>]>)('%s', (_n, C) => {
		expect(() => render(C, { props: junk })).not.toThrow();
	});
});

describe('optionIconKey (menu-order option icons)', () => {
	it.each([
		['Size', 'size'],
		['Extras', 'extra'],
		['Sauce', 'sauce'],
		['Large', 'large'],
		['Extra cheese', 'cheese'],
		['Bacon', 'bacon'],
		['Avocado', 'avocado'],
		['Fried egg', 'egg'],
		['Jalapeños', 'spicy'],
		['BBQ sauce', 'sauce'],
		['Garlic aioli', 'sauce'],
		['Chipotle mayo', 'sauce'],
		['No sauce', 'none'],
		['Shoestring fries', 'fries'],
		['Craft cola', 'drink'],
		['Gluten-free bun', 'gluten_free']
	])('%s → %s', (name, key) => {
		expect(optionIconKey(name)).toBe(key);
		expect(kindIcon(OPTION_ICONS, optionIconKey(name))).not.toBe(FALLBACK_ICON);
	});

	it('returns undefined for an unknown name, so the caller falls back to the group', () => {
		expect(optionIconKey('Regular')).toBeUndefined();
		expect(optionIconKey(42)).toBeUndefined();
		expect(kindIcon(OPTION_ICONS, optionIconKey('Regular') ?? optionIconKey('Size'))).toBe(OPTION_ICONS.size);
	});

	it('honours an explicit icon only when it is a key of the map', () => {
		expect(optionIconKey('Regular', 'egg')).toBe('egg');
		for (const junk of ['Hamburger', 'Trash2', '__proto__', 'constructor', '<script>', 7, null])
			expect(optionIconKey('Bacon', junk)).toBe('bacon');
	});
});
