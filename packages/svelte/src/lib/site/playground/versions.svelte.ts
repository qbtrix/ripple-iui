// lib/site/playground/versions.svelte.ts — The playground's version model.
// Every card an answer produced is a version: the preview and JSON panes show
// one at a time. With no pick the newest is shown. A pick holds while the
// list is no longer than when it was made (an older chip stays shown while
// its newer sibling finishes), and a card that arrives after it takes over. A Version is the shape the panes
// read; the chat's Card already has it, a shared link and a preview replay
// build their own. Structural on purpose: lib/ must not import routes/.

import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';

export interface Version {
	readonly id: string;
	readonly title: string;
	readonly status: 'streaming' | 'final' | 'rejected';
	readonly spec: Record<string, unknown> | null;
	/** The JSON text as received so far. */
	readonly text: string;
	readonly reason: string | null;
	readonly store: StreamSpecStore | null;
}

type PartLike = { kind: 'text' } | { kind: 'card'; card: Version };

/** Every card in the conversation, oldest first. */
export const versionsOf = (turns: readonly { parts: readonly PartLike[] }[]): Version[] =>
	turns.flatMap((t) => t.parts.flatMap((p) => (p.kind === 'card' ? [p.card] : [])));

/** The selected version, or the newest when nothing (or something gone) is selected. */
export const pickVersion = <V extends { id: string }>(list: readonly V[], selected: string | null): V | null =>
	list.find((v) => v.id === selected) ?? list.at(-1) ?? null;

/** A chip pick, remembered with how many versions existed when it was made. */
export type Pick = { id: string; count: number } | null;

/** The picked version until a newer one arrives after the pick; then the newest, so a new answer takes the panes. */
export const currentVersion = <V extends { id: string }>(list: readonly V[], pick: Pick): V | null =>
	pickVersion(list, pick && list.length <= pick.count ? pick.id : null);

/** Widget nodes in a ui tree (children and else_children). */
export function countNodes(node: unknown): number {
	if (typeof node !== 'object' || node === null || Array.isArray(node)) return 0;
	const n = node as { children?: unknown; else_children?: unknown };
	let total = 1;
	for (const kids of [n.children, n.else_children]) if (Array.isArray(kids)) for (const k of kids) total += countNodes(k);
	return total;
}

const encoder = new TextEncoder();
export const byteLength = (text: string) => encoder.encode(text).length;
export const formatBytes = (n: number) => (n < 1024 ? `${n} B` : `${(n / 1024).toFixed(1)} KB`);

/** A spec opened from a link: final at once, never through the card policy (it is the visitor's own). */
export function sharedVersion(text: string): Version {
	const spec = JSON.parse(text) as Record<string, unknown>;
	return { id: 'shared', title: 'Shared spec', status: 'final', spec, text, reason: null, store: null };
}

let replaySeq = 0;

/** A version streamed again in the preview from `source`, ending as `of`'s spec. */
export class ReplayVersion implements Version {
	readonly id = `replay-${++replaySeq}`;
	readonly title: string;
	readonly reason = null;
	readonly store: StreamSpecStore;
	status = $state<'streaming' | 'final'>('streaming');
	text = $state('');
	spec = $state.raw<Record<string, unknown> | null>(null);

	constructor(of: Version, source: AsyncIterable<string>, signal: AbortSignal) {
		this.title = of.title;
		this.store = streamSpec(this.#tap(of, source, signal), { signal, throttleMs: 40 });
	}

	async *#tap(of: Version, source: AsyncIterable<string>, signal: AbortSignal) {
		try {
			for await (const piece of source) {
				this.text += piece;
				yield piece;
			}
		} finally {
			if (!signal.aborted) {
				this.spec = of.spec;
				this.status = 'final';
			}
		}
	}
}
