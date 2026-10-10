// widgets/composite/HabitTracker.ssr.test.ts: habit-tracker renders through
// svelte/server (the showcase is prerendered) on a fixed clock: the day cells
// carry their labels and pressed state, the summary and verdict are in the
// markup, and the check pop is reduced-motion aware CSS, not JS.
import { render } from 'svelte/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HabitTracker from './HabitTracker.svelte';

beforeEach(() => {
	vi.useFakeTimers({ toFake: ['Date'] });
	vi.setSystemTime(new Date(2026, 9, 14, 10, 30));
});
afterEach(() => vi.useRealTimers());

describe('habit-tracker SSR', () => {
	it('renders the seeded week, the summary and the verdict on the server', () => {
		const { body } = render(HabitTracker, {
			props: {
				title: 'My week',
				habits: [
					{ id: 'read', name: 'Read', icon: 'read', target_per_week: 2 },
					{ id: 'run', name: 'Run', icon: 'run', target_per_week: 3 }
				],
				seed: { read: [0, 1] }
			}
		});
		expect(body).toContain('My week');
		expect(body).toContain('aria-label="Read, Wednesday 14 October, done"');
		expect(body).toMatch(/aria-label="Run, Wednesday 14 October, not done"[^>]*aria-pressed="false"/);
		expect(body).toContain('Done for the week');
		expect(body).toContain('2-day streak');
		expect(body).toContain('2 of 2 habits on track this week');
		expect(body).toContain('50%');
		expect(body).not.toContain('habit-pop');
	});
});
