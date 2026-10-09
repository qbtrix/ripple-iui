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
// events are inert until final. With a StoreHost (the landing passes one), a
// final card's `emit checkout` (menu-order's Cart) goes to live/checkout.ts, and
// the payment link it returns becomes the card's `pay` (a PayCard under the
// card, which polls the order and turns into tracking; retryCheckout() starts
// a new one after a cancel). The page never navigates. `emit book` (booking's request) goes to
// book.ts, and the answer is patched into the booking node's props (`notice`,
// `confirmed`, fresh `days`) with a BookingReceipt under the card on 201. One
// checkout or booking in flight per session. A final card's `emit ask` ({text})
// and a finished flow (flowComplete: a `chat` onComplete, plus the visitor's
// answers as plain sentences, see flowMessage) become the visitor's next message,
// sent exactly as the transcript shows it, now or right after the answer in
// flight (one waits; one per click). Any other host event, and every store event
// without a StoreHost, is only recorded for display.
// Local state actions never reach the host, so they work while streaming.
// Model text is stored as plain strings; the component never uses {@html}.

import type { RippleEvent, TerminalResult } from '$lib/index.js';
import { streamSpec, type StreamSpecStore } from '$lib/streaming/index.js';
import { checkout, type Pay } from '../live/checkout.js';
import { book, bookingProps, patchBooking, reloadDays, toBookingRequest, type Booked } from './book.js';
import { ASK_MAX, refuseCard, textRefusal } from './card-policy.js';
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

/** The most a finished flow's message may be. */
export const FLOW_MESSAGE_MAX = 600;
const ANSWER_MAX = 200;

/** `chosen_style` -> "Chosen style". */
const humanize = (key: string) => {
	const words = key.replace(/[_-]+/g, ' ').trim();
	return words.charAt(0).toUpperCase() + words.slice(1);
};
const oneLine = (v: string) => v.replace(/\s+/g, ' ').trim();
const sentence = (v: string) => (/[.!?]$/.test(v) ? v : `${v}.`);
const answerText = (v: unknown): string => {
	if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return oneLine(String(v)).slice(0, ANSWER_MAX);
	if (Array.isArray(v)) return v.map(answerText).filter(Boolean).join(', ');
	if (isRecord(v)) return answerText(v.label ?? v.title ?? v.name ?? v.id);
	return '';
};

/** Step titles by step key (flowId, id) and field labels by field id, read off a flow card's steps. */
function flowNames(root: unknown) {
	const steps = new Map<string, string>();
	const fields = new Map<string, string>();
	const binds = new Map<string, string>();
	const todo = [root];
	for (let n = 0; todo.length && n < 64; n++) {
		const step = todo.pop();
		if (!isRecord(step)) continue;
		const title = typeof step.title === 'string' ? oneLine(step.title) : '';
		for (const k of [step.flowId, step.id]) if (typeof k === 'string' && title) steps.set(k, title);
		for (const f of Array.isArray(step.form_fields) ? step.form_fields : [])
			if (isRecord(f) && typeof f.id === 'string' && typeof f.label === 'string') fields.set(f.id, oneLine(f.label));
		todo.push(step.chain, ...(isRecord(step.chain_map) ? Object.values(step.chain_map) : []));
		// Inputs bound into the flow's state: their label names the answer in payload.state.
		const nodes = [step.ui];
		for (let m = 0; nodes.length && m < 400; m++) {
			const node = nodes.pop();
			if (!isRecord(node)) continue;
			const path = typeof node.bind === 'string' ? node.bind.replace(/^\{state\.|\}$/g, '') : '';
			const label = isRecord(node.props) && typeof node.props.label === 'string' ? oneLine(node.props.label) : '';
			if (path && label) binds.set(path, label);
			if (Array.isArray(node.children)) nodes.push(...node.children);
		}
	}
	return { steps, fields, binds };
}

