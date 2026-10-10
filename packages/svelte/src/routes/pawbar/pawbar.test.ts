// routes/pawbar/pawbar.test.ts — The landing chat's wire layer and store, no DOM rendering.
// parseSSE (chunk boundaries, CRLF, comments, malformed frames), the legacy
// fence splitter, the recorded-scenario re-cut, customer_ref storage, the
// ChatSession turn model across both card paths and every failure event, and the
// messages a card sends (ask, a finished flow). A card fence the model abandons
// and restarts (fixtures/restart-fence-*.json, real replies) never leaks as text.

import { describe, expect, test, vi } from 'vitest';
import type { RippleEvent, TerminalResult } from '$lib/index.js';
import { hideSpecText, parseSSE, segments, type SSEFrame } from './sse.js';
import { cardChunks, findScenario, pickScenario, recordedEvents, recordedExchange } from './recorded.js';
import { playScenarios } from './play-cards.js';
import {
	BYOK_URL,
	FLOW_MESSAGE_MAX,
	HANDOFF_MAX,
	PAWOS_URL,
	ChatHttpError,
	ChatSession,
	customerRef,
	flowMessage,
	pawbarTransport,
	pawosBase,
	pawosHandoffUrl,
	typedStaysLocal,
	type Transport
} from './session.svelte.js';
import { scenarios } from '../live/scenarios.js';
import { refuseCard, textRefusal } from './card-policy.js';
import { laptopFlowCard, tripFlowCard } from './flow-cards.js';
import heartReply from './fixtures/restart-fence-heart.json';
import mealReply from './fixtures/restart-fence-mealplan.json';

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
const cardsOf = (s: ChatSession) => lastTurn(s).parts.flatMap((p) => (p.kind === 'card' ? [p.card] : []));
const cardOf = (s: ChatSession) => cardsOf(s)[0];
const memStorage = () => {
	const m = new Map<string, string>();
	return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) };
};
const brokenStorage = () => {
	throw new Error('SecurityError');
};

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

	test('throws on a frame over 1 MB instead of buffering forever', async () => {
		await expect(collect(parseSSE(from('event: chunk\ndata: "', 'x'.repeat(600_000), 'x'.repeat(600_000))))).rejects.toThrow(/1 MB/);
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

describe('a restarted card fence (real replies)', () => {
	const leaked = (t: string) => /pawbar-card|```|\{"ui"/.test(t);
	const heartCard = (() => {
		const t = heartReply.text;
		const open = t.lastIndexOf('```pawbar-card\n') + '```pawbar-card\n'.length;
		return JSON.parse(t.slice(open, t.indexOf('\n```', open)));
	})();

	test('segments: no prefix shows fence text, card text only grows, and the restart is marked', () => {
		for (const { text } of [heartReply, mealReply]) {
			let prev: string[] = [];
			for (let i = 1; i <= text.length; i++) {
				const segs = segments(text.slice(0, i));
				for (const s of segs) if (s.kind === 'text') expect(leaked(s.text), `prefix ${i}`).toBe(false);
				const cards = segs.flatMap((s) => (s.kind === 'card' ? [s.text] : []));
				cards.forEach((c, j) => expect(c.startsWith(prev[j] ?? ''), `prefix ${i} card ${j}`).toBe(true));
				prev = cards;
			}
			const done = segments(text, true);
			expect(done.filter((s) => s.kind === 'card').map((s) => s.kind === 'card' && [s.closed, !!s.restarted])).toEqual([
				[false, true],
				[true, false]
			]);
			for (const s of done) if (s.kind === 'text') expect(leaked(s.text)).toBe(false);
		}
		const last = segments(heartReply.text, true).filter((s) => s.kind === 'card').pop();
		expect(last?.kind === 'card' && JSON.parse(last.text)).toEqual(heartCard);
	});

	test('only a bare ``` line closes a card fence', () => {
		const src = 'A\n```pawbar-card\n{"ui":{"type":"text"}}\n```js\n{"x":1}\n  ```  \nB';
		expect(segments(src, true)).toEqual([
			{ kind: 'text', text: 'A\n' },
			{ kind: 'card', text: '{"ui":{"type":"text"}}\n```js\n{"x":1}', closed: true },
			{ kind: 'text', text: '\nB' }
		]);
	});

	// Chunk cuts: fixed sizes, plus cuts inside the restart marker and the close.
	const cuts = (text: string) => {
		const second = text.lastIndexOf('```pawbar-card');
		const close = text.lastIndexOf('\n```');
		const at = (...ps: number[]) => {
			const out: string[] = [];
			let from = 0;
			for (const p of ps) (out.push(text.slice(from, p)), (from = p));
			out.push(text.slice(from));
			return out;
		};
		const sized = (n: number) => Array.from({ length: Math.ceil(text.length / n) }, (_, k) => text.slice(k * n, k * n + n));
		return [sized(3), sized(17), sized(256), sized(4096), [text], at(second + 2, second + 6, close + 3)];
	};

	async function play(text: string, chunks: string[]) {
		const seen: string[] = [];
		const session: ChatSession = new ChatSession(async function* () {
			for (const content of chunks) {
				yield { event: 'chunk', data: { content } };
				for (const p of lastTurn(session).parts) if (p.kind === 'text') seen.push(p.text);
			}
			yield { event: 'stream_end', data: { cancelled: false } };
		});
		await session.send('x');
		for (const p of lastTurn(session).parts) if (p.kind === 'text') seen.push(p.text);
		expect(chunks.join('')).toBe(text);
		expect(seen.filter(leaked)).toEqual([]);
		return session;
	}

	test('the heart reply: the abandoned card is dropped quietly and the second card renders', async () => {
		for (const chunks of cuts(heartReply.text)) {
			const session = await play(heartReply.text, chunks);
			const cards = cardsOf(session);
			expect(cards.map((c) => c.status)).toEqual(['final']);
			expect(cards[0].spec).toEqual({ version: '1.0', ...heartCard });
		}
	});

	test('the meal plan reply: nothing leaks; its broken second card is left out with the usual note', async () => {
		for (const chunks of cuts(mealReply.text)) {
			const session = await play(mealReply.text, chunks);
			expect(cardsOf(session).map((c) => [c.status, c.reason])).toEqual([['rejected', 'invalid']]);
		}
	});

	test('a server card.rejected "restarted" drops the partial card quietly; the new card renders', async () => {
		const session = new ChatSession(
			frames(
				{ event: 'chunk', data: { content: 'Here it is.' } },
				{ event: 'card.start', data: { card_id: 'a' } },
				{ event: 'card.delta', data: { card_id: 'a', text: '{"ui":{"type":"text","props":{"te' } },
				{ event: 'card.rejected', data: { card_id: 'a', reason: 'restarted' } },
				{ event: 'card.start', data: { card_id: 'b' } },
				{ event: 'card.delta', data: { card_id: 'b', text: '{"ui":{"type":"text","props":{"text":"ok"}}}' } },
				{ event: 'card.final', data: { card_id: 'b', card: { ui: { type: 'text', props: { text: 'ok' } } } } },
				{ event: 'chunk', data: { content: 'Done.' } },
				{ event: 'stream_end', data: { cancelled: false } }
			)
		);
		await session.send('x');
		expect(lastTurn(session).parts.map((p) => (p.kind === 'card' ? p.card.status : p.text))).toEqual(['Here it is.', 'final', 'Done.']);
	});

	test('hideSpecText hides a leaked spec from its marker line to the fence close, and a half-arrived marker while streaming', () => {
		const leak = 'Here is the plan.\n\npawbar-card\n{"ui":{"type":"text"}}\n```\n\nEnjoy.';
		const out = hideSpecText(leak, false);
		expect(out.hidden).toBe(true);
		expect(leaked(out.text)).toBe(false);
		expect(out.text).toContain('Here is the plan.');
		expect(out.text).toContain('Enjoy.');
		expect(hideSpecText('Hi\n  {"ui":{"type":"te', false)).toEqual({ text: 'Hi\n', hidden: true });
		expect(hideSpecText('Hi\npawbar-c', true).text).toBe('Hi\n');
		expect(hideSpecText('Hi\n{"u', true).text).toBe('Hi\n');
		expect(hideSpecText('Plain text, {"ui": inside a line} is fine.', false)).toEqual({ text: 'Plain text, {"ui": inside a line} is fine.', hidden: false });
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
		// findScenario says when the default was a fallback, so the intro can be honest.
		expect(findScenario('hello there')).toBeNull();
		expect(findScenario('plan my trip to Tokyo')?.id).toBe('tokyo-trip');
	});

	// The mock (scripts/mock-pawbar.ts) and the offline landing answer with pickScenario
	// once no earlier route claims the message; these prompts must reach their own card.
	test.each([
		['Make me a memory match game pairing Spanish animal words with their emoji', 'memory-match'],
		['Make me a 5-letter word guessing game about space, with a hint', 'word-guess'],
		['Quiz me with 6 space trivia questions, and explain each answer', 'space-trivia'],
		["Let's play tic-tac-toe against you, I'm X, medium difficulty", 'tic-tac-toe'],
		['Play connect four against me, best of 3', 'connect-four'],
		['Track my habits this week: reading, running, water and sleep, each with a weekly target', 'habit-tracker'],
		['Make me a pomodoro focus timer: 25 minutes focus, 5 minute breaks, 4 rounds, goal of 6 today', 'focus-timer'],
		['How does the heart pump blood? Draw an animated picture with numbered notes on the chambers and valves.', 'heart']
	])('the chip "%s" routes to %s, past the mock\'s earlier routes', (prompt, id) => {
		expect(pickScenario(prompt).id).toBe(id);
		expect(playScenarios.find((s) => s.id === id)!.fixture.prompt).toBe(prompt);
		// modeOf, storeCardKind and inlineCard in mock-pawbar.ts run first.
		expect(prompt).not.toMatch(/\b(429|limit|busy|legacy|unsafe|book|table|order|burgers?|laptops?|trip|bike|bicycle)\b|reject|truncat|reserv/i);
	});
});

