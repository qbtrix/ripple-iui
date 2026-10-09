// widgets/composite/IntervalWorkout.ssr.test.ts — interval-workout renders
// through svelte/server (the showcase is prerendered): the ring and the
// reduced-motion digits both ship in the markup, the clock reads the props.
import { render } from 'svelte/server';
import { describe, expect, it } from 'vitest';
import IntervalWorkout from './IntervalWorkout.svelte';

describe('interval-workout SSR', () => {
	it('renders the ready state, the first exercise and the session time on the server', () => {
		const { body } = render(IntervalWorkout, {
			props: { workSec: 45, restSec: 15, exercises: [{ name: 'Burpees', kind: 'cardio' }, { name: 'Plank', kind: 'core' }] }
		});
		expect(body).toContain('Burpees');
		expect(body).toContain('data-slot="dial"');
		expect(body).toContain('motion-reduce:hidden');
		expect(body).toMatch(/data-slot="clock"[^>]*>45</);
		expect(body).toContain('1:45 left');
	});
});
