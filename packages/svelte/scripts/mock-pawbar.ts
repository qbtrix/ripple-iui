// scripts/mock-pawbar.ts — A local stand-in for the Paw Bar chat API, for the landing.
// `bun run dev:mock` serves POST /api/v1/paw-bar/chat on port 5288 (MOCK_PAWBAR_PORT)
// with the real request/response contract: it answers with the recorded /live
// scenario that best matches the message, streamed as SSE (intro chunk,
// card.start, card.delta on the recording's timing, card.final, closing chunk,
// stream_end). Failure paths, picked by a keyword in the message, `?mode=`, or
// MOCK_PAWBAR_MODE: `429` (HTTP 429), `limit` (unavailable/limit), `busy`
// (unavailable/temporary), `reject` (card.rejected), `truncate` (card cut off,
// card.rejected "truncated"), `legacy` (the whole card as a fence in chunk text),
// `unsafe` (streams a hostile card: an expression-built javascript: href, an
// iframe alias, a markdown http image; the client must refuse it mid-stream,
// before the server's card.rejected arrives 4 s later). GET /beacon logs a hit,
// so a fetched beacon shows up in this server's output.
// MOCK_PAWBAR_SPEED / `?speed=` scales the replay (default 2). CORS: localhost only.
// Store cards: "order" / "burger" answers with a `menu-order` card and "book" /
// "table" with a `booking` card, built the way pocketpaw's hydration will build
// them from the test store (MOCK_STORE_URL, default
// http://localhost:3917/test-store): /api/menu (product ids, prices, option
// groups, photos; `checkout: true`) or /api/booking/services and
// /api/booking/slots for the next 7 days in the store's timezone. The model's
// parts (`featured`, `preferred`, `party`) are made up here, and the handler is
// one `emit` to the host event (`checkout`, `book`). Photos that are not https
// are dropped (the card policy refuses them), so a local store's own images
// fall back to the widget's icon.
// Flow cards (routes/pawbar/flow-cards.ts): "trip" + "step by step" answers with
// the trip flow, "laptop" + "questions" with the laptop flow; the flows' own
// follow-ups land on the Tokyo itinerary recording and, for "laptop", an inline
// comparison-layout card with a winner. "bike" (or "bicycle") + "gears" answers with
// an animated `illustration` of the chain drive and a short text (gearsCard).
// The play chips (memory match, guess the word, space trivia, habit tracker, how a
// heart pumps) fall through to pickScenario, which answers them with their
// hand-written cards (routes/pawbar/play-cards.ts) streamed like a recording.
// Point the site at it: PUBLIC_PAWBAR_ENDPOINT=http://localhost:5288
// PUBLIC_PAWBAR_WIDGET_ID=demo PUBLIC_PAWBAR_SITE_KEY=demo bun run dev

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pickScenario, recordedEvents, type RecordedMode } from '../src/routes/pawbar/recorded.ts';
import { gearsCard, laptopAnswerCard, laptopFlowCard, tripFlowCard } from '../src/routes/pawbar/flow-cards.ts';

const PORT = Number(process.env.MOCK_PAWBAR_PORT ?? 5288);
const STORE = (process.env.MOCK_STORE_URL ?? 'http://localhost:3917/test-store').replace(/\/$/, '');
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const REF = /^[A-Za-z0-9_-]{8,128}$/;
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));
const UNSAFE_CARD = JSON.stringify({
	ui: {
		type: 'flex',
		props: { direction: 'column', gap: '8px' },
		children: [
			{ type: 'cta', props: { title: 'Claim your reward', label: 'Claim', href: "{'java'+'script:document.title=`XSS-`+document.domain'}" } },
			{ type: 'iframe', props: { srcdoc: "<script>parent.document.title='XSS-frame'</script>" } },
			{ type: 'markdown', props: { content: `![](http://localhost:${PORT}/beacon?from=markdown)` } }
		]
	}
});

async function store(path: string): Promise<Record<string, unknown>> {
	const res = await fetch(`${STORE}${path}`, { signal: AbortSignal.timeout(2000) });
	if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
	return (await res.json()) as Record<string, unknown>;
}

type StoreItem = { id: string; name: string; description?: string; price: string; image?: string; category?: string; categoryId?: string; tags?: string[]; available?: boolean; optionGroups?: unknown[] };
const KIND: Record<string, string> = { appetizers: 'side', mains: 'main', pizza: 'main', burgers: 'main', drinks: 'drink', desserts: 'dessert' };

