// routes/live/scenarios.ts — The /live scenario registry, the fixture contract, and
// the landing's suggestion chips. Each fixture is a real model stream recorded
// offline by scripts/record-scenario.ts. Other tasks import these types and this
// list, so the shapes below are a contract: add fields, never rename or remove.
// `chatPrompts` are chips with no recording: the landing shows them only when the
// live chat is on (and a store, for `needsStore`). `group` is the /live
// gallery's group; on the landing, `suggestionGroups` decides which group a chip sits in, its order, its lucide icon and
// (optionally) a shorter chip title; it names chips by id, because the play cards
// (pawbar/play-cards.ts) import from here and this file runs in node for the
// recorder. `groupedSuggestions` resolves it against whatever chips are on offer,
// dropping missing ids, so a group with nothing available never renders.
// Prompts are visitor-facing: plain words, fictional products, no dashes.

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
	/** The /live gallery's group (Do, Learn, Play, Track); the landing groups by suggestionGroups. */
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
	{ id: 'pick-laptop', title: 'Help me pick a laptop', prompt: 'Help me choose a laptop: ask me a few questions first', steps: true, group: 'Do' },
	{ id: 'shop-headphones', title: 'Shop headphones', prompt: 'Show me wireless headphones under $200 side by side so I can compare and pick one (sample products)' },
	{ id: 'browse-products', title: 'Browse products', prompt: 'Show me a small catalog of home office gear I can filter by price and category (sample products)' },
	{ id: 'compare-tech', title: 'Compare tech', prompt: 'Compare three tablets side by side on screen size, battery life, weight and price (sample specs)' },
	{ id: 'find-deals', title: 'Find deals', prompt: 'Show me the best deals on kitchen gadgets this week, sorted by biggest discount (sample prices)' },
	{ id: 'restaurant-search', title: 'Restaurant search', prompt: 'Find Italian restaurants near me with ratings, price range and distance (sample places)' },
	{ id: 'coffee-shops', title: 'Find coffee shops', prompt: 'Show me coffee shops downtown with wifi, opening hours and distance (sample places)' },
	{ id: 'directions', title: 'Get directions', prompt: 'Give me walking directions from the train station to the city museum as a short list of turns (sample route)' },
	{ id: 'weather', title: 'Weather forecast', prompt: 'Show me a 7-day weather forecast for Lisbon with highs, lows and chance of rain (sample data)' },
	{ id: 'draft-announcement', title: 'Draft announcement', prompt: 'Draft a short team announcement about our new office opening, with a title and a few lines I can edit' },
	{ id: 'create-survey', title: 'Create survey', prompt: 'Make me a 5-question customer feedback survey with star ratings and a comment box' },
	{ id: 'drawing-pad', title: 'Drawing pad', prompt: 'Give me a simple drawing pad with a few colors, a brush size and a clear button' },
	{ id: 'pack-list', title: 'Pack for trip', prompt: 'Make me a packing checklist for a 4-day beach weekend, grouped into clothes, toiletries and gear' },
	{ id: 'project-timeline', title: 'Project timeline', prompt: 'Show a timeline for a 6-week website redesign with milestones and owners (sample project)' },
	{ id: 'task-checklist', title: 'Task checklist', prompt: 'Make me a checklist for moving apartments that I can tick off as I go' },
	{ id: 'weekly-schedule', title: 'Weekly schedule', prompt: 'Lay out my weekly schedule: work blocks on weekdays, the gym three times and family dinner on Sunday' },
	{ id: 'take-notes', title: 'Take notes', prompt: 'Give me a notes card where I can jot down ideas and tag them' },
	{ id: 'view-calendar', title: 'View calendar', prompt: 'Show me a month calendar with a few sample events on it' },
	{ id: 'take-quiz', title: 'Take a quiz', prompt: 'Quiz me with 5 world geography questions and show my score at the end' },
	{ id: 'explain-concept', title: 'Explain concept', prompt: 'Explain how compound interest works in a few lines, with a simple chart' },
	{ id: 'study-plan', title: 'Study plan', prompt: 'Make me a 4-week study plan for learning basic statistics, a few hours a week' },
	{ id: 'health-summary', title: 'Health summary', prompt: 'Summarize my week of health data: steps, sleep and resting heart rate, with trends (sample data)' },
	{ id: 'expense-breakdown', title: 'Expense breakdown', prompt: 'Break down my monthly expenses by category in a chart (sample budget)' },
	{ id: 'create-invoice', title: 'Create invoice', prompt: 'Make me an invoice for 3 hours of design work and a logo package, with tax and a total (sample client)' },
	{ id: 'financial-summary', title: 'Financial summary', prompt: 'Give me a quarterly financial summary: revenue, costs, profit and cash, with trends (sample company)' },
	{ id: 'review-nda', title: 'Review NDA', prompt: 'Review a sample mutual NDA and flag the clauses I should read closely, with a short note on each' },
	{ id: 'due-diligence', title: 'Due diligence', prompt: 'Make me a due diligence checklist for buying a small online shop, with a status for each item' },
	{ id: 'compliance-check', title: 'Compliance check', prompt: 'Run a privacy check on a sample signup form and list what passes and what needs fixing' },
	{ id: 'meeting-agenda', title: 'Meeting agenda', prompt: 'Draft a 30-minute weekly team meeting agenda with timed items and owners' },
	{ id: 'pizza', title: 'Order pizza', prompt: 'Build me a pizza: pick a size, crust and toppings and show the price (sample menu)' },
	{ id: 'find-recipe', title: 'Find a recipe', prompt: 'Find me a quick vegetarian dinner recipe with ingredients and steps' },
	{ id: 'yoga', title: 'Yoga session', prompt: 'Guide me through a 15-minute morning yoga session, one pose at a time with a timer' },
	{ id: 'track-progress', title: 'Track progress', prompt: 'Track my running over the last 8 weeks: distance and pace in a chart (sample data)' },
	{ id: 'documentaries', title: 'Find documentaries', prompt: 'Recommend 6 nature documentaries with ratings and running time (sample titles)' },
	{ id: 'play-music', title: 'Play music', prompt: 'Make me a music player with a short focus playlist (sample tracks)' },
	{ id: 'podcasts', title: 'Podcast discovery', prompt: 'Suggest science podcasts I might like, with topics and episode lengths (sample shows)' },
	{ id: 'appointment', title: 'Book appointment', prompt: 'Help me pick a time for a dentist appointment next week from the open slots (sample calendar)' },
	{ id: 'weekend-getaway', title: 'Weekend getaway', prompt: 'Plan a weekend getaway to the mountains: where to stay, what to do and a rough budget (sample places)' }
];

