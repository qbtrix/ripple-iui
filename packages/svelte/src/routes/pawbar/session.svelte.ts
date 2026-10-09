// routes/pawbar/session.svelte.ts — The landing chat: one visitor, one conversation.
// A ChatSession sends a message through a Transport (the Paw Bar HTTP API, or
// the recorded fallback when the site has no endpoint configured) and folds
// the returned frames into turns. A turn is an ordered list of parts, text and
// cards, because text and card events interleave in stream order.
// Cards: `card.start` opens a Card whose `card.delta` text (`{"ui":…,"state":…}`)
// is pushed, with `"version":"1.0",` spliced in after the first `{`, into a
// streamSpec store; `card.final` swaps in the validated spec; `card.rejected`
// (or a turn that ends first: "truncated") drops it for a short note. The
// When the live answer is unavailable (limit, busy, unreachable) and the
// session has a `fallback` transport, the notice carries `replay`, and
// replayRecorded() plays the closest recorded answer into that same turn.
// legacy ```pawbar-card fence in chunk text is re-split on every chunk and
// fed through the same Card. Every partial spec and the final card pass
// card-policy.ts first; a refused card is dropped like a rejected one. Host
// events are inert until final, and even then only recorded for display: the
// landing has no store, so no host event makes a network call or navigates.
// Local state actions never reach the host, so they work while streaming.
// Model text is stored as plain strings; the component never uses {@html}.
// seed() folds a frame list in synchronously, so the landing can prerender a
// finished exchange through the same path (card policy included).

import type { RippleEvent } from '$lib/index.js';
import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';
import { refuseCard } from './card-policy.js';
import { parseSSE, readText, segments, type SSEFrame } from './sse.js';

export const BYOK_URL = 'https://os.pocketpaw.xyz/?ref=ripple';
export const CUSTOMER_REF_KEY = 'ripple.pawbar.customer_ref';
const REF_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

let memoryRef: string | null = null;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v: unknown, fallback = ''): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : fallback);

/** A stable anonymous id for rate limiting. localStorage when allowed, memory otherwise. */
export function customerRef(storage: () => Pick<Storage, 'getItem' | 'setItem'> | undefined = () => globalThis.localStorage): string {
	try {
		const saved = storage()?.getItem(CUSTOMER_REF_KEY);
		if (saved && REF_PATTERN.test(saved)) return saved;
	} catch {
		/* storage blocked: fall through to memory */
	}
	memoryRef ??= newRef();
	try {
		storage()?.setItem(CUSTOMER_REF_KEY, memoryRef);
	} catch {
		/* keep the in-memory id */
	}
	return memoryRef;
}

function newRef(): string {
	if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID();
	return `v${Date.now().toString(36)}${Math.random().toString(36).slice(2, 12)}`;
}

export type Transport = (message: string, signal: AbortSignal) => AsyncIterable<SSEFrame>;

export class ChatHttpError extends Error {
	constructor(
		readonly status: number,
		readonly detail: string
	) {
		super(`HTTP ${status}: ${detail}`);
	}
}

export interface PawbarConfig {
	endpoint: string;
	widgetId: string;
	siteKey: string;
	fetch?: typeof fetch;
	ref?: () => string;
}

export function pawbarTransport(cfg: PawbarConfig): { send: Transport; conversationId: () => string | undefined } {
	let conversationId: string | undefined;
	const doFetch = cfg.fetch ?? ((...a: Parameters<typeof fetch>) => fetch(...a));
	async function* send(message: string, signal: AbortSignal): AsyncGenerator<SSEFrame> {
		const res = await doFetch(`${cfg.endpoint.replace(/\/$/, '')}/api/v1/paw-bar/chat`, {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			credentials: 'omit',
			signal,
			body: JSON.stringify({
				widget_id: cfg.widgetId,
				signed_key: cfg.siteKey,
				customer_ref: (cfg.ref ?? customerRef)(),
				message,
				...(conversationId ? { conversation_id: conversationId } : {})
			})
		});
		if (!res.ok || !res.body) {
			let detail = '';
			try {
				const body: unknown = await res.json();
				if (isRecord(body)) detail = str(body.detail);
			} catch {
				/* not JSON */
			}
			throw new ChatHttpError(res.status, detail);
		}
		for await (const frame of parseSSE(readText(res.body))) {
			const id = isRecord(frame.data) ? frame.data.conversation_id : undefined;
			if (typeof id === 'string') conversationId = id;
			yield frame;
		}
	}
	return { send, conversationId: () => conversationId };
}

