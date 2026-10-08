// routes/live/replay.ts — Plays a recorded model stream back on its original timing.
// Yields each fixture chunk's text at `t / speed` ms after the start, so
// streamSpec sees the same cadence the model produced. speed = Infinity skips
// every wait (tests). Aborting `signal` ends the iteration quietly.

import type { ScenarioFixture } from './scenarios.js';

export interface ReplayOptions {
	speed?: number;
	signal?: AbortSignal;
}

export async function* replay(
	fixture: ScenarioFixture,
	{ speed = 1, signal }: ReplayOptions = {}
): AsyncIterable<string> {
	const start = performance.now();
	for (const chunk of fixture.chunks) {
		if (signal?.aborted) return;
		const wait = Number.isFinite(speed) ? chunk.t / speed - (performance.now() - start) : 0;
		if (wait > 0) await sleep(wait, signal);
		if (signal?.aborted) return;
		yield chunk.text;
	}
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	return new Promise((done) => {
		const id = setTimeout(finish, ms);
		signal?.addEventListener('abort', finish, { once: true });
		function finish() {
			clearTimeout(id);
			signal?.removeEventListener('abort', finish);
			done();
		}
	});
}
