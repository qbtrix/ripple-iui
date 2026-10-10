// routes/live/gallery.ts — The one registry behind the /live gallery and the
// thumbnail capture (scripts/capture-thumbs.ts). Two kinds of item share one
// grid: a run (a recorded or hand-written answer, replayed by Player) and a
// widget demo (a component in ./demos, rendered live in the same place). Both
// open in place at /live?s=<key>: a run's key is its scenario id, a demo's is
// `demo-<id>` (run and demo ids overlap: memory-match, meal-plan). `capture`
// is the page path and element the capture script screenshots (both kinds
// mark theirs with data-thumb). Thumbs are static/thumbs/<id>.webp at
// THUMB_W x THUMB_H, so item ids are unique across both kinds (runs carry a
// `live-` prefix). gallery.test.ts holds every demo to a file in ./demos and
// every id to a committed thumb. Old /showcase URLs redirect here
// (routes/showcase/[...path]).

import { scenarios } from './scenarios.js';
import { playScenarios } from '../pawbar/play-cards.js';

export const GROUPS = ['Do', 'Learn', 'Play', 'Track', 'Flows', 'Drawings'] as const;
export type Group = (typeof GROUPS)[number];

export const THUMB_W = 800;
export const THUMB_H = 600;

export interface GalleryItem {
	id: string;
	title: string;
	caption: string;
	group: string;
	tag: string;
	href: string;
	capture: { path: string; selector: string };
	/** What opens: a replayed run, or a demo component from ./demos. */
	kind: 'run' | 'demo';
	/** The `?s=` value that opens it in place. */
	key: string;
}

const demoKey = (id: string) => `demo-${id}`;

const show = (id: string, title: string, group: Group, caption: string): GalleryItem => ({
	id,
	title,
	caption,
	group,
	tag: 'Widget demo',
	href: `/live?s=${demoKey(id)}`,
	capture: { path: `/live?s=${demoKey(id)}`, selector: '[data-thumb]' },
	kind: 'demo',
	key: demoKey(id)
});

export const demoItems: GalleryItem[] = [
	show('itinerary', 'Trip itinerary', 'Do', 'Stops by day, tick them off.'),
	show('booking', 'Table booking', 'Do', 'Party, day and time, then book.'),
	show('menu-order', 'Menu order', 'Do', 'A cafe menu with a cart.'),
	show('bill-split', 'Bill splitter', 'Do', "Everyone's share, to the cent."),
	show('comparison-layout', 'Side by side', 'Do', 'Laptops, best cells marked.'),
	show('recipe', 'Recipe', 'Do', 'Servings that rescale.'),
	show('growth-projection', 'Savings growth', 'Learn', 'Four numbers in, a chart out.'),
	show('flashcard-deck', 'Flashcards', 'Learn', 'Flip, rate, practise the misses.'),
	show('memory-match', 'Memory match', 'Play', 'Find every pair.'),
	show('word-guess', 'Word guess', 'Play', 'Five letters, six tries.'),
	show('quiz', 'Quiz', 'Play', 'One question at a time.'),
	show('board-game', 'Board games', 'Play', 'Tic-tac-toe and connect four.'),
	show('exec-dashboard', 'Sales dashboard', 'Track', 'KPIs on one region filter.'),
	show('meal-plan', 'Meal plan', 'Track', 'A week of meals and the shopping list.'),
	show('interval-workout', 'Interval workout', 'Track', 'HIIT, round by round.'),
	show('habit-tracker', 'Habit tracker', 'Track', 'Streaks and weekly targets.'),
	show('focus-timer', 'Focus timer', 'Track', 'Pomodoro rounds and breaks.'),
	show('order-status', 'Order tracking', 'Track', 'Where your order is.'),
	show('mission-control', 'Mission control', 'Track', 'Clocks, gauges and logs.'),
	show('classic', 'Pocket boards', 'Track', 'A company snapshot in cards.'),
	show('choice-cards', 'Choice cards', 'Flows', 'A flow step asked with cards.'),
	show('flow', 'Form flow', 'Flows', 'Validate, confirm, submit.'),
	show('illustration', 'Drawings with notes', 'Drawings', 'Animated drawings with notes.')
];

/** Every /live run: the model recordings, then the hand-written answers. */
export const liveRuns = [...scenarios, ...playScenarios];

export const liveItems: GalleryItem[] = liveRuns.map((s) => ({
	id: `live-${s.id}`,
	title: s.title,
	caption: s.fixture.prompt,
	group: s.group ?? 'Do',
	tag: s.fixture.model === 'hand-written' ? 'Hand-written' : 'Recorded',
	href: `/live?s=${s.id}`,
	capture: { path: `/live?s=${s.id}`, selector: '[data-thumb]' },
	kind: 'run' as const,
	key: s.id
}));

/** The grid's order: by group, runs (the latest) before demos within each. */
export const galleryItems: GalleryItem[] = GROUPS.flatMap((g) => [...liveItems, ...demoItems].filter((i) => i.group === g));

/** The item a `?s=` value opens, if any. */
export const itemByKey = (key: string | null) => (key ? galleryItems.find((i) => i.key === key) : undefined);

export const thumbSrc = (id: string) => `/thumbs/${id}.webp`;
