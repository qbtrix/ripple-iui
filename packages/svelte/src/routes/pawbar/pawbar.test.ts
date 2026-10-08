// routes/pawbar/pawbar.test.ts — The landing chat's wire layer and store, no DOM rendering.
// parseSSE (chunk boundaries, CRLF, comments, malformed frames), the legacy
// fence splitter, the recorded-scenario re-cut, customer_ref storage, and the
// ChatSession turn model across both card paths and every failure event.

import { describe, expect, test, vi } from 'vitest';
import { parseSSE, segments, type SSEFrame } from './sse.js';
import { cardChunks, pickScenario, recordedEvents } from './recorded.js';
import { BYOK_URL, ChatSession, customerRef, pawbarTransport, type Card, type Transport } from './session.svelte.js';
import { scenarios } from '../live/scenarios.js';

const waitFor = <T>(fn: () => T | Promise<T>) => vi.waitFor(fn, { timeout: 5000 });
vi.setConfig({ testTimeout: 20_000 });

async function* from(...chunks: string[]) {
	for (const c of chunks) yield c;
}
async function collect<T>(it: AsyncIterable<T>): Promise<T[]> {
	const out: T[] = [];
	for await (const x of it) out.push(x);
	return out;
}
const sse = (frames: SSEFrame[]) => frames.map((f) => `event: ${f.event}\ndata: ${JSON.stringify(f.data)}\n\n`).join('');
const frames = (...f: SSEFrame[]): Transport => async function* () {
	for (const x of f) yield x;
};
const bill = scenarios.find((s) => s.id === 'bill-splitter')!;
const billSpec = JSON.parse(bill.fixture.chunks.map((c) => c.text).join(''));
const lastTurn = (s: ChatSession) => s.turns[s.turns.length - 1];
const cardOf = (s: ChatSession) => (lastTurn(s).parts.find((p) => p.kind === 'card') as { card: Card } | undefined)?.card;

describe('parseSSE', () => {
	const wire = sse([
		{ event: 'chunk', data: { content: 'Hi', type: 'text' } },
		{ event: 'card.start', data: { card_id: 'c1' } },
		{ event: 'stream_end', data: { assistant_message_id: 'm', cancelled: false } }
	]);

	test('yields the same frames however the bytes are split', async () => {
		const whole = await collect(parseSSE(from(wire)));
		expect(whole.map((f) => f.event)).toEqual(['chunk', 'card.start', 'stream_end']);
		expect(await collect(parseSSE(from(...wire.split(''))))).toEqual(whole);
	});

	test('tolerates CRLF, comments, multi-line data and field lines without a colon', async () => {
		const text = ': keepalive\r\nevent: chunk\r\nbogus line\r\ndata: {"content":\r\ndata: "x"}\r\n\r\n';
		expect(await collect(parseSSE(from(text)))).toEqual([{ event: 'chunk', data: { content: 'x' } }]);
	});

	test('drops a malformed frame and keeps going; discards an unterminated last frame', async () => {
		const text = 'event: chunk\ndata: {not json\n\nevent: chunk\ndata: {"content":"ok"}\n\nevent: chunk\ndata: {"content":"cut"}';
		expect(await collect(parseSSE(from(text)))).toEqual([{ event: 'chunk', data: { content: 'ok' } }]);
	});
});