let cardSeq = 0;

export class Card {
	/** Unique per page, whatever card_id the server sent (it may repeat or be empty). */
	readonly id = `card-${++cardSeq}`;
	status = $state<'streaming' | 'final' | 'rejected'>('streaming');
	spec = $state.raw<Record<string, unknown> | null>(null);
	reason = $state<string | null>(null);
	/** The last host event this card sent, once it is final. */
	sent = $state<string | null>(null);
	/** The card's JSON text as received so far (the spec peek shows it). */
	text = $state('');
	readonly store: StreamSpecStore;
	#push!: ReadableStreamDefaultController<string>;
	#open = true;

	/** `title`: a label from `card.start` (the recordings send the scenario title). */
	constructor(readonly title = '') {
		const source = new ReadableStream<string>({ start: (c) => void (this.#push = c) });
		// throttleMs 0: every delta is parsed, so every partial spec passes the
		// card policy before <Ripple> renders it, with no throttle window between
		// a delta arriving and the card showing it.
		this.store = streamSpec(source, {
			throttleMs: 0,
			onUpdate: (spec) => {
				const why = refuseCard(spec, { partial: true });
				if (why) this.reject(why);
			}
		});
	}

	/** Appends raw card JSON text. */
	delta(text: string) {
		if (!this.#open || !text) return;
		const first = this.text.trim() === '';
		this.text += text;
		if (first) {
			const i = text.search(/\S/);
			if (i < 0) return;
			if (text[i] === '{') text = `{"version":"1.0",${text.slice(i + 1)}`;
		}
		this.#push.enqueue(text);
	}

	/** For the legacy fence: `body` is the whole card text so far; pushes only the growth. */
	feed(body: string) {
		if (body.length > this.text.length) this.delta(body.slice(this.text.length));
	}

	final(card: unknown) {
		if (!this.#open) return;
		if (!isRecord(card) || !isRecord(card.ui)) return this.reject('invalid');
		const why = refuseCard(card);
		if (why) return this.reject(why);
		this.spec = { version: '1.0', ui: card.ui, ...(card.state === undefined ? {} : { state: card.state }) };
		this.status = 'final';
		this.#close();
	}

	reject(reason: string) {
		if (!this.#open) return;
		this.reason = reason;
		this.status = 'rejected';
		this.#close();
	}

	#close() {
		this.#open = false;
		try {
			this.#push.close();
		} catch {
			/* already closed */
		}
	}
}

export type Part = { kind: 'text'; text: string } | { kind: 'card'; card: Card };
export type NoticeKind = 'limit' | 'busy' | 'error' | 'info' | 'stopped';
export interface Notice {
	kind: NoticeKind;
	text: string;
	link?: { href: string; label: string };
	/** The recorded answer can play in this turn instead: ChatSession.replayRecorded. */
	replay?: boolean;
}
export interface Turn {
	id: number;
	role: 'user' | 'assistant';
	parts: Part[];
	notice: Notice | null;
	pending: boolean;
}

export function describeHttpError(status: number, detail: string): Notice {
	if (status === 429) return { kind: 'busy', text: 'A lot of people are trying this right now. Give it a few seconds, then send again.' };
	if (status === 401 || status === 403)
		return { kind: 'error', text: 'The live chat is not available on this page right now. The recorded examples below still work.' };
	if (status === 400 || detail === 'message_rejected') return { kind: 'error', text: 'That message could not be sent. Try saying it another way.' };
	return { kind: 'error', text: 'The assistant could not be reached. Try again in a moment.' };
}

/** The per-turn bookkeeping that never needs to be reactive. */
interface TurnState {
	cards: Map<string, Card>;
	/** Text since the last native card, re-split for legacy fences on each chunk. */
	run: string;
	runStart: number;
	legacy: Card[];
	/** Unavailable notices in this turn may offer the recorded answer. */
	replay: boolean;
}

let turnSeq = 0;
const MAX_RUN = 1_000_000;

export class ChatSession {
	turns = $state<Turn[]>([]);
	busy = $state(false);
	#abort: AbortController | null = null;

	constructor(
		private readonly transport: Transport,
		private readonly fallback?: Transport
	) {}

	async send(message: string) {
		const text = message.trim();
		if (!text || this.busy) return;
		this.turns.push({ id: ++turnSeq, role: 'user', parts: [{ kind: 'text', text }], notice: null, pending: false });
		this.turns.push({ id: ++turnSeq, role: 'assistant', parts: [], notice: null, pending: true });
		await this.#run(this.turns[this.turns.length - 1], text, this.transport);
	}

	/** Shows a finished exchange at once, no transport (the landing's prerendered fold). */
	seed(message: string, frames: Iterable<SSEFrame>) {
		this.turns.push({ id: ++turnSeq, role: 'user', parts: [{ kind: 'text', text: message }], notice: null, pending: false });
		this.turns.push({ id: ++turnSeq, role: 'assistant', parts: [], notice: null, pending: false });
		const turn = this.turns[this.turns.length - 1];
		const st: TurnState = { cards: new Map(), run: '', runStart: 0, legacy: [], replay: false };
		for (const frame of frames) if (this.#apply(turn, st, frame)) break;
		this.#flushRun(turn, st, true);
		for (const card of st.cards.values()) card.reject('truncated');
	}

	/** Plays the recorded answer into a turn whose notice offered it, in place. */
	async replayRecorded(turnId: number) {
		const i = this.turns.findIndex((t) => t.id === turnId);
		const turn = this.turns[i];
		const ask = this.turns[i - 1];
		if (!this.fallback || this.busy || !turn?.notice?.replay || ask?.parts[0]?.kind !== 'text') return;
		turn.notice = null;
		turn.parts = [];
		turn.pending = true;
		await this.#run(turn, ask.parts[0].text, this.fallback);
	}

	async #run(turn: Turn, text: string, transport: Transport) {
		const replay = this.fallback != null && transport !== this.fallback;
		const st: TurnState = { cards: new Map(), run: '', runStart: 0, legacy: [], replay };
		this.busy = true;
		const abort = (this.#abort = new AbortController());
		try {
			for await (const frame of transport(text, abort.signal)) {
				if (abort.signal.aborted) break;
				if (this.#apply(turn, st, frame)) break;
			}
			if (abort.signal.aborted) turn.notice ??= { kind: 'stopped', text: 'Stopped.' };
		} catch (err) {
			if (abort.signal.aborted) turn.notice ??= { kind: 'stopped', text: 'Stopped.' };
			else if (err instanceof ChatHttpError) {
				const rejected = err.status === 400 || err.detail === 'message_rejected';
				turn.notice = { ...describeHttpError(err.status, err.detail), ...(replay && !rejected ? { replay } : {}) };
			} else turn.notice = { kind: 'error', text: 'The assistant could not be reached. Try again in a moment.', ...(replay ? { replay } : {}) };
		} finally {
			this.#flushRun(turn, st, true);
			for (const card of [...st.cards.values(), ...st.legacy]) card.reject('truncated');
			turn.pending = false;
			this.busy = false;
			if (this.#abort === abort) this.#abort = null;
		}
	}

	stop() {
		this.#abort?.abort();
	}

	/** The `onEvent` handler for a card's <Ripple>. Inert until the card is final. */
	hostEvent(card: Card, event: RippleEvent): undefined {
		if (card.status !== 'final') return undefined;
		const e: Record<string, unknown> = { ...event };
		const kind = str(e.action, str(e.type, 'event'));
		const detail = str(e.message) || str(e.event) || str(e.target) || str(e.url);
		card.sent = detail ? `${kind}: ${detail}` : kind;
		return undefined;
	}

	/** Applies one frame; returns true when the turn is over. */
	#apply(turn: Turn, st: TurnState, { event, data }: SSEFrame): boolean {
		const d = isRecord(data) ? data : {};
		const id = str(d.card_id);
		switch (event) {
			case 'chunk':
				if (typeof d.content === 'string') {
					st.run += d.content;
					if (st.run.length > MAX_RUN) {
						turn.notice = { kind: 'error', text: 'That answer was too long to show.' };
						return true;
					}
					this.#flushRun(turn, st, false);
				}
				return false;
			case 'card.start': {
				// Close what is open: held-back text, a legacy fence never closed,
				// a card already started under this id.
				this.#flushRun(turn, st, true);
				for (const open of st.legacy) open.reject('truncated');
				st.cards.get(id)?.reject('truncated');
				const card = new Card(str(d.title));
				st.cards.set(id, card);
				turn.parts.push({ kind: 'card', card });
				st.run = '';
				st.legacy = [];
				st.runStart = turn.parts.length;
				return false;
			}
			case 'card.delta':
				if (typeof d.text === 'string') st.cards.get(id)?.delta(d.text);
				return false;
			case 'card.final':
				st.cards.get(id)?.final(d.card);
				st.cards.delete(id);
				return false;
			case 'card.rejected':
				st.cards.get(id)?.reject(str(d.reason, 'rejected'));
				st.cards.delete(id);
				return false;
			case 'unavailable':
				turn.notice =
					d.reason === 'limit'
						? {
								kind: 'limit',
								text: 'You have used the free answers for today.',
								link: { href: BYOK_URL, label: 'Bring your own key for unlimited use' },
								...(st.replay ? { replay: true } : {})
							}
						: { kind: 'busy', text: 'The assistant is busy right now. Try again in a minute.', ...(st.replay ? { replay: true } : {}) };
				return true;
			case 'error':
				turn.notice = { kind: 'error', text: 'Something went wrong partway through. Try sending it again.', ...(st.replay ? { replay: true } : {}) };
				return true;
			case 'interrupted':
				turn.notice = { kind: 'stopped', text: 'The answer stopped early.' };
				return true;
			case 'human_replying':
				turn.notice = { kind: 'info', text: typeof d.message === 'string' && d.message ? d.message : 'A person is replying.' };
				return false;
			case 'stream_end':
				if (d.cancelled) turn.notice ??= { kind: 'stopped', text: 'Stopped.' };
				return true;
			default:
				return false; // message.persisted, sources, action: nothing to show here yet
		}
	}

	/** Re-derives the parts after the last native card from the run text (legacy fences included). */
	#flushRun(turn: Turn, st: TurnState, done: boolean) {
		const parts: Part[] = [];
		let k = 0;
		for (const seg of segments(st.run, done)) {
			if (seg.kind === 'text') {
				parts.push({ kind: 'text', text: seg.text });
				continue;
			}
			const card = (st.legacy[k] ??= new Card());
			k++;
			card.feed(seg.text);
			if (seg.closed && card.status === 'streaming') {
				try {
					card.final(JSON.parse(seg.text));
				} catch {
					card.reject('invalid');
				}
			}
			parts.push({ kind: 'card', card });
		}
		if (done) st.legacy = st.legacy.filter((c) => c.status === 'streaming');
		turn.parts.splice(st.runStart, turn.parts.length - st.runStart, ...parts);
	}
}
