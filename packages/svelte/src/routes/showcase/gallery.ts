// routes/showcase/gallery.ts — The one registry behind the /showcase and /live
// card grids and the thumbnail capture (scripts/capture-thumbs.ts). A showcase
// item is a gen UI widget or flow with its own /showcase/<id> page; a live item
// is a recorded or hand-written answer, replayed at /live?s=<id>. `capture` says
// where the capture script finds the card: the page path and the element it
// screenshots (the detail pages mark theirs with data-thumb). Thumbs are
// written to static/thumbs/<id>.webp at THUMB_W x THUMB_H; ids must be unique
// across both lists because they share that folder. gallery.test.ts holds every
// href to a real route and every id to a committed thumb.

import { scenarios } from '../live/scenarios.js';
import { playScenarios } from '../pawbar/play-cards.js';

export const SHOWCASE_GROUPS = ['Do', 'Learn', 'Play', 'Track', 'Flows', 'Drawings'] as const;
export type ShowcaseGroup = (typeof SHOWCASE_GROUPS)[number];

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
}

const show = (id: string, title: string, group: ShowcaseGroup, caption: string, tag = id): GalleryItem => ({
	id,
	title,
	caption,
	group,
	tag,
	href: `/showcase/${id}`,
	capture: { path: `/showcase/${id}`, selector: '[data-thumb]' }
});

export const showcaseItems: GalleryItem[] = [
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
	show('mission-control', 'Mission control', 'Track', 'Clocks, gauges and logs.', 'theme'),
	show('classic', 'Pocket boards', 'Track', 'A company snapshot in cards.', 'pockets'),
	show('choice-cards', 'Choice cards', 'Flows', 'A flow step asked with cards.', 'flow'),
	show('flow', 'Form flow', 'Flows', 'Validate, confirm, submit.', 'actions'),
	show('illustration', 'Drawings with notes', 'Drawings', 'Animated drawings with notes.', 'illustration')
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
	capture: { path: `/live?s=${s.id}`, selector: '[data-thumb]' }
}));

export const galleryItems: GalleryItem[] = [...showcaseItems, ...liveItems];

export const thumbSrc = (id: string) => `/thumbs/${id}.webp`;
