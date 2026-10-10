// lib/site/scrub/scrub-model.ts — The scrub player's pure model over a recorded stream.
// A recording is `{ chunks: { t, text }[] }` (the /live fixture shape, typed
// structurally so lib never imports from routes). The canonical position is a
// chunk COUNT: 0 is nothing received, chunks.length is the whole spec. A clock
// position in ms maps to the count of chunks with t <= ms, except ms <= 0,
// which is 0 (the first chunk lands at t = 0, and the start must be empty).
// A step moves by distinct arrival times, never into a half-landed group.
// Parsed prefixes are cached per count, so dragging back and forth parses each
// prefix once. The cached objects go to <Ripple> as-is: never mutate them.

import { parsePartialSpec } from '$lib/streaming/json-parse.js';
import type { StreamSpec } from '$lib/streaming/types.js';

export interface Recording {
	chunks: readonly { t: number; text: string }[];
}

export interface ScrubModel {
	/** Number of chunks. */
	readonly total: number;
	/** ms of the last chunk. */
	readonly duration: number;
	/** UTF-8 bytes of the whole stream. */
	readonly totalBytes: number;
	countAt(ms: number): number;
	/** ms at which the count-th chunk arrived (0 for count 0). */
	timeAt(count: number): number;
	/** A clock position that lands on `count` (countAt(msFor(c)) === c for any reachable c). */
	msFor(count: number): number;
	/**
	 * The next reachable count in `dir`. Chunks sharing a timestamp arrive
	 * together, so a step skips the whole group.
	 */
	step(count: number, dir: 1 | -1): number;
	text(count: number): string;
	bytes(count: number): number;
	/** The partial spec for the first `count` chunks, null when nothing parses yet. */
	spec(count: number): StreamSpec | null;
}

export function createScrubModel(recording: Recording): ScrubModel {
	const { chunks } = recording;
	const total = chunks.length;
	const encoder = new TextEncoder();
	// ends[i] / byteEnds[i]: length of the prefix holding the first i chunks.
	const ends = [0];
	const byteEnds = [0];
	let full = '';
	for (const c of chunks) {
		full += c.text;
		ends.push(full.length);
		byteEnds.push(byteEnds[byteEnds.length - 1] + encoder.encode(c.text).length);
	}
	const cache = new Map<number, StreamSpec | null>();
	const clamp = (n: number) => Math.max(0, Math.min(total, Math.round(n)));

	return {
		total,
		duration: total ? chunks[total - 1].t : 0,
		totalBytes: byteEnds[total],
		countAt(ms) {
			if (!(ms > 0)) return 0;
			// First index whose t > ms; every chunk before it has arrived.
			let lo = 0;
			let hi = total;
			while (lo < hi) {
				const mid = (lo + hi) >> 1;
				if (chunks[mid].t <= ms) lo = mid + 1;
				else hi = mid;
			}
			return lo;
		},
		timeAt(count) {
			const n = clamp(count);
			return n ? chunks[n - 1].t : 0;
		},
		msFor(count) {
			const n = clamp(count);
			// The first chunk lands at t = 0, but ms 0 means nothing received.
			return n ? Math.max(chunks[n - 1].t, Number.EPSILON) : 0;
		},
		step(count, dir) {
			const n = clamp(count);
			if (dir > 0) return n >= total ? total : this.countAt(this.msFor(n + 1));
			if (n === 0) return 0;
			let c = n - 1;
			while (c > 0 && chunks[c - 1].t === chunks[n - 1].t) c--;
			return c;
		},
		text: (count) => full.slice(0, ends[clamp(count)]),
		bytes: (count) => byteEnds[clamp(count)],
		spec(count) {
			const n = clamp(count);
			let hit = cache.get(n);
			if (hit === undefined) {
				hit = (parsePartialSpec(full.slice(0, ends[n])).value as StreamSpec | null) ?? null;
				cache.set(n, hit);
			}
			return hit;
		}
	};
}
