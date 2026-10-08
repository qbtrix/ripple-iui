// routes/pawbar/recorded.ts — The recorded /live scenarios, spoken as Paw Bar events.
// One source for two consumers: scripts/mock-pawbar.ts serialises these frames
// as SSE, and the landing's offline fallback (no endpoint configured) feeds
// them straight to the chat store, so both exercise the same client path.
// `findScenario` is a plain keyword-overlap match (null when nothing overlaps);
// `pickScenario` defaults that to the bill splitter. `cardChunks` re-cuts a fixture (a whole `{version,state,ui}` spec)
// into the card wire shape `{state,ui}` on the fixture's own chunk boundaries
// and timing. `mode` drives the mock's failure paths.

import { replay } from '../live/replay.js';
import { scenarios, type Scenario, type ScenarioFixture } from '../live/scenarios.js';
import { FENCE_OPEN, type SSEFrame } from './sse.js';

export type RecordedMode = 'normal' | 'reject' | 'truncate' | 'legacy';

const chunk = (content: string): SSEFrame => ({ event: 'chunk', data: { content, type: 'text' } });

const STOP = new Set(['the', 'and', 'for', 'with', 'me', 'my', 'show', 'let', 'can', 'how', 'that', 'what', 'make', 'give']);
const words = (s: string) =>
	new Set(
		s
			.toLowerCase()
			.split(/[^a-z0-9]+/)
			.filter((w) => w.length > 2 && !STOP.has(w))
	);

/** The recorded scenario that best matches the message, or null when no word overlaps. */
export function findScenario(message: string, pool: Scenario[] = scenarios): Scenario | null {
	const asked = words(message);
	let best: Scenario | null = null;
	let bestScore = 0;
	for (const s of pool) {
		if (s.fixture.prompt === message.trim()) return s;
		let score = 0;
		for (const w of words(`${s.title} ${s.fixture.prompt}`)) if (asked.has(w)) score++;
		if (score > bestScore) [best, bestScore] = [s, score];
	}
	return best;
}

/** findScenario, falling back to the bill splitter when nothing matched. */
export function pickScenario(message: string, pool: Scenario[] = scenarios): Scenario {
	return findScenario(message, pool) ?? pool.find((s) => s.id === 'bill-splitter') ?? pool[0];
}

/** The fixture's chunks with the leading `"version":"1.0",` cut out, keeping each chunk's `t`. */
export function cardChunks(f: ScenarioFixture): { t: number; text: string }[] {
	const full = f.chunks.map((c) => c.text).join('');
	const head = /^\{\s*"version"\s*:\s*"[^"]*"\s*,/.exec(full);
	const cut = head ? head[0].length - 1 : 0;
	const card = head ? `{${full.slice(head[0].length)}` : full;
	const out: { t: number; text: string }[] = [];
	let end = 0;
	let prev = 0;
	for (const c of f.chunks) {
		end += c.text.length;
		const e = end <= 1 ? end : Math.max(1, end - cut);
		if (e > prev) out.push({ t: c.t, text: card.slice(prev, e) });
		prev = Math.max(prev, e);
	}
	return out;
}

export interface RecordedOptions {
	mode?: RecordedMode;
	speed?: number;
	signal?: AbortSignal;
	/** Replaces the opening line (the offline fallback says it is a recording). */
	intro?: string;
}

export async function* recordedEvents(
	scenario: Scenario,
	{ mode = 'normal', speed = 1, signal, intro }: RecordedOptions = {}
): AsyncGenerator<SSEFrame> {
	const cardId = `card_${scenario.id}`;
	const pieces = cardChunks(scenario.fixture);
	const stream = (upTo = pieces.length) => replay({ ...scenario.fixture, chunks: pieces.slice(0, upTo) }, { speed, signal });

	yield { event: 'message.persisted', data: { run_id: `run_${Date.now()}`, client_message_id: `msg_${Date.now()}` } };
	yield chunk(intro ?? "Here is a card for that. It builds while I write it.");

	if (mode === 'legacy') {
		yield chunk('\n\n``');
		yield chunk(`${FENCE_OPEN.slice(2)}\n`);
		for await (const text of stream()) yield chunk(text);
		yield chunk('\n``');
		yield chunk('`\n\nThe card is live now. Change something and see.');
	} else {
		yield { event: 'card.start', data: { card_id: cardId } };
		const cutoff = mode === 'normal' ? pieces.length : Math.ceil(pieces.length / 2);
		for await (const text of stream(cutoff)) yield { event: 'card.delta', data: { card_id: cardId, text } };
		if (signal?.aborted) return;
		if (mode === 'normal') {
			const card: unknown = JSON.parse(pieces.map((p) => p.text).join(''));
			yield { event: 'card.final', data: { card_id: cardId, card } };
			yield chunk('The card is live now. Change something and see.');
		} else {
			yield { event: 'card.rejected', data: { card_id: cardId, reason: mode === 'truncate' ? 'truncated' : 'invalid_widget' } };
			yield chunk('That card did not come through, so I left it out.');
		}
	}
	yield { event: 'stream_end', data: { assistant_message_id: `msg_${scenario.id}`, cancelled: false } };
}
