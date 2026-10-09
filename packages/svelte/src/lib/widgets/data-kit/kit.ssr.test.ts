// widgets/data-kit/kit.ssr.test.ts — the kit renders on the server: the site
// prerenders every route and a widget's card can be server-rendered, so the
// barrel (motion.ts reads svelte/motion at import) and every component must
// render through svelte/server without touching window.
import { render } from 'svelte/server';
import { createRawSnippet } from 'svelte';
import { describe, expect, it } from 'vitest';
import { PhotoTile, SectionCard, SectionGrid, StageRail, StatChip, StatusPill, VerdictLine, rise } from './index.js';

const kid = createRawSnippet(() => ({ render: () => '<p>row</p>' }));

describe('data kit SSR', () => {
	it('renders every component through svelte/server', () => {
		const out = [
			render(StatusPill, { props: { status: 'warn', label: 'elevated' } }).body,
			render(VerdictLine, { props: { verdict: { text: 'Pick the Aero 14.', status: 'good' } } }).body,
			render(StatChip, { props: { label: 'LDL', value: 162, unit: 'mg/dL', status: 'bad' } }).body,
			render(SectionCard, { props: { title: 'Stops', children: kid } }).body,
			render(SectionGrid, { props: { sections: [1, 2], half: () => true, section: kid } }).body,
			render(PhotoTile, { props: { src: '/photos/a.webp', alt: 'A' } }).body,
			render(StageRail, { props: { stages: ['Browse', 'Review'], current: 0 } }).body
		];
		for (const body of out) expect(body.length).toBeGreaterThan(0);
		expect(out.join('')).toContain('elevated');
		expect(out.join('')).toContain('/photos/a.webp');
	});

	it('rise is importable on the server', () => {
		expect(typeof rise).toBe('function');
	});
});
