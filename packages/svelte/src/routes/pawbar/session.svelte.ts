// routes/pawbar/session.svelte.ts — The landing chat: one visitor, one conversation.
// A ChatSession sends a message through a Transport (the Paw Bar HTTP API, or
// the recorded fallback when the site has no endpoint configured) and folds
// the returned frames into turns. A turn is an ordered list of parts, text and
// cards, because text and card events interleave in stream order.
// Cards: `card.start` opens a Card whose `card.delta` text (`{"ui":…,"state":…}`)
// is pushed, with `"version":"1.0",` spliced in after the first `{`, into a
// streamSpec store; `card.final` swaps in the validated spec; `card.rejected`
// (or a turn that ends first: "truncated") drops it for a short note. The
// legacy ```pawbar-card fence in chunk text is re-split on every chunk and
// fed through the same Card. Host events from a card are inert until final;
// local state actions never reach the host, so they work while streaming.
// Model text is stored as plain strings; the component never uses {@html}.

import type { RippleEvent } from '$lib/index.js';
import { streamSpec, type StreamSpec, type StreamSpecStore } from '$lib/streaming/index.js';
import { parseSSE, readText, segments, type SSEFrame } from './sse.js';

export const BYOK_URL = 'https://os.pocketpaw.xyz/?ref=ripple';
export const CUSTOMER_REF_KEY = 'ripple.pawbar.customer_ref';
const REF_PATTERN = /^[A-Za-z0-9_-]{8,128}$/;

let memoryRef: string | null = null;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' || typeof v === 'number' ? String(v) : fallback);

/** A stable anonymous id for rate limiting. localStorage when allowed, memory otherwise. */
export function customerRef(storage: () => Storage | undefined = () => globalThis.localStorage): string {
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
				detail = str(((await res.json()) as { detail?: unknown }).detail);
			} catch {
				/* not JSON */
			}
			throw new ChatHttpError(res.status, detail);
		}
		for await (const frame of parseSSE(readText(res.body))) {
			const id = (frame.data as { conversation_id?: unknown } | null)?.conversation_id;
			if (typeof id === 'string') conversationId = id;
			yield frame;
		}
	}
	return { send, conversationId: () => conversationId };
}

export class Card {
	status = $state<'streaming' | 'final' | 'rejected'>('streaming');
	spec = $state.raw<StreamSpec | null>(null);
	reason = $state<string | null>(null);
	/** The last host event this card sent, once it is final. */
	sent = $state<string | null>(null);
	readonly store: StreamSpecStore;
	#push!: ReadableStreamDefaultController<string>;
	#fed = '';
	#open = true;

	constructor(readonly id: string) {
		const source = new ReadableStream<string>({ start: (c) => void (this.#push = c) });
		// throttleMs 0: streamSpec's throttle has no trailing parse, so a pause in
		// the stream would leave the card behind the text it has already received.
		this.store = streamSpec(source, { throttleMs: 0 });
	}

	/** Appends raw card JSON text. */
	delta(text: string) {
		if (!this.#open || !text) return;
		const first = this.#fed.trim() === '';
		this.#fed += text;
		if (first) {
			const i = text.search(/\S/);
			if (i < 0) return;
			if (text[i] === '{') text = `{"version":"1.0",${text.slice(i + 1)}`;
		}
		this.#push.enqueue(text);
	}

	/** For the legacy fence: `body` is the whole card text so far; pushes only the growth. */
	feed(body: string) {
		if (body.length > this.#fed.length) this.delta(body.slice(this.#fed.length));
	}

	final(card: unknown) {
		if (!this.#open) return;
		const c = card as { ui?: unknown; state?: unknown } | null;
		if (!c || typeof c !== 'object' || !c.ui || typeof c.ui !== 'object') return this.reject('invalid');
		this.spec = { version: '1.0', ...(c as object) } as StreamSpec;
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
}

let turnSeq = 0;

export class ChatSession {
	turns = $state<Turn[]>([]);
	busy = $state(false);
	#abort: AbortController | null = null;

	constructor(private readonly transport: Transport) {}

	async send(message: string) {
		const text = message.trim();
		if (!text || this.busy) return;
		this.turns.push({ id: ++turnSeq, role: 'user', parts: [{ kind: 'text', text }], notice: null, pending: false });
		this.turns.push({ id: ++turnSeq, role: 'assistant', parts: [], notice: null, pending: true });
		const turn = this.turns[this.turns.length - 1];
		const st: TurnState = { cards: new Map(), run: '', runStart: 0, legacy: [] };
		this.busy = true;
		const abort = (this.#abort = new AbortController());
		try {
			for await (const frame of this.transport(text, abort.signal)) {
				if (abort.signal.aborted) break;
				if (this.#apply(turn, st, frame)) break;
			}
			if (abort.signal.aborted) turn.notice ??= { kind: 'stopped', text: 'Stopped.' };
		} catch (err) {
			if (abort.signal.aborted) turn.notice ??= { kind: 'stopped', text: 'Stopped.' };
			else if (err instanceof ChatHttpError) turn.notice = describeHttpError(err.status, err.detail);
			else turn.notice = { kind: 'error', text: 'The assistant could not be reached. Try again in a moment.' };
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
		const e = event as RippleEvent & { action?: string; message?: unknown; event?: unknown; target?: unknown };
		const kind = str(e.action, str(e.type, 'event'));
		const detail = str(e.message) || str(e.event) || str(e.target) || str(event.url);
		card.sent = detail ? `${kind}: ${detail}` : kind;
		return undefined;
	}

	/** Applies one frame; returns true when the turn is over. */
	#apply(turn: Turn, st: TurnState, { event, data }: SSEFrame): boolean {
		const d = (data ?? {}) as Record<string, unknown>;
		const id = str(d.card_id);
		switch (event) {
			case 'chunk':
				if (typeof d.content === 'string') {
					st.run += d.content;
					this.#flushRun(turn, st, false);
				}
				return false;
			case 'card.start': {
				this.#flushRun(turn, st, true);
				const card = new Card(id);
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
								link: { href: BYOK_URL, label: 'Bring your own key for unlimited use' }
							}
						: { kind: 'busy', text: 'The assistant is busy right now. Try again in a minute.' };
				return true;
			case 'error':
				turn.notice = { kind: 'error', text: 'Something went wrong partway through. Try sending it again.' };
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
			const card = (st.legacy[k] ??= new Card(`legacy-${turn.id}-${k}`));
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
