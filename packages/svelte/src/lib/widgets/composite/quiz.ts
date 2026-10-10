// widgets/composite/quiz.ts — the rules behind the `quiz` widget, kept out of
// the component so they test without a DOM: cleaning the model's questions
// (a bad one is skipped, never a crash), normalising the bound value, scoring,
// the streak and the verdict band.
//
// Invariants:
// - `answers[i]` is the ORIGINAL choice index the visitor picked for the i-th
//   playable question (null = ran out of time), so shuffling the display order
//   never changes a score or the review list.
// - `score` and `done` in the bound value are outputs: they are recomputed
//   from `answers` against the questions, never trusted from the host.
import { finite, plain } from '../data-kit/format.js';

export const MAX_QUESTIONS = 12;
export const MIN_CHOICES = 2;
export const MAX_CHOICES = 5;
export const SECONDS = { min: 3, max: 600 } as const;

export interface QuizItem {
	id?: string;
	prompt: string;
	choices: string[];
	/** Index into `choices` of the right one. */
	answer: number;
	why?: string;
	image?: string;
}

export interface QuizValue {
	/** The question on screen; `total` once the visitor is on the score screen. */
	index: number;
	/** Picked choice per answered question (original index); null = timed out. */
	answers: (number | null)[];
	score: number;
	done: boolean;
}

/** The part of the value the visitor actually changes. */
export type QuizPlay = Pick<QuizValue, 'index' | 'answers'>;

export interface CleanQuestion {
	key: string;
	prompt: string;
	choices: string[];
	answer: number;
	why: string;
	image: unknown;
}

const rec = (v: unknown): Record<string, unknown> =>
	v !== null && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};

/**
 * The playable questions. An unfinished one (no prompt, under two choices, a
 * blank choice, no answer yet: all normal mid-stream) is dropped quietly; an
 * answer that points outside the choices is dropped with a warning. Past 12
 * the rest are cut, with a warning.
 */
export function cleanQuestions(raw: unknown, warn: (msg: string) => void = () => {}): CleanQuestion[] {
	if (!Array.isArray(raw)) return [];
	if (raw.length > MAX_QUESTIONS) warn(`[ripple] quiz: ${raw.length} questions, showing the first ${MAX_QUESTIONS}`);
	return raw.slice(0, MAX_QUESTIONS).flatMap((item, i) => {
		const q = rec(item);
		const prompt = plain(q.prompt);
		const choices = Array.isArray(q.choices) ? q.choices.slice(0, MAX_CHOICES).map((c) => plain(c)) : [];
		if (!prompt || choices.length < MIN_CHOICES || choices.some((c) => !c)) return [];
		const answer = finite(q.answer);
		if (answer === undefined) return [];
		if (!Number.isInteger(answer) || answer < 0 || answer >= choices.length) {
			warn(`[ripple] quiz: question ${i + 1} ("${prompt.slice(0, 40)}") has answer ${String(q.answer)} outside its ${choices.length} choices; skipped`);
			return [];
		}
		return [{ key: `${typeof q.id === 'string' ? q.id : ''}:${i}`, prompt, choices, answer, why: plain(q.why), image: q.image }];
	});
}

/** A bound value from the host, normalised; undefined when it is not one. */
export function toPlay(v: unknown): QuizPlay | undefined {
	const r = rec(v);
	if (!Array.isArray(r.answers)) return undefined;
	const answers = r.answers.slice(0, MAX_QUESTIONS).map((a) => {
		const n = finite(a);
		return n !== undefined && Number.isInteger(n) && n >= 0 ? n : null;
	});
	const index = Math.min(Math.max(Math.trunc(finite(r.index) ?? answers.length), 0), answers.length);
	return { index, answers };
}

export function scoreOf(questions: readonly CleanQuestion[], answers: readonly (number | null)[]): number {
	return questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
}

/** Right answers in a row, counted back from the latest. */
export function streakOf(questions: readonly CleanQuestion[], answers: readonly (number | null)[]): number {
	let n = 0;
	for (let i = Math.min(answers.length, questions.length) - 1; i >= 0 && answers[i] === questions[i].answer; i--) n++;
	return n;
}

export function bestStreakOf(questions: readonly CleanQuestion[], answers: readonly (number | null)[]): number {
	let best = 0;
	let run = 0;
	questions.forEach((q, i) => {
		run = i < answers.length && answers[i] === q.answer ? run + 1 : 0;
		best = Math.max(best, run);
	});
	return best;
}

export function toValue(questions: readonly CleanQuestion[], play: QuizPlay): QuizValue {
	return {
		index: play.index,
		answers: [...play.answers],
		score: scoreOf(questions, play.answers),
		done: questions.length > 0 && play.answers.length >= questions.length
	};
}

export type Band = { word: string; line: string; status: 'good' | 'info' | 'warn' };

/** The end-screen verdict by share of right answers. */
export function bandOf(score: number, total: number): Band {
	const pct = total > 0 ? score / total : 0;
	if (pct >= 0.9) return { word: 'Expert', line: 'You know this cold.', status: 'good' };
	if (pct >= 0.7) return { word: 'Sharp', line: 'A strong round.', status: 'good' };
	if (pct >= 0.4) return { word: 'Getting there', line: 'Read the misses and try again.', status: 'info' };
	return { word: 'Warming up', line: 'Every miss below has its answer.', status: 'warn' };
}

export function clampSeconds(v: unknown): number | undefined {
	const n = finite(v);
	return n === undefined || n <= 0 ? undefined : Math.min(Math.max(Math.round(n), SECONDS.min), SECONDS.max);
}
