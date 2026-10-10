// widgets/composite/FocusTimer.ssr.test.ts: focus-timer renders through
// svelte/server (the showcase is prerendered): the ring and the
// reduced-motion disc both ship, the clock and the dots read the props.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import FocusTimer from './FocusTimer.svelte';

describe('focus-timer SSR', () => {
	it('renders the ready focus phase, the task and the goal dots on the server', () => {
		const { body } = render(FocusTimer, { props: { title: 'Deep work', focus_min: 50, goal_rounds: 6, task: 'Draft the update' } });
		expect(body).toContain('Deep work');
		expect(body).toContain('data-slot="dial"');
		expect(body).toContain('motion-reduce:hidden');
		expect(body).toMatch(/data-slot="clock"[^>]*>50:00</);
		expect(body).toContain('value="Draft the update"');
		expect(body).toContain('0 of 6 rounds');
	});
});