/** A `menu-order` card: the store fills the items; the "model" picks the burgers (or everything) and a featured one. */
async function menuCard(message: string) {
	const [menu, info] = await Promise.all([store('/api/menu'), store('/api/store')]);
	const all = ((menu.products ?? []) as StoreItem[]).filter((p) => p.available !== false);
	const burgers = /burger/i.test(message);
	const picked = burgers ? all.filter((p) => ['burgers', 'appetizers', 'drinks'].includes(p.categoryId ?? '')) : all;
	const items = picked.map((p) => ({
		product_id: p.id,
		name: p.name,
		description: p.description,
		price: Number(p.price),
		...(p.image?.startsWith('https://') ? { image: p.image } : {}),
		category: p.category,
		kind: KIND[p.categoryId ?? ''] ?? 'product',
		tags: p.tags ?? [],
		groups: p.optionGroups ?? []
	}));
	const s = (info.store ?? {}) as { name?: string; deliveryFee?: number; pickupTime?: string };
	const pick = items.find((i) => i.kind === 'main' && i.tags.includes('vegetarian')) ?? items[0];
	return {
		ui: {
			type: 'menu-order',
			props: {
				title: s.name ?? 'Tasty Bites',
				subtitle: s.pickupTime ? `Pickup in ${s.pickupTime}` : undefined,
				currency: 'USD',
				...(pick ? { featured: { id: pick.product_id, reason: 'A good first pick from this menu.' } } : {}),
				items,
				fulfilment: ['pickup', 'delivery'],
				fee: { delivery: s.deliveryFee ?? 0 },
				checkout: true
			},
			on_checkout: { action: 'emit', target: 'checkout' }
		}
	};
}

/** A `booking` card: services and the next 7 days of slots from the store; party and preferred time from the "model". */
async function bookingCard(message: string) {
	const [svc, info] = await Promise.all([store('/api/booking/services'), store('/api/store')]);
	const services = (svc.services ?? []) as { id: string; party?: { min: number; max: number } }[];
	const service = services[0];
	if (!service) throw new Error('the store offers no booking services');
	const s = (info.store ?? {}) as { name?: string; timezone?: string };
	const tz = s.timezone ?? 'UTC';
	const asked = Number(/\bfor (\d{1,2})\b/i.exec(message)?.[1]);
	const party = Math.min(Math.max(asked || 2, service.party?.min ?? 1), service.party?.max ?? 8);
	const today = Date.now();
	const dates = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(today + i * 86_400_000));
	const days = await Promise.all(
		dates.map(async (date) => {
			const d = await store(`/api/booking/slots?service=${encodeURIComponent(service.id)}&date=${date}&party=${party}`);
			return { date, date_label: d.date_label, slots: d.slots };
		})
	);
	return {
		ui: {
			type: 'booking',
			props: {
				subtitle: s.name ?? 'Tasty Bites',
				tz,
				services,
				party,
				preferred: { date: dates[1], after: '19:00' },
				days
			},
			on_book: { action: 'emit', target: 'book' }
		}
	};
}

/** A card the mock answers with as is: the bike gears, the two flows and the laptop comparison. */
function inlineCard(message: string): [id: string, intro: string, card: unknown] | null {
	if (/\b(bike|bicycle)/i.test(message) && /\bgears?\b/i.test(message)) return ['gears', 'Here is how the chain drive works.', gearsCard];
	if (/\btrip\b/i.test(message) && /\bstep by step\b/i.test(message)) return ['trip', 'Happy to. A couple of quick questions first.', tripFlowCard];
	if (/\blaptop\b/i.test(message) && /\bquestions?\b/i.test(message)) return ['laptop', 'Sure. Three quick questions and I will narrow it down.', laptopFlowCard];
	if (/\blaptops?\b/i.test(message)) return ['laptops', 'Here are three that fit what you told me.', laptopAnswerCard];
	return null;
}

function storeCardKind(message: string): 'menu' | 'booking' | null {
	if (/\b(book|table|reserv\w*)\b/i.test(message)) return 'booking';
	if (/\b(order|burgers?)\b/i.test(message)) return 'menu';
	return null;
}

function cors(req: IncomingMessage, res: ServerResponse) {
	const origin = req.headers.origin;
	if (origin && LOCAL_ORIGIN.test(origin)) {
		res.setHeader('access-control-allow-origin', origin);
		res.setHeader('vary', 'origin');
		res.setHeader('access-control-allow-methods', 'POST, OPTIONS');
		res.setHeader('access-control-allow-headers', 'content-type');
	}
}

function json(res: ServerResponse, status: number, body: unknown) {
	res.writeHead(status, { 'content-type': 'application/json' });
	res.end(JSON.stringify(body));
}

function modeOf(message: string, url: URL): string {
	const forced = url.searchParams.get('mode') ?? process.env.MOCK_PAWBAR_MODE;
	if (forced) return forced;
	const m = message.toLowerCase();
	if (/\b429\b/.test(m)) return '429';
	if (/\blimit\b/.test(m)) return 'limit';
	if (/\bbusy\b/.test(m)) return 'busy';
	if (/\breject/.test(m)) return 'reject';
	if (/\btruncat/.test(m)) return 'truncate';
	if (/\blegacy\b/.test(m)) return 'legacy';
	if (/\bunsafe\b/.test(m)) return 'unsafe';
	return 'normal';
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
	let raw = '';
	for await (const part of req) raw += String(part);
	try {
		const body: unknown = JSON.parse(raw);
		return isRecord(body) ? body : null;
	} catch {
		return null;
	}
}

