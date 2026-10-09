// widgets/composite/Itinerary.ssr.test.ts — the itinerary renders through
// svelte/server: the showcase route is prerendered and a chat card can be
// server-rendered, so nothing in the widget may need window at render time.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import Itinerary from './Itinerary.svelte';

describe('itinerary SSR', () => {
	it('renders the open day, the route and the spend line on the server', () => {
		const { body } = render(Itinerary, {
			props: {
				budget: 300,
				route: ['Lisbon', 'Sintra'],
				legs: [{ from: 'Lisbon', to: 'Sintra', kind: 'train', cost: 5 }],
				days: [{ label: 'Day 1', stops: [{ time: '10:00', title: 'Pena Palace', kind: 'sight', cost: 20 }] }]
			}
		});
		expect(body).toContain('Pena Palace');
		expect(body).toContain('data-slot="route"');
		expect(body).toContain('$25.00');
	});
});
