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
	show('itinerary', 'Trip itinerary', 'Do', 'Day by day stops on a rail. Tick one off or add another.'),
	show('booking', 'Table booking', 'Do', 'Pick a party size, a day and a time, then book.'),
	show('menu-order', 'Menu order', 'Do', 'A cafe menu with a cart, options and a running total.'),
	show('bill-split', 'Bill splitter', 'Do', 'Items, tip and people in. Everyone gets a share to the cent.'),
	show('comparison-layout', 'Side by side', 'Do', 'Laptops compared, the winner first and the best cells marked.'),
	show('recipe', 'Recipe', 'Do', 'Change the servings and every quantity rescales.'),
	show('growth-projection', 'Savings growth', 'Learn', 'Four numbers in, a chart and a yearly table out.'),
	show('flashcard-deck', 'Flashcards', 'Learn', 'Flip a card, say if you knew it, practise the misses.'),
	show('memory-match', 'Memory match', 'Play', 'Flip two cards at a time and find every pair.'),
	show('word-guess', 'Word guess', 'Play', 'Guess the five-letter word in six tries.'),
	show('quiz', 'Quiz', 'Play', 'One question at a time, with the reason after each answer.'),
	show('board-game', 'Board games', 'Play', 'Tic-tac-toe and connect four against the computer.'),
	show('exec-dashboard', 'Sales dashboard', 'Track', 'KPIs, a trend and a table that follow one region filter.'),
	show('meal-plan', 'Meal plan', 'Track', 'A week of meals with a shopping list that follows the swaps.'),
	show('interval-workout', 'Interval workout', 'Track', 'A HIIT session that walks you through each round.'),
	show('habit-tracker', 'Habit tracker', 'Track', 'A week grid of habits with streaks and weekly targets.'),
	show('focus-timer', 'Focus timer', 'Track', 'Pomodoro rounds with breaks and a goal for the day.'),
	show('order-status', 'Order tracking', 'Track', 'Where the order is, when it lands, and what happened so far.'),
	show('mission-control', 'Mission control', 'Track', 'An instrument panel of clocks, gauges and logs from one spec.', 'theme'),
	show('classic', 'Pocket boards', 'Track', 'A company snapshot built from cards that open into detail.', 'pockets'),
	show('choice-cards', 'Choice cards', 'Flows', 'A flow step that asks with cards instead of a dropdown.', 'flow'),
	show('flow', 'Form flow', 'Flows', 'Validate, confirm, then submit, chained in the spec.', 'actions'),
	show('illustration', 'Drawings with notes', 'Drawings', 'Animated SVG the model draws, with numbered notes on the parts.', 'illustration')
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
