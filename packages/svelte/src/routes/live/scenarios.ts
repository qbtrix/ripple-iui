// routes/live/scenarios.ts — The /live scenario registry and the fixture contract.
// Each fixture is a real model stream recorded offline by
// scripts/record-scenario.ts. Other tasks import these types and this list,
// so the shapes below are a contract: add fields, never rename or remove.

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
}

export const scenarios: Scenario[] = [
	{ id: 'bill-splitter', title: 'Split the bill', category: 'Everyday', fixture: billSplitter },
	{ id: 'savings-calculator', title: 'Watch savings grow', category: 'Money', fixture: savingsCalculator },
	{ id: 'tokyo-trip', title: 'Plan 5 days in Tokyo', category: 'Travel', fixture: tokyoTrip },
	{ id: 'sales-dashboard', title: 'Quarterly sales', category: 'Work', fixture: salesDashboard },
	{ id: 'flashcards', title: 'Spanish flashcards', category: 'Learning', fixture: flashcards },
	{ id: 'hiit-workout', title: '20-minute HIIT', category: 'Fitness', fixture: hiitWorkout },
	{ id: 'meal-plan', title: 'High-protein week', category: 'Food', fixture: mealPlan },
	{ id: 'explainer', title: 'How bike gears work', category: 'Learning', fixture: explainer }
];
