// scripts/mock-pawbar.ts — A local stand-in for the Paw Bar chat API, for the landing.
// `bun run dev:mock` serves POST /api/v1/paw-bar/chat on port 5288 (MOCK_PAWBAR_PORT)
// with the real request/response contract: it answers with the recorded /live
// scenario that best matches the message, streamed as SSE (intro chunk,
// card.start, card.delta on the recording's timing, card.final, closing chunk,
// stream_end). Failure paths, picked by a keyword in the message, `?mode=`, or
// MOCK_PAWBAR_MODE: `429` (HTTP 429), `limit` (unavailable/limit), `busy`
// (unavailable/temporary), `reject` (card.rejected), `truncate` (card cut off,
// card.rejected "truncated"), `legacy` (the whole card as a fence in chunk text).
// MOCK_PAWBAR_SPEED / `?speed=` scales the replay (default 2). CORS: localhost only.
// Point the site at it: PUBLIC_PAWBAR_ENDPOINT=http://localhost:5288
// PUBLIC_PAWBAR_WIDGET_ID=demo PUBLIC_PAWBAR_SITE_KEY=demo bun run dev

import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import { pickScenario, recordedEvents, type RecordedMode } from '../src/routes/pawbar/recorded.ts';

const PORT = Number(process.env.MOCK_PAWBAR_PORT ?? 5288);
const LOCAL_ORIGIN = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;
const REF = /^[A-Za-z0-9_-]{8,128}$/;

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
	return 'normal';
}

async function readBody(req: IncomingMessage): Promise<Record<string, unknown> | null> {
	let raw = '';
	for await (const part of req) raw += String(part);
	try {
		const body: unknown = JSON.parse(raw);
		return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
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
