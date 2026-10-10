// routes/live/suggestions.test.ts — The landing's suggestion groups resolve as the brief lists them.
// Live, every chip (recorded, chat-only, play) sits in its group in order;
// offline (recordings only) the chat-only chips drop out and so do groups left
// empty. Every chip on offer has a place in suggestionGroups and an icon.

import { expect, test } from 'vitest';
import { chatPrompts, groupedSuggestions, scenarios, suggestionGroups } from './scenarios.js';
import { playScenarios } from '../pawbar/play-cards.js';
import { chipIcons } from '../pawbar/chip-icons.js';

const all = [...scenarios, ...chatPrompts, ...playScenarios];
const byGroup = (chips: ReturnType<typeof groupedSuggestions>) => {
	const out: Record<string, string[]> = {};
	for (const c of chips) (out[c.group] ??= []).push(c.title);
	return out;
};

test('live, all 8 groups render with the listed chips in order', () => {
	const groups = byGroup(groupedSuggestions(all));
	expect(Object.keys(groups)).toEqual(['Browse & discover', 'Create & build', 'Organize', 'Learn & explore', 'Work & productivity', 'Lifestyle', 'Planning', 'Play']);
	expect(groups['Browse & discover']).toEqual(['Help me pick a laptop', 'Shop headphones', 'Browse products', 'Compare tech', 'Find deals', 'Restaurant search', 'Find coffee shops', 'Get directions', 'Weather forecast']);
	expect(groups['Create & build']).toEqual(['Draft announcement', 'Create survey', 'Drawing pad']);
	expect(groups['Organize']).toEqual(['Pack for trip', 'Project timeline', 'Task checklist', 'Weekly schedule', 'Focus timer', 'Take notes', 'View calendar', 'Habit tracker']);
	expect(groups['Learn & explore']).toEqual(['Spanish flashcards', 'Take a quiz', 'Explain concept', 'Study plan', 'How bike gears work', 'How a heart pumps']);
	expect(groups['Work & productivity']).toEqual(['Health summary', 'Expense breakdown', 'Sales dashboard', 'Create invoice', 'Financial summary', 'Review NDA', 'Due diligence', 'Compliance check', 'Meeting agenda', 'Split the bill', 'Watch savings grow']);
	expect(groups['Lifestyle']).toEqual(['Order a burger', 'Order pizza', 'Meal planning', 'Find a recipe', 'HIIT workout', 'Yoga session', 'Track progress', 'Find documentaries', 'Play music', 'Podcast discovery']);
	expect(groups['Planning']).toEqual(['Book a table', 'Plan a trip with me', 'Book appointment', 'Plan Tokyo trip', 'Weekend getaway']);
	expect(groups['Play']).toEqual(['Memory match', 'Guess the word', 'Space trivia', 'Tic-tac-toe', 'Connect four']);
});

test('offline (recordings only), chat-only chips and empty groups drop out', () => {
	const recorded = [...scenarios, ...playScenarios].filter((s) => !s.needsStore);
	const groups = byGroup(groupedSuggestions(recorded));
	expect(Object.keys(groups)).toEqual(['Organize', 'Learn & explore', 'Work & productivity', 'Lifestyle', 'Planning', 'Play']);
	expect(groups['Lifestyle']).toEqual(['Meal planning', 'HIIT workout']);
});

test('every chip on offer has a group, an icon and a prompt; step chips keep their tag', () => {
	const placed = suggestionGroups.flatMap((g) => g.chips.map(([id]) => id));
	expect(new Set(placed).size).toBe(placed.length);
	expect(all.map((c) => c.id).filter((id) => !placed.includes(id))).toEqual([]);
	expect(placed.filter((id) => !all.some((c) => c.id === id))).toEqual([]);
	for (const c of groupedSuggestions(all)) {
		expect(chipIcons[c.icon], c.icon).toBeTruthy();
		expect(c.prompt.length).toBeGreaterThan(10);
	}
	expect(groupedSuggestions(all).filter((c) => c.steps).map((c) => c.id)).toEqual(['pick-laptop', 'order-burger', 'book-table', 'plan-trip']);
});