/** One chip in a group: its id, its lucide icon name, and an optional shorter title for the chip. */
export type GroupChip = [id: string, icon: string, title?: string];

/** The landing's suggestion groups, in order, each chip in order. Labels render uppercase. */
export const suggestionGroups: { label: string; chips: GroupChip[] }[] = [
	{
		label: 'Browse & discover',
		chips: [
			['pick-laptop', 'laptop'],
			['shop-headphones', 'headphones'],
			['browse-products', 'shopping-bag'],
			['compare-tech', 'columns-2'],
			['find-deals', 'tag'],
			['restaurant-search', 'utensils-crossed'],
			['coffee-shops', 'coffee'],
			['directions', 'navigation'],
			['weather', 'cloud']
		]
	},
	{
		label: 'Create & build',
		chips: [
			['draft-announcement', 'megaphone'],
			['create-survey', 'clipboard-list'],
			['drawing-pad', 'pencil']
		]
	},
	{
		label: 'Organize',
		chips: [
			['pack-list', 'briefcase'],
			['project-timeline', 'git-branch'],
			['task-checklist', 'square-check'],
			['weekly-schedule', 'list-checks'],
			['focus-timer', 'timer'],
			['take-notes', 'sticky-note'],
			['view-calendar', 'calendar'],
			['habit-tracker', 'list-todo']
		]
	},
	{
		label: 'Learn & explore',
		chips: [
			['flashcards', 'languages'],
			['take-quiz', 'graduation-cap'],
			['explain-concept', 'lightbulb'],
			['study-plan', 'book-open'],
			['explainer', 'bike'],
			['heart', 'heart-pulse']
		]
	},
	{
		label: 'Work & productivity',
		chips: [
			['health-summary', 'heart'],
			['expense-breakdown', 'chart-pie'],
			['sales-dashboard', 'trending-up', 'Sales dashboard'],
			['create-invoice', 'receipt'],
			['financial-summary', 'dollar-sign'],
			['review-nda', 'file-search'],
			['due-diligence', 'search'],
			['compliance-check', 'shield'],
			['meeting-agenda', 'file-text'],
			['bill-splitter', 'split'],
			['savings-calculator', 'piggy-bank']
		]
	},
	{
		label: 'Lifestyle',
		chips: [
			['order-burger', 'hamburger'],
			['pizza', 'pizza'],
			['meal-plan', 'salad', 'Meal planning'],
			['find-recipe', 'chef-hat'],
			['hiit-workout', 'dumbbell', 'HIIT workout'],
			['yoga', 'person-standing'],
			['track-progress', 'activity'],
			['documentaries', 'film'],
			['play-music', 'music'],
			['podcasts', 'podcast']
		]
	},
	{
		label: 'Planning',
		chips: [
			['book-table', 'concierge-bell'],
			['plan-trip', 'map'],
			['appointment', 'calendar-check'],
			['tokyo-trip', 'plane', 'Plan Tokyo trip'],
			['weekend-getaway', 'tree-palm']
		]
	},
	{
		label: 'Play',
		chips: [
			['memory-match', 'layout-grid'],
			['word-guess', 'whole-word'],
			['space-trivia', 'rocket'],
			['tic-tac-toe', 'hash'],
			['connect-four', 'circle-dot']
		]
	}
];

/** A resolved chip, ready for the chat's suggestion panel. */
export interface SuggestionChip {
	id: string;
	title: string;
	prompt: string;
	steps?: boolean;
	group: string;
	icon: string;
}

/** The chips on offer, grouped and ordered by suggestionGroups; ids not in `pool` drop out. */
export function groupedSuggestions(pool: (Scenario | ChatPrompt)[]): SuggestionChip[] {
	const byId = new Map(pool.map((c) => [c.id, c]));
	return suggestionGroups.flatMap(({ label, chips }) =>
		chips.flatMap(([id, icon, title]) => {
			const c = byId.get(id);
			if (!c) return [];
			const prompt = c.prompt ?? ('fixture' in c ? c.fixture.prompt : '');
			return [{ id, title: title ?? c.title, prompt, steps: c.steps, group: label, icon }];
		})
	);
}
