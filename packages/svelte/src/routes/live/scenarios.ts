// routes/live/scenarios.ts — The /live scenario registry and the fixture contract.
// Each fixture is a real model stream recorded offline by
// scripts/record-scenario.ts. Other tasks import these types and this list,
// so the shapes below are a contract: add fields, never rename or remove.

import billSplitter from './fixtures/bill-splitter.json';
import savingsCalculator from './fixtures/savings-calculator.json';

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
	{ id: 'savings-calculator', title: 'Watch savings grow', category: 'Money', fixture: savingsCalculator }
];
