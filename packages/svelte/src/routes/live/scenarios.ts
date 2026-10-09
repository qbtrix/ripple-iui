// routes/live/scenarios.ts — The /live scenario registry and the fixture contract.
// Each fixture is a real model stream recorded offline by
// scripts/record-scenario.ts. Other tasks import these types and this list,
// so the shapes below are a contract: add fields, never rename or remove.
// Every scenario belongs to one AUDIENCE, the place a developer's agent meets
// its users; /live groups the list by it and the hero plays one per audience.

import orderBurger from './fixtures/order-burger.json';
import billSplitter from './fixtures/bill-splitter.json';
import savingsCalculator from './fixtures/savings-calculator.json';
import tokyoTrip from './fixtures/tokyo-trip.json';
import salesDashboard from './fixtures/sales-dashboard.json';
import flashcards from './fixtures/flashcards.json';
import hiitWorkout from './fixtures/hiit-workout.json';
import mealPlan from './fixtures/meal-plan.json';
import explainer from './fixtures/explainer.json';
import refundApproval from './fixtures/refund-approval.json';
import incidentRollback from './fixtures/incident-rollback.json';
import returnExchange from './fixtures/return-exchange.json';
import bookAppointment from './fixtures/book-appointment.json';
import quoteBuilder from './fixtures/quote-builder.json';

export interface ScenarioFixture {
	id: string;
	title: string;
	prompt: string;
	/** What the model already knew when it drew (tool results, a shop's hours), from --context. */
	context?: string;
	model: string;
	/** ISO timestamp of the recording. */
	recordedAt: string;
	/** Text deltas in arrival order; `t` is ms since the first chunk. */
	chunks: { t: number; text: string }[];
}

export type Audience = 'agent' | 'storefront' | 'product' | 'chat';

/** The groups, in the order /live lists them. */
export const AUDIENCES: { id: Audience; label: string }[] = [
	{ id: 'agent', label: 'Agent asks first' },
	{ id: 'storefront', label: 'On your storefront' },
	{ id: 'product', label: 'Inside your product' },
	{ id: 'chat', label: 'In a chat app' }
];

export interface Scenario {
	id: string;
	title: string;
	category: string;
	audience: Audience;
	fixture: ScenarioFixture;
	/** True when the finished UI calls the host's store actions. */
	needsStore?: boolean;
}

export const scenarios: Scenario[] = [
	{ id: 'order-burger', title: 'Order a burger', category: 'Checkout', audience: 'storefront', fixture: orderBurger, needsStore: true },
	{ id: 'refund-approval', title: 'Approve a refund', category: 'Tool calls, approval', audience: 'agent', fixture: refundApproval },
	{ id: 'incident-rollback', title: 'Roll back a bad deploy', category: 'Tool calls, approval', audience: 'agent', fixture: incidentRollback },
	{ id: 'return-exchange', title: 'Swap a size', category: 'Returns', audience: 'storefront', fixture: returnExchange },
	{ id: 'book-appointment', title: 'Book a haircut', category: 'Booking', audience: 'storefront', fixture: bookAppointment },
	{ id: 'quote-builder', title: 'Draft a client quote', category: 'Live totals', audience: 'product', fixture: quoteBuilder },
	{ id: 'sales-dashboard', title: 'Quarterly sales', category: 'Dashboard', audience: 'product', fixture: salesDashboard },
	{ id: 'bill-splitter', title: 'Split the bill', category: 'Everyday', audience: 'chat', fixture: billSplitter },
	{ id: 'tokyo-trip', title: 'Plan 5 days in Tokyo', category: 'Travel', audience: 'chat', fixture: tokyoTrip },
	{ id: 'flashcards', title: 'Spanish flashcards', category: 'Learning', audience: 'chat', fixture: flashcards },
	{ id: 'explainer', title: 'How bike gears work', category: 'Learning', audience: 'chat', fixture: explainer },
	{ id: 'savings-calculator', title: 'Watch savings grow', category: 'Money', audience: 'chat', fixture: savingsCalculator },
	{ id: 'hiit-workout', title: '20-minute HIIT', category: 'Fitness', audience: 'chat', fixture: hiitWorkout },
	{ id: 'meal-plan', title: 'High-protein week', category: 'Food', audience: 'chat', fixture: mealPlan }
];