describe('customerRef', () => {
	test('generates a contract-valid id, stores it and reuses it', () => {
		const s = memStorage();
		const ref = customerRef(() => s);
		expect(ref).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
		expect(s.getItem('ripple.pawbar.customer_ref')).toBe(ref);
		expect(customerRef(() => s)).toBe(ref);
	});

	test('falls back to a stable in-memory id when storage throws', () => {
		const a = customerRef(brokenStorage);
		expect(a).toMatch(/^[A-Za-z0-9_-]{8,128}$/);
		expect(customerRef(brokenStorage)).toBe(a);
	});
});

const recorded: Transport = (m, signal) => recordedEvents(pickScenario(m), { speed: Infinity, signal });
const failing = (err: unknown): Transport =>
	async function* () {
		yield* [];
		throw err;
	};

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
		expect(cardOf(rejected)?.reason).toBe('server:invalid_widget');

		const cut = new ChatSession(
			frames({ event: 'card.start', data: { card_id: 'c' } }, { event: 'card.delta', data: { card_id: 'c', text: '{"ui":{' } })
		);
		await cut.send('x');
		expect(cardOf(cut)?.reason).toBe('truncated');
		const server = new ChatSession((_m, signal) => recordedEvents(bill, { mode: 'truncate', speed: Infinity, signal }));
		await server.send('x');
		expect(cardOf(server)?.reason).toBe('server:truncated');
	});

	test('an unavailable live answer offers the recorded one and plays it in the same turn', async () => {
		const busy = new ChatSession(failing(new ChatHttpError(429, '')), recorded);
		await busy.send('split the bill between four of us');
		const turn = lastTurn(busy);
		expect(turn.notice).toMatchObject({ kind: 'busy', replay: true });
		await busy.replayRecorded(turn.id);
		expect(busy.turns).toHaveLength(2);
		expect(lastTurn(busy).notice).toBeNull();
		expect(lastTurn(busy).parts.some((p) => p.kind === 'card' && p.card.status === 'final')).toBe(true);
		await busy.replayRecorded(turn.id);
		expect(busy.turns).toHaveLength(2);

		const limit = new ChatSession(frames({ event: 'unavailable', data: { type: 'unavailable', reason: 'limit' } }), recorded);
		await limit.send('x');
		expect(lastTurn(limit).notice).toMatchObject({ kind: 'limit', replay: true });
		const offline = new ChatSession(failing(new TypeError('fetch failed')), recorded);
		await offline.send('x');
		expect(lastTurn(offline).notice).toMatchObject({ kind: 'error', replay: true });

		const rejected = new ChatSession(failing(new ChatHttpError(400, 'message_rejected')), recorded);
		await rejected.send('x');
		expect(lastTurn(rejected).notice?.replay).toBeUndefined();
		const noFallback = new ChatSession(failing(new ChatHttpError(429, '')));
		await noFallback.send('x');
		expect(lastTurn(noFallback).notice?.replay).toBeUndefined();
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
		const card = cardOf(session);
		const early: RippleEvent = { type: 'emit', target: 'early' };
		void session.hostEvent(card, early);
		expect(card.sent).toBeNull();
		release();
		await sent;
		const picked: RippleEvent = { type: 'emit', target: 'picked' };
		void session.hostEvent(card, picked);
		expect(card.sent).toBe('emit: picked');
	});

	test('the card policy refuses an unsafe card mid-stream and at final, like card.rejected', async () => {
		const streamed = new ChatSession(
			frames(
				{ event: 'card.start', data: { card_id: 'c' } },
				{ event: 'card.delta', data: { card_id: 'c', text: '{"ui":{"type":"link","props":{"href":"javascript:alert(1)"}' } },
				{ event: 'card.delta', data: { card_id: 'c', text: '}}' } }
			)
		);
		await streamed.send('x');
		await waitFor(() => expect(cardOf(streamed)?.status).toBe('rejected'));
		expect(cardOf(streamed)?.reason).toMatch(/^unsafe_url/);

		const final = new ChatSession(
			frames(
				{ event: 'card.start', data: { card_id: 'c' } },
				{ event: 'card.final', data: { card_id: 'c', card: { ui: { type: 'button', on_click: { action: 'api', url: '/buy' } } } } }
			)
		);
		await final.send('x');
		expect(cardOf(final)?.reason).toBe('action:api');

		const legacy = new ChatSession(
			frames({ event: 'chunk', data: { content: 'Hi\n```pawbar-card\n{"ui":{"type":"embed"}}\n```\nBye' } })
		);
		await legacy.send('x');
		expect(cardOf(legacy)?.reason).toBe('widget:embed');

		const burger = scenarios.find((s) => s.needsStore)!;
		const store = new ChatSession((_m, signal) => recordedEvents(burger, { speed: Infinity, signal }));
		await store.send('order a burger');
		expect(cardOf(store)?.status).toBe('rejected');
	});

	test('a repeated card_id closes the first card; an empty card_id still works; keys stay unique', async () => {
		const session = new ChatSession(
			frames(
				{ event: 'card.start', data: { card_id: 'c' } },
				{ event: 'card.delta', data: { card_id: 'c', text: '{"ui":' } },
				{ event: 'card.start', data: { card_id: 'c' } },
				{ event: 'card.final', data: { card_id: 'c', card: { ui: { type: 'text' } } } },
				{ event: 'card.start', data: { card_id: '' } },
				{ event: 'card.final', data: { card_id: '', card: { ui: { type: 'badge' } } } }
			)
		);
		await session.send('x');
		const cards = cardsOf(session);
		expect(cards.map((c) => c.status)).toEqual(['rejected', 'final', 'final']);
		expect(cards[0].reason).toBe('truncated');
		expect(new Set(cards.map((c) => c.id)).size).toBe(3);
	});

	test('card.start while a legacy fence is still open rejects the fence card cleanly', async () => {
		const session = new ChatSession(
			frames(
				{ event: 'chunk', data: { content: 'Hi\n```pawbar-card\n{"ui":{"type":"te' } },
				{ event: 'card.start', data: { card_id: 'n' } },
				{ event: 'card.final', data: { card_id: 'n', card: { ui: { type: 'text' } } } }
			)
		);
		await session.send('x');
		expect(cardsOf(session).map((c) => [c.status, c.reason])).toEqual([
			['rejected', 'truncated'],
			['final', null]
		]);
	});

	test('host events from a final card never touch the network or navigate', async () => {
		const fetchSpy = vi.fn();
		vi.stubGlobal('fetch', fetchSpy);
		const href = location.href;
		const session = new ChatSession(
			frames(
				{ event: 'card.start', data: { card_id: 'c' } },
				{ event: 'card.final', data: { card_id: 'c', card: { ui: { type: 'button' } } } }
			)
		);
		await session.send('x');
		const card = cardOf(session);
		for (const type of ['emit', 'api', 'navigate', 'toast', 'run_source'] as const)
			expect(session.hostEvent(card, { type, url: 'https://evil.example', target: '/away' })).toBeUndefined();
		expect(fetchSpy).not.toHaveBeenCalled();
		expect(location.href).toBe(href);
		vi.unstubAllGlobals();
	});

	test('pawbarTransport posts the contract body and reads the SSE reply', async () => {
		const fetch = vi.fn<typeof globalThis.fetch>(async () =>
			new Response(sse([{ event: 'chunk', data: { content: 'Hello', type: 'text' } }, { event: 'stream_end', data: { cancelled: false } }]), {
				headers: { 'content-type': 'text/event-stream' }
			})
		);
		const t = pawbarTransport({ endpoint: 'http://localhost:5288/', widgetId: 'w', siteKey: 'k', fetch, ref: () => 'visitor_123' });
		const session = new ChatSession(t.send);
		await session.send('  hi  ');
		const [url, init] = fetch.mock.calls[0];
		expect(url).toBe('http://localhost:5288/api/v1/paw-bar/chat');
		expect(init?.credentials).toBe('omit');
		expect(JSON.parse(typeof init?.body === 'string' ? init.body : '')).toEqual({ widget_id: 'w', signed_key: 'k', customer_ref: 'visitor_123', message: 'hi' });
		expect(lastTurn(session).parts).toEqual([{ kind: 'text', text: 'Hello' }]);
	});

	test.each([
		[429, { detail: 'Rate limit exceeded' }, 'busy'],
		[401, { detail: 'invalid_site_key' }, 'error'],
		[403, { detail: 'origin_not_allowed' }, 'error'],
		[400, { detail: 'message_rejected' }, 'error']
	])('HTTP %i becomes a %s notice, not a crash', async (status, body, kind) => {
		const fetch = vi.fn<typeof globalThis.fetch>(async () => new Response(JSON.stringify(body), { status }));
		const session = new ChatSession(pawbarTransport({ endpoint: 'http://x', widgetId: 'w', siteKey: 'k', fetch, ref: () => 'visitor_123' }).send);
		await session.send('hi');
		expect(lastTurn(session).notice?.kind).toBe(kind);
		expect(session.busy).toBe(false);
	});
});


