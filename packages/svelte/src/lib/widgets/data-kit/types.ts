// widgets/data-kit/types.ts — the shared data shapes of the data widgets
// (design doc 2026-10-09 §3, "Shared types"). Import types from here, not from
// the kit barrel: the barrel also exports components, and a type imported
// through it can resolve to a component's props type (see repo CLAUDE.md).

/** The one status vocabulary. Colour comes from status.ts, never from data. */
export type Status = 'good' | 'warn' | 'bad' | 'info' | 'neutral';

/** The answer up front: one model-written sentence, at most 140 chars. */
export type Verdict = { text: string; status?: Status };

/** `good` says which direction is good; without it the trend is neutral. */
export type Trend = { dir: 'up' | 'down' | 'flat'; text?: string; good?: 'up' | 'down' };

/** A stat tile's data. `kind` maps to an icon through the widget's own map. */
export type Stat = {
	id?: string;
	label: string;
	value: number | string;
	unit?: string;
	status?: Status;
	trend?: Trend;
	kind?: string;
};