describe('segments (legacy fence)', () => {
	const full = 'Here you go.\n\n```pawbar-card\n{"ui":{"type":"text"}}\n```\n\nDone.';

	test('splits text, card, text', () => {
		expect(segments(full, true)).toEqual([
			{ kind: 'text', text: 'Here you go.\n\n' },
			{ kind: 'card', text: '{"ui":{"type":"text"}}', closed: true },
			{ kind: 'text', text: '\n\nDone.' }
		]);
	});

	test('never shows a half-arrived fence, and card text only grows', () => {
		let body = '';
		for (let i = 1; i <= full.length; i++) {
			const segs = segments(full.slice(0, i));
			for (const s of segs) if (s.kind === 'text') expect(s.text).not.toMatch(/`/);
			const card = segs.find((s) => s.kind === 'card');
			if (card) {
				expect(card.text.startsWith(body)).toBe(true);
				body = card.text;
			}
		}
		expect(body).toBe('{"ui":{"type":"text"}}');
	});
});

describe('recorded scenarios', () => {
	test('cardChunks re-cuts a fixture to {state,ui} without the version', () => {
		for (const s of scenarios) {
			const card = JSON.parse(cardChunks(s.fixture).map((c) => c.text).join(''));
			const { version: _v, ...rest } = JSON.parse(s.fixture.chunks.map((c) => c.text).join(''));
			expect(card).toEqual(rest);
		}
	});

	test('pickScenario matches by keywords and defaults to the bill splitter', () => {
		expect(pickScenario('plan my trip to Tokyo').id).toBe('tokyo-trip');
		expect(pickScenario('spanish flashcards please').id).toBe('flashcards');
		expect(pickScenario('hello there').id).toBe('bill-splitter');
	});
});

describe('customerRef', () => {
	const memStorage = () => {
		const m = new Map<string, string>();
		return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) } as Storage;
	};

	test('generates a contract-valid id, stores it and reuses it', () => {
		const s = memStorage();
		const ref = customerRef(() => s);
		expect(ref).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
		expect(s.getItem('ripple.pawbar.customer_ref')).toBe(ref);
		expect(customerRef(() => s)).toBe(ref);
	});

	test('falls back to a stable in-memory id when storage throws', () => {
		const broken = () => {
			throw new Error('SecurityError');
		};
		const a = customerRef(broken);
		expect(a).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
		expect(customerRef(broken)).toBe(a);
	});
});

describe('ChatSession', () => {
	test('native card events interleave with text, stream progressively, then go final', async () => {
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		const session = new ChatSession(async function* () {
			yield { event: 'chunk', data: { content: 'Before. ', type: 'text' } };
			yield { event: 'card.start', data: { card_id: 'c1' } };
			yield { event: 'card.delta', data: { card_id: 'c1', text: ' {"state":{"n":1},' } };
			yield { event: 'card.delta', data: { card_id: 'c1', text: '"ui":{"type":"text","props":{"text":"hi"' } };
			await gate;
			yield { event: 'card.final', data: { card_id: 'c1', card: { state: { n: 1 }, ui: { type: 'text', props: { text: 'hi' } } } } };
			yield { event: 'chunk', data: { content: 'After.', type: 'text' } };
			yield { event: 'stream_end', data: { assistant_message_id: 'm1', cancelled: false } };
		});
		const sent = session.send('hello');
		// Progressive: the half-sent card already parses, with the version spliced in.
		await waitFor(() => expect(cardOf(session)?.store.current).toMatchObject({ version: '1.0', state: { n: 1 } }));
		expect(cardOf(session)?.status).toBe('streaming');
		release();
		await sent;
		const turn = lastTurn(session);
		expect(turn.parts.map((p) => p.kind)).toEqual(['text', 'card', 'text']);
		expect(cardOf(session)?.status).toBe('final');
		expect(cardOf(session)?.spec).toEqual({ version: '1.0', state: { n: 1 }, ui: { type: 'text', props: { text: 'hi' } } });
		expect(turn.pending).toBe(false);
		expect(turn.notice).toBeNull();
	});

	test('the legacy fence in chunk text becomes the same final card', async () => {
		const session = new ChatSession((_m, signal) => recordedEvents(bill, { mode: 'legacy', speed: Infinity, signal }));
		await session.send('legacy');
		const turn = lastTurn(session);
		expect(turn.parts.map((p) => p.kind)).toEqual(['text', 'card', 'text']);
		expect(cardOf(session)?.spec).toEqual(billSpec);
		for (const p of turn.parts) if (p.kind === 'text') expect(p.text).not.toMatch(/```/);
	});

	test('the recorded native path ends in a final card equal to the fixture', async () => {
		const session = new ChatSession((m, signal) => recordedEvents(pickScenario(m), { speed: Infinity, signal }));
		await session.send(bill.fixture.prompt);
		expect(cardOf(session)?.spec).toEqual(billSpec);
	});

	test('card.rejected removes the card with its reason; a cut-off stream marks it truncated', async () => {
		const rejected = new ChatSession((_m, signal) => recordedEvents(bill, { mode: 'reject', speed: Infinity, signal }));
		await rejected.send('x');
		expect(cardOf(rejected)?.status).toBe('rejected');
		expect(cardOf(rejected)?.reason).toBe('invalid_widget');

		const cut = new ChatSession(
			frames({ event: 'card.start', data: { card_id: 'c' } }, { event: 'card.delta', data: { card_id: 'c', text: '{"ui":{' } })
		);
		await cut.send('x');
		expect(cardOf(cut)?.reason).toBe('truncated');
		const server = new ChatSession((_m, signal) => recordedEvents(bill, { mode: 'truncate', speed: Infinity, signal }));
		await server.send('x');
		expect(cardOf(server)?.reason).toBe('truncated');
	});

	test('unavailable, error and interrupted end the turn with a calm notice', async () => {
		const limit = new ChatSession(frames({ event: 'unavailable', data: { type: 'unavailable', reason: 'limit' } }));
		await limit.send('x');
		expect(lastTurn(limit).notice).toMatchObject({ kind: 'limit', link: { href: BYOK_URL } });
		const busy = new ChatSession(frames({ event: 'unavailable', data: { type: 'unavailable', reason: 'temporary' } }));
		await busy.send('x');
		expect(lastTurn(busy).notice?.kind).toBe('busy');
		const err = new ChatSession(frames({ event: 'error', data: {} }, { event: 'chunk', data: { content: 'never' } }));
		await err.send('x');
		expect(lastTurn(err).notice?.kind).toBe('error');
		expect(lastTurn(err).parts).toEqual([]);
		const cut = new ChatSession(frames({ event: 'interrupted', data: {} }));
		await cut.send('x');
		expect(lastTurn(cut).notice?.kind).toBe('stopped');
	});

	test('host events are inert until card.final; local state is not gated', async () => {
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		const session = new ChatSession(async function* () {
			yield { event: 'card.start', data: { card_id: 'c' } };
			yield { event: 'card.delta', data: { card_id: 'c', text: '{"ui":{"type":"button"}}' } };
			await gate;
			yield { event: 'card.final', data: { card_id: 'c', card: { ui: { type: 'button' } } } };
		});
		const sent = session.send('x');
		await waitFor(() => expect(cardOf(session)).toBeDefined());
		const card = cardOf(session)!;
		session.hostEvent(card, { type: 'emit', action: 'emit', target: 'early' } as never);
		expect(card.sent).toBeNull();
		release();
		await sent;
		session.hostEvent(card, { type: 'emit', action: 'emit', target: 'picked' } as never);
		expect(card.sent).toBe('emit: picked');
	});

	test('pawbarTransport posts the contract body and reads the SSE reply', async () => {
		const fetch = vi.fn(async () =>
			new Response(sse([{ event: 'chunk', data: { content: 'Hello', type: 'text' } }, { event: 'stream_end', data: { cancelled: false } }]), {
				headers: { 'content-type': 'text/event-stream' }
			})
		);
		const t = pawbarTransport({ endpoint: 'http://localhost:5288/', widgetId: 'w', siteKey: 'k', fetch, ref: () => 'visitor_123' });
		const session = new ChatSession(t.send);
		await session.send('  hi  ');
		const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
		expect(url).toBe('http://localhost:5288/api/v1/paw-bar/chat');
		expect(init.credentials).toBe('omit');
		expect(JSON.parse(init.body as string)).toEqual({ widget_id: 'w', signed_key: 'k', customer_ref: 'visitor_123', message: 'hi' });
		expect(lastTurn(session).parts).toEqual([{ kind: 'text', text: 'Hello' }]);
	});

	test.each([
		[429, { detail: 'Rate limit exceeded' }, 'busy'],
		[401, { detail: 'invalid_site_key' }, 'error'],
		[403, { detail: 'origin_not_allowed' }, 'error'],
		[400, { detail: 'message_rejected' }, 'error']
	])('HTTP %i becomes a %s notice, not a crash', async (status, body, kind) => {
		const fetch = vi.fn(async () => new Response(JSON.stringify(body), { status }));
		const session = new ChatSession(pawbarTransport({ endpoint: 'http://x', widgetId: 'w', siteKey: 'k', fetch, ref: () => 'visitor_123' }).send);
		await session.send('hi');
		expect(lastTurn(session).notice?.kind).toBe(kind);
		expect(session.busy).toBe(false);
	});
});

// Engine gap (not fixed here, no engine changes in this PR): streamSpec's
// throttle drops a parse inside the window and never schedules a trailing one,
// so when the stream pauses, `current` lags the text already received until
// the next chunk or the end. Card works around it with throttleMs 0.
test.fails('streamSpec parses the received tail during a pause (throttle has no trailing parse)', async () => {
	const { streamSpec } = await import('$lib/streaming/index.js');
	let push!: ReadableStreamDefaultController<string>;
	const store = streamSpec(new ReadableStream<string>({ start: (c) => void (push = c) }), { throttleMs: 40 });
	push.enqueue('{"version":"1.0","state":{"a":1}');
	push.enqueue(',"ui":{"type":"text"}}');
	await waitFor(() => expect(store.current).toMatchObject({ ui: { type: 'text' } }));
});
