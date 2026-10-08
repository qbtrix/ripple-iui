// routes/pawbar/sse.ts — Wire layer for the Paw Bar chat stream.
// parseSSE turns text chunks into `{event, data}` frames: frames end on a blank
// line, CRLF is tolerated, comment lines and lines without a colon are skipped,
// multi-line `data:` is joined, and a frame whose data is not JSON is dropped
// (a malformed frame must not end the turn). An unterminated last frame is
// discarded, as the SSE spec says. A frame over 1 MB throws (the turn ends with
// an error notice), and each chunk is scanned from where the last scan stopped.
// `segments` splits the LEGACY reply format,
// where a card arrives as a ```pawbar-card fence inside the text, and holds back
// a half-arrived fence marker so it never flashes as text. Both are pure and
// fetch-free so tests feed them strings.

export interface SSEFrame {
	event: string;
	data: unknown;
}

const FRAME_END = /\r?\n\r?\n/g;
export const MAX_FRAME_BYTES = 1_000_000;

export async function* parseSSE(source: AsyncIterable<string>): AsyncGenerator<SSEFrame> {
	let buf = '';
	let from = 0;
	for await (const text of source) {
		buf += text;
		for (;;) {
			FRAME_END.lastIndex = from;
			const m = FRAME_END.exec(buf);
			if (!m) {
				from = Math.max(0, buf.length - 3); // a separator is at most 4 chars
				break;
			}
			const frame = parseFrame(buf.slice(0, m.index));
			buf = buf.slice(m.index + m[0].length);
			from = 0;
			if (frame) yield frame;
		}
		if (buf.length > MAX_FRAME_BYTES) throw new Error('SSE frame over 1 MB');
	}
}

function parseFrame(block: string): SSEFrame | null {
	let event = 'message';
	const data: string[] = [];
	for (const line of block.split(/\r?\n/)) {
		const colon = line.indexOf(':');
		if (colon <= 0) continue; // comment (":…") or no field name
		const field = line.slice(0, colon);
		const value = line.slice(colon + 1).replace(/^ /, '');
		if (field === 'event') event = value;
		else if (field === 'data') data.push(value);
	}
	if (!data.length) return null;
	try {
		return { event, data: JSON.parse(data.join('\n')) };
	} catch {
		return null;
	}
}

/** Decodes a fetch body into text chunks (a reader loop: not every browser can `for await` a ReadableStream). */
export async function* readText(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
	const reader = body.getReader();
	const decoder = new TextDecoder();
	try {
		for (;;) {
			const { done, value } = await reader.read();
			if (done) break;
			yield decoder.decode(value, { stream: true });
		}
		const tail = decoder.decode();
		if (tail) yield tail;
	} finally {
		reader.releaseLock();
	}
}

export type Segment = { kind: 'text'; text: string } | { kind: 'card'; text: string; closed: boolean };

export const FENCE_OPEN = '```pawbar-card';
const FENCE_CLOSE = '\n```';

/**
 * Splits accumulated reply text into text and fenced-card segments. Card text
 * only ever grows across calls on a growing input (a held-back suffix is
 * either confirmed as body later or turns out to be the closing fence), so a
 * caller can push the difference into a stream. `done` releases held text.
 */
export function segments(src: string, done = false): Segment[] {
	const out: Segment[] = [];
	let i = 0;
	while (i < src.length) {
		const open = src.indexOf(FENCE_OPEN, i);
		if (open < 0) {
			out.push({ kind: 'text', text: done ? src.slice(i) : holdBack(src.slice(i), FENCE_OPEN) });
			break;
		}
		out.push({ kind: 'text', text: src.slice(i, open) });
		const lineEnd = src.indexOf('\n', open + FENCE_OPEN.length);
		if (lineEnd < 0) {
			out.push({ kind: 'card', text: '', closed: false });
			break;
		}
		const close = src.indexOf(FENCE_CLOSE, lineEnd);
		if (close < 0) {
			const body = src.slice(lineEnd + 1);
			out.push({ kind: 'card', text: done ? body : holdBack(body, FENCE_CLOSE), closed: false });
			break;
		}
		out.push({ kind: 'card', text: src.slice(lineEnd + 1, close), closed: true });
		i = close + FENCE_CLOSE.length;
	}
	return out.filter((s) => s.kind === 'card' || s.text !== '');
}

/** Drops a trailing partial `marker` ("``", "```paw") that may complete in the next chunk. */
function holdBack(text: string, marker: string): string {
	for (let k = Math.min(marker.length - 1, text.length); k > 0; k--) {
		if (text.endsWith(marker.slice(0, k))) return text.slice(0, -k);
	}
	return text;
}