/**
 * A finished flow's message: the card's plain `onComplete` text, then one short
 * sentence per answer the visitor gave, named by the step's title (a pick) or the
 * field's label (a form value), e.g. "Plan a trip for me. What kind of trip? Food.
 * City: Lisbon. Days: 3." The card can't template the answers in (no `{` in
 * onComplete). An answer that fails the card policy's text rule (markup, a link)
 * is left out, and whole sentences stop before FLOW_MESSAGE_MAX.
 */
export function flowMessage(message: string, payload: Record<string, unknown> = {}, root?: unknown): string {
	const names = flowNames(root);
	let out = sentence(oneLine(message));
	const add = (name: string, value: unknown) => {
		const said = answerText(value);
		const clause = said && sentence(name.endsWith('?') ? `${name} ${said}` : `${name}: ${said}`);
		if (clause && !textRefusal(clause) && out.length + clause.length < FLOW_MESSAGE_MAX) out += ` ${clause}`;
	};
	for (const [key, value] of Object.entries(payload)) {
		const step = key.replace(/_(selection|formData)$/, '');
		if (key === 'state' && isRecord(value)) for (const [p, v] of Object.entries(value)) add(names.binds.get(p) ?? humanize(p.split('.').pop() ?? p), v);
		else if (key.endsWith('_formData') && isRecord(value)) for (const [f, v] of Object.entries(value)) add(names.fields.get(f) ?? humanize(f), v);
		else add(names.steps.get(step) ?? humanize(step), value);
	}
	return out;
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
	/** The host's line about a checkout from this card (progress or the reason it stopped). */
	note = $state<{ kind: 'busy' | 'error'; text: string } | null>(null);
	/** A booking the store confirmed from this card, for the receipt under it. */
	receipt = $state<{ booking: Booked; durationMin?: number; place?: string } | null>(null);
	/** A checkout the store opened from this card, for the pay card under it. */
	pay = $state.raw<Pay | null>(null);
	/** The Cart that opened it, so a cancelled payment can start a new checkout. */
	cart: unknown = null;
	readonly store: StreamSpecStore;
	#push!: ReadableStreamDefaultController<string>;
	#fed = '';
	#open = true;

	constructor() {
		const source = new ReadableStream<string>({ start: (c) => void (this.#push = c) });
		// throttleMs 0: streamSpec's throttle has no trailing parse, so a pause in
		// the stream would leave the card behind the text it has already received.
		// Every partial spec passes the card policy before <Ripple> renders it.
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

/** Where host events from a final card reach the store. Location defaults are read at call time. */
export interface StoreHost {
	storeUrl: string;
	fetch?: typeof fetch;
	pageOrigin?: string;
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
	/** A checkout or booking is on its way to the store. */
	#hostBusy = false;
	/** A card's message waiting for the answer in flight. */
	#queued: string | null = null;
	/** A card already sent a message in this task (one click). */
	#said = false;

	constructor(
		private readonly transport: Transport,
		private readonly fallback?: Transport,
		readonly store?: StoreHost
	) {}

	async send(message: string) {
		const text = message.trim();
		if (!text || this.busy) return;
		this.turns.push({ id: ++turnSeq, role: 'user', parts: [{ kind: 'text', text }], notice: null, pending: false });
		this.turns.push({ id: ++turnSeq, role: 'assistant', parts: [], notice: null, pending: true });
		await this.#run(this.turns[this.turns.length - 1], text, this.transport);
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
		const next = this.#queued;
		this.#queued = null;
		if (next) await this.send(next);
	}

	stop() {
		this.#queued = null;
		this.#abort?.abort();
	}

	/** The `onEvent` handler for a card's <Ripple>. Inert until the card is final. */
	hostEvent(card: Card, event: RippleEvent): Promise<void> | undefined {
		if (card.status !== 'final') return undefined;
		const name = event.type === 'emit' ? (event.name ?? event.target) : undefined;
		if (name === 'ask') {
			const p = event.payload;
			if (isRecord(p) && typeof p.text === 'string' && p.text.length <= ASK_MAX) this.#say(p.text);
			return undefined;
		}
		if (this.store && name === 'checkout') return this.#checkout(card, this.store, event.payload);
		if (this.store && name === 'book') return this.#book(card, this.store, event.payload);
		const e: Record<string, unknown> = { ...event };
		const kind = str(e.action, str(e.type, 'event'));
		const detail = str(e.message) || str(e.event) || str(e.target) || str(e.url);
		card.sent = detail ? `${kind}: ${detail}` : kind;
		return undefined;
	}

	/** The `onComplete` for a card's <Ripple>: a finished flow's `chat` message goes out as the visitor's. */
	flowComplete(card: Card, result: TerminalResult) {
		const action = result.action;
		if (card.status !== 'final' || action?.kind !== 'chat' || typeof action.message !== 'string') return;
		this.#say(flowMessage(action.message, result.payload, card.spec?.ui));
	}

	/** Sends a card's message now, or after the answer in flight (the newest one waits). One per click. */
	#say(text: string) {
		if (this.#said || !text.trim()) return;
		this.#said = true;
		// ponytail: "one click" is one task; a handler list runs in microtasks, so a timer clears it.
		setTimeout(() => (this.#said = false));
		if (this.busy) this.#queued = text;
		else void this.send(text);
	}

	async #checkout(card: Card, store: StoreHost, cart: unknown) {
		if (this.#hostBusy) return void (card.note = { kind: 'error', text: 'Another order or booking is still on its way. Try again in a moment.' });
		this.#hostBusy = true;
		card.note = { kind: 'busy', text: 'Opening the store checkout...' };
		try {
			const result = await checkout(cart, { storeUrl: store.storeUrl, fetch: store.fetch, pageOrigin: store.pageOrigin ?? location.origin });
			if (result.ok) {
				card.pay = result.data;
				card.cart = cart;
				card.note = null;
			} else card.note = { kind: 'error', text: result.error.message };
		} finally {
			this.#hostBusy = false;
		}
	}

	/** After a cancelled payment: the same Cart through a new checkout. */
	retryCheckout(card: Card) {
		if (!this.store || card.cart == null) return undefined;
		return this.#checkout(card, this.store, card.cart);
	}

	async #book(card: Card, store: StoreHost, payload: unknown) {
		const request = toBookingRequest(payload);
		const asked = isRecord(payload) && typeof payload.service_id === 'string' ? payload.service_id : '';
		const serviceId = 'error' in request ? asked : request.service_id;
		const answer = (patch: Record<string, unknown>) => {
			const next = card.spec && patchBooking(card.spec, serviceId, patch);
			if (next) card.spec = next;
		};
		if ('error' in request) return answer({ notice: { kind: 'error', text: request.error } });
		if (this.#hostBusy) return answer({ notice: { kind: 'info', text: 'Another order or booking is still on its way. Try again in a moment.' } });
		this.#hostBusy = true;
		try {
			const deps = { storeUrl: store.storeUrl, fetch: store.fetch };
			const result = await book(request, deps);
			const props = bookingProps(card.spec, serviceId);
			if (result.ok) {
				const services = Array.isArray(props?.services) ? (props.services as { id?: unknown; duration_min?: unknown }[]) : [];
				const minutes = services.find((s) => s?.id === serviceId)?.duration_min;
				const place = [props?.subtitle, props?.title].find((v) => typeof v === 'string' && v.trim());
				card.receipt = { booking: result.booking, durationMin: typeof minutes === 'number' ? minutes : undefined, place: place as string | undefined };
				return answer({ confirmed: { ...result.booking } });
			}
			const days = result.reload && Array.isArray(props?.days) ? await reloadDays(props.days, serviceId, request.party, deps) : null;
			answer({ notice: { ...result.notice }, ...(days ? { days } : {}) });
		} finally {
			this.#hostBusy = false;
		}
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
				const card = new Card();
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
				st.cards.get(id)?.reject(`server:${str(d.reason, 'rejected')}`);
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