const asks = (s: ChatSession) => s.turns.filter((t) => t.role === 'user').map((t) => (t.parts[0]?.kind === 'text' ? t.parts[0].text : ''));
const ask = (text: unknown): RippleEvent => ({ type: 'emit', name: 'ask', target: 'ask', payload: { text } });
const chat = (message: string) => ({ action: { kind: 'chat' as const, message }, payload: { style_selection: { id: 'food', label: 'Food' }, style_formData: {}, details_formData: { city: 'Lisbon', days: 4 } } });

describe('messages a card sends', () => {
	/** A session whose first answer is one final card, and every later answer plain text. */
	async function withCard(gate?: Promise<void>) {
		const sent: string[] = [];
		const session = new ChatSession(async function* (message, signal) {
			sent.push(message);
			if (sent.length > 1) {
				await Promise.race([gate, new Promise((r) => signal.addEventListener('abort', r))]);
				yield { event: 'chunk', data: { content: `Answer to ${message.split('\n')[0]}` } };
				return;
			}
			yield { event: 'card.start', data: { card_id: 'c' } };
			yield { event: 'card.final', data: { card_id: 'c', card: { ui: { type: 'button' } } } };
		});
		await session.send('first');
		return { session, sent, card: cardOf(session) };
	}

	test('flowMessage names each answer by its step title or field label, in plain sentences', () => {
		const trip = {
			trip_style_selection: { id: 'food', label: 'Food' },
			trip_style_formData: {},
			trip_details_formData: { city: 'Lisbon', days: 3, budget: 1500 }
		};
		expect(flowMessage('Plan a trip for me with these answers (budget in US dollars).', trip, tripFlowCard.ui)).toBe(
			'Plan a trip for me with these answers (budget in US dollars). What kind of trip? Food. City: Lisbon. Days: 3. Budget: 1500.'
		);
		const laptop = {
			main_use_selection: { id: 'work', label: 'Work and study' },
			budget_selection: { id: 'mid', label: '$800 to $1,500' },
			weight_matters_selection: { id: 'yes', label: 'Yes, I carry it daily' }
		};
		expect(flowMessage('Recommend a laptop for me from these answers.', laptop, laptopFlowCard.ui)).toBe(
			'Recommend a laptop for me from these answers. What will you use it for most? Work and study. What is your budget? $800 to $1,500. Does weight matter? Yes, I carry it daily.'
		);
		// No card to read names from: the payload keys, humanized; lists joined; blanks dropped.
		expect(flowMessage('Pick one', { use_selection: 'gaming', tags_formData: { picks: ['a', { label: 'B' }], blank: '  ', none: null } })).toBe('Pick one. Use: gaming. Picks: a, B.');
	});

	test('flowMessage names bound-input answers from payload.state by the input label', () => {
		const root = {
			flowId: 'trip',
			title: 'Your trip',
			ui: { type: 'flex', children: [
				{ type: 'number-input', props: { label: 'How many days?' }, bind: '{state.days}' },
				{ type: 'input', props: { label: 'City' }, bind: '{state.trip.city}' }
			] }
		};
		expect(flowMessage('Plan a trip for me.', { state: { days: 4, 'trip.city': 'Porto', 'other.note': 'quiet' } }, root)).toBe(
			'Plan a trip for me. How many days? 4. City: Porto. Note: quiet.'
		);
	});

	test('flowMessage keeps only plain text: no markup, no links, one line, whole sentences under the cap', () => {
		const typed = { details_formData: { city: 'Lisbon\n\nDays:  9', site: 'https://evil.example', note: '<img src=x onerror=alert(1)>', md: '![](http://x/a.png)', ok: 'Window seat' } };
		const message = flowMessage('Plan it.', typed);
		expect(message).toBe('Plan it. City: Lisbon Days: 9. Ok: Window seat.');
		expect(textRefusal(message)).toBeNull();
		const many = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`f${i}`, 'y'.repeat(5000)]));
		const long = flowMessage('x', { long_formData: many });
		expect(long.length).toBeLessThan(FLOW_MESSAGE_MAX);
		expect(long).toBe(`x. F0: ${'y'.repeat(200)}. F1: ${'y'.repeat(200)}.`);
		// The flow cards it reads names from are ones the policy accepts.
		expect(refuseCard(tripFlowCard)).toBeNull();
	});

	test("a final card's ask is sent as the visitor's next message", async () => {
		const { session, sent, card } = await withCard();
		void session.hostEvent(card, ask('Tell me about the weekend menu.'));
		await waitFor(() => expect(sent).toEqual(['first', 'Tell me about the weekend menu.']));
		expect(asks(session)).toEqual(['first', 'Tell me about the weekend menu.']);
		expect(card.sent).toBeNull();
	});

	test('a finished flow sends its chat message with the answers; other kinds are ignored', async () => {
		const { session, sent, card } = await withCard();
		const others: TerminalResult['action'][] = [{ kind: 'navigate', url: '/x' }, { kind: 'emit', event: 'checkout' }, { kind: 'invoke_tool', tool: 't' }, undefined];
		for (const action of others) session.flowComplete(card, { action, payload: {} });
		expect(sent).toEqual(['first']);
		session.flowComplete(card, chat('Plan a trip for me.'));
		await waitFor(() => expect(sent).toHaveLength(2));
		expect(sent[1]).toBe('Plan a trip for me. Style: Food. City: Lisbon. Days: 4.');
		expect(asks(session)[1]).toBe(sent[1]);
	});

	test('inert until final; a malformed ask is ignored', async () => {
		const { session, sent, card } = await withCard();
		const streaming = new ChatSession(frames({ event: 'card.start', data: { card_id: 'c' } }, { event: 'card.delta', data: { card_id: 'c', text: '{"ui":' } }));
		await streaming.send('x');
		const open = cardOf(streaming);
		open.status = 'streaming';
		void streaming.hostEvent(open, ask('hi'));
		streaming.flowComplete(open, chat('hi'));
		for (const text of [42, '', '   ', 'x'.repeat(501)]) void session.hostEvent(card, ask(text));
		void session.hostEvent(card, { type: 'emit', name: 'ask', payload: 'hi' });
		await new Promise((r) => setTimeout(r, 20));
		expect(sent).toEqual(['first']);
		expect(asks(streaming)).toEqual(['x']);
	});

	test('one send per click: a handler list that asks twice sends the first', async () => {
		const { session, sent, card } = await withCard();
		void session.hostEvent(card, ask('one'));
		void session.hostEvent(card, ask('two'));
		await new Promise((r) => setTimeout(r, 20));
		expect(sent).toEqual(['first', 'one']);
		// A later click sends again.
		void session.hostEvent(card, ask('three'));
		await waitFor(() => expect(sent).toEqual(['first', 'one', 'three']));
	});

	test('while an answer is in flight, the newest card message waits and goes after it; Stop drops it', async () => {
		let release!: () => void;
		const gate = new Promise<void>((r) => (release = r));
		const { session, sent, card } = await withCard(gate);
		void session.send('second');
		await waitFor(() => expect(session.busy).toBe(true));
		session.flowComplete(card, chat('Plan a trip for me.'));
		await new Promise((r) => setTimeout(r, 5));
		void session.hostEvent(card, ask('Newest wins'));
		await new Promise((r) => setTimeout(r, 5));
		expect(sent).toEqual(['first', 'second']);
		release();
		await waitFor(() => expect(sent).toEqual(['first', 'second', 'Newest wins']));
		await waitFor(() => expect(session.busy).toBe(false));

		const stopped = await withCard(new Promise(() => {}));
		void stopped.session.send('slow');
		await waitFor(() => expect(stopped.session.busy).toBe(true));
		void stopped.session.hostEvent(stopped.card, ask('queued'));
		stopped.session.stop();
		await waitFor(() => expect(stopped.session.busy).toBe(false));
		await new Promise((r) => setTimeout(r, 20));
		expect(stopped.sent).toEqual(['first', 'slow']);
	});
});

