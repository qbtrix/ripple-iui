// widgets/composite/BillSplit.ssr.test.ts — the bill split renders through
// svelte/server: the manifest marks it staticSafe and the showcase route is
// prerendered, so the cards and totals must be in the server markup.
import { render as ssr } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import BillSplit from './BillSplit.svelte';

describe('bill-split SSR', () => {
	it('renders the cards and the totals on the server', () => {
		const people = [1, 2, 3, 4].map((n) => ({ id: `p${n}`, name: `P${n}` }));
		const { body } = ssr(BillSplit, { props: { subtotal: 200, tip_percent: 20, people } });
		expect(body).toContain('Everyone pays $60.00');
		expect(body).toContain('$240.00');
		expect(body).toContain('data-slot="pays"');
	});
});
