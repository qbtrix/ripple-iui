// widgets/composite/GrowthProjection.ssr.test.ts — the growth projection
// renders through svelte/server with its chart: the showcase route is
// prerendered and the manifest marks the widget staticSafe, so the SVG chart,
// totals and table must all be in the server markup without window.
import { render as ssr } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import GrowthProjection from './GrowthProjection.svelte';

describe('growth-projection SSR', () => {
	it('renders the chart, totals and table on the server', () => {
		const { body } = ssr(GrowthProjection, { props: { deposit: 300, rate: 5, years: 10 } });
		expect(body).toContain('$46,585');
		expect(body).toContain('data-series="growth"');
		expect(body).toContain('Yearly table');
	});
});