const server = createServer((req, res) => {
	void handle(req, res).catch((err: unknown) => {
		console.error('[mock-pawbar]', err);
		if (!res.headersSent) json(res, 500, { detail: 'internal_error' });
	});
});

async function handle(req: IncomingMessage, res: ServerResponse) {
	const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
	cors(req, res);
	if (req.method === 'OPTIONS') return void res.writeHead(204).end();
	if (url.pathname === '/beacon') {
		console.info(`[mock-pawbar] BEACON ${url.search}`);
		return void res.writeHead(204).end();
	}
	if (req.method !== 'POST' || url.pathname !== '/api/v1/paw-bar/chat') return json(res, 404, { detail: 'not_found' });

	const body = await readBody(req);
	if (!body) return json(res, 400, { detail: 'message_rejected' });
	if (!body.widget_id || !body.signed_key) return json(res, 401, { detail: 'invalid_site_key' });
	const message = typeof body.message === 'string' ? body.message.trim() : '';
	if (!message || typeof body.customer_ref !== 'string' || !REF.test(body.customer_ref)) {
		return json(res, 400, { detail: 'message_rejected' });
	}

	const mode = modeOf(message, url);
	const scenario = pickScenario(message);
	console.info(`[mock-pawbar] ${mode} -> ${scenario.id}`);
	if (mode === '429') return json(res, 429, { detail: 'Rate limit exceeded' });

	res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive' });
	const send = (event: string, data: unknown) => res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
	if (mode === 'limit' || mode === 'busy') {
		send('unavailable', { type: 'unavailable', reason: mode === 'limit' ? 'limit' : 'temporary' });
		return void res.end();
	}

	if (mode === 'unsafe') {
		send('chunk', { content: 'Here is your reward card.', type: 'text' });
		send('card.start', { card_id: 'unsafe' });
		for (let i = 0; i < UNSAFE_CARD.length; i += 24) {
			send('card.delta', { card_id: 'unsafe', text: UNSAFE_CARD.slice(i, i + 24) });
			await sleep(60);
		}
		await sleep(4000);
		send('card.rejected', { card_id: 'unsafe', reason: 'invalid' });
		send('stream_end', { assistant_message_id: 'msg_unsafe', cancelled: false });
		return void res.end();
	}

	const streamCard = async (id: string, intro: string, card: unknown) => {
		const text = JSON.stringify(card);
		send('chunk', { content: intro, type: 'text' });
		send('card.start', { card_id: id });
		for (let i = 0; i < text.length; i += 400) {
			send('card.delta', { card_id: id, text: text.slice(i, i + 400) });
			await sleep(15);
		}
		send('card.final', { card_id: id, card });
		send('stream_end', { assistant_message_id: `msg_${id}`, cancelled: false });
		res.end();
	};

	const inline = mode === 'normal' ? inlineCard(message) : null;
	if (inline) {
		console.info(`[mock-pawbar] inline card: ${inline[0]}`);
		return streamCard(...inline);
	}

	const kind = mode === 'normal' ? storeCardKind(message) : null;
	if (kind) {
		console.info(`[mock-pawbar] store card: ${kind} from ${STORE}`);
		let card: unknown;
		try {
			card = kind === 'menu' ? await menuCard(message) : await bookingCard(message);
		} catch (err) {
			console.error('[mock-pawbar] store unreachable', err);
			send('chunk', { content: `The store at ${STORE} did not answer, so there is no card this time.`, type: 'text' });
			send('stream_end', { assistant_message_id: 'msg_store', cancelled: false });
			return void res.end();
		}
		const intro = kind === 'menu' ? 'Here is the menu. Pick what you like and check out when ready.' : 'Here are the open times. Pick one and add your details.';
		return streamCard(kind, intro, card);
	}

	const abort = new AbortController();
	res.on('close', () => abort.abort());
	const speed = Number(url.searchParams.get('speed') ?? process.env.MOCK_PAWBAR_SPEED ?? 2) || 2;
	const recorded: RecordedMode = mode === 'reject' || mode === 'truncate' || mode === 'legacy' ? mode : 'normal';
	for await (const frame of recordedEvents(scenario, { mode: recorded, speed, signal: abort.signal })) {
		if (abort.signal.aborted) break;
		send(frame.event, frame.data);
	}
	res.end();
}

server.listen(PORT, () => console.info(`[mock-pawbar] http://localhost:${PORT}/api/v1/paw-bar/chat`));
