// routes/live/scenarios.ts — The /live scenario registry, the fixture contract, and
// the landing's chat-only prompts. Each fixture is a real model stream recorded
// offline by scripts/record-scenario.ts. Other tasks import these types and this
// list, so the shapes below are a contract: add fields, never rename or remove.
// `chatPrompts` are hero chips with no recording: the landing shows them only when
// the live chat is on (and a store, for `needsStore`). `group` is the landing's
// chip row a chip sits in (Do, Learn, Play, Track).

import orderBurger from './fixtures/order-burger.json';
import billSplitter from './fixtures/bill-splitter.json';
import savingsCalculator from './fixtures/savings-calculator.json';
import tokyoTrip from './fixtures/tokyo-trip.json';
import salesDashboard from './fixtures/sales-dashboard.json';
import flashcards from './fixtures/flashcards.json';
import hiitWorkout from './fixtures/hiit-workout.json';
import mealPlan from './fixtures/meal-plan.json';
import explainer from './fixtures/explainer.json';

export interface ScenarioFixture {
	id: string;
	title: string;
	prompt: string;
	model: string;
	/** ISO timestamp of the recording. */
	recordedAt: string;
	/** Text deltas in arrival order; `t` is ms since the first chunk. */
	chunks: { t: number; text: string }[];
}

export interface Scenario {
	id: string;
	title: string;
	category: string;
	fixture: ScenarioFixture;
	/** True when the finished UI calls the host's store actions. */
	needsStore?: boolean;
	/** The hero chip's prompt for the live chat, when it differs from the recording's. */
	prompt?: string;
	/** The answer walks the visitor through steps (the chip says "step by step"). */
	steps?: boolean;
	/** The landing's chip group. */
	group?: string;
}

/** A hero chip with no recording behind it: live chat only. */
export interface ChatPrompt {
	id: string;
	title: string;
	prompt: string;
	steps?: boolean;
	needsStore?: boolean;
	group?: string;
}

export const scenarios: Scenario[] = [
	{ id: 'order-burger', title: 'Order a burger', category: 'Store', fixture: orderBurger, needsStore: true, prompt: 'I want to order a burger', steps: true, group: 'Do' },
	{ id: 'bill-splitter', title: 'Split the bill', category: 'Everyday', fixture: billSplitter, group: 'Do' },
	{ id: 'savings-calculator', title: 'Watch savings grow', category: 'Money', fixture: savingsCalculator, group: 'Learn' },
	{ id: 'tokyo-trip', title: 'Plan 5 days in Tokyo', category: 'Travel', fixture: tokyoTrip, group: 'Do' },
	{ id: 'sales-dashboard', title: 'Quarterly sales', category: 'Work', fixture: salesDashboard, group: 'Track' },
	{ id: 'flashcards', title: 'Spanish flashcards', category: 'Learning', fixture: flashcards, group: 'Learn' },
	{ id: 'hiit-workout', title: '20-minute HIIT', category: 'Fitness', fixture: hiitWorkout, group: 'Track' },
	{ id: 'meal-plan', title: 'High-protein week', category: 'Food', fixture: mealPlan, group: 'Track' },
	{ id: 'explainer', title: 'How bike gears work', category: 'Learning', fixture: explainer, prompt: 'How do bike gears work? Draw me an animated picture of the chain drive and explain it in a few lines.', group: 'Learn' }
];

export const chatPrompts: ChatPrompt[] = [
	{ id: 'book-table', title: 'Book a table', prompt: 'Book a table for 4 on Saturday evening', steps: true, needsStore: true, group: 'Do' },
	{ id: 'plan-trip', title: 'Plan a trip with me', prompt: 'Help me plan a trip step by step', steps: true, group: 'Do' },
	{ id: 'pick-laptop', title: 'Help me pick a laptop', prompt: 'Help me choose a laptop: ask me a few questions first', steps: true, group: 'Do' }
];