describe('Paw OS handoff config', () => {
	test('typed text stays local only for a localhost endpoint with PUBLIC_TYPED_LOCAL=1', () => {
		expect(typedStaysLocal('http://localhost:5288', '1')).toBe(true);
		expect(typedStaysLocal('http://127.0.0.1:5288', '1')).toBe(true);
		expect(typedStaysLocal('http://localhost:5288', '')).toBe(false);
		expect(typedStaysLocal('https://api.pocketpaw.xyz', '1')).toBe(false);
		expect(typedStaysLocal('', '1')).toBe(false);
	});

	test('the Paw OS base is https, or http on localhost; anything else falls back', () => {
		expect(pawosBase('https://os.example.test/')).toBe('https://os.example.test');
		expect(pawosBase('http://localhost:5173')).toBe('http://localhost:5173');
		expect(pawosBase('http://os.example.test')).toBe(PAWOS_URL);
		expect(pawosBase('javascript:alert(1)')).toBe(PAWOS_URL);
		expect(pawosBase('')).toBe(PAWOS_URL);
	});

	test('the prompt rides in the fragment, trimmed to HANDOFF_MAX', () => {
		const { url, trimmed } = pawosHandoffUrl(`  ${'x'.repeat(HANDOFF_MAX + 10)}  `);
		const u = new URL(url);
		expect(u.search).toBe('?ref=ripple');
		expect(decodeURIComponent(u.hash.slice('#prompt='.length))).toHaveLength(HANDOFF_MAX);
		expect(trimmed).toBe(true);
		expect(pawosHandoffUrl('short').trimmed).toBe(false);
	});
});

describe('ChatSession.seed', () => {
	test('folds a recorded exchange in synchronously: a final card with its title and text', () => {
		const session = new ChatSession(frames());
		session.seed(bill.fixture.prompt, recordedExchange(bill, 'Replaying a recorded answer that matches.'));
		expect(session.turns.map((t) => [t.role, t.pending])).toEqual([
			['user', false],
			['assistant', false]
		]);
		expect(session.busy).toBe(false);
		const card = cardOf(session);
		expect(card.status).toBe('final');
		expect(card.title).toBe(bill.title);
		expect(JSON.parse(card.text)).toEqual({ state: billSpec.state, ui: billSpec.ui });
		expect(lastTurn(session).parts.map((p) => p.kind)).toEqual(['text', 'card', 'text']);
	});
});
