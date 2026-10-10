// routes/pawbar/sse.ts — Wire layer for the Paw Bar chat stream.
// parseSSE turns text chunks into `{event, data}` frames: frames end on a blank
// line, CRLF is tolerated, comment lines and lines without a colon are skipped,
// multi-line `data:` is joined, and a frame whose data is not JSON is dropped
// (a malformed frame must not end the turn). An unterminated last frame is
// discarded, as the SSE spec says. A frame over 1 MB throws (the turn ends with
// an error notice), and each chunk is scanned from where the last scan stopped.
// `segments` splits the LEGACY reply format,
// where a card arrives as a ```pawbar-card fence inside the text, and holds back
// a half-arrived fence marker so it never flashes as text. Per CommonMark only a
// bare ``` line closes a card; a second ```pawbar-card inside an open card
// restarts it, and text from an open or abandoned fence is never text.
// `hideSpecText` is the renderer's last line of defence against a raw spec that
// reached the text anyway. All are pure and fetch-free so tests feed them strings.

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

export type Segment = { kind: 'text'; text: string } | { kind: 'card'; text: string; closed: boolean; restarted?: true };

export const FENCE_OPEN = '```pawbar-card';
/** A closing fence: a line of only ``` and spaces (CommonMark). `$` counts only once the reply is done. */
const CLOSE_LINE = /\n[ \t]*```[ \t]*(?=\r?\n)/g;
const CLOSE_LINE_DONE = /\n[ \t]*```[ \t]*(?=\r?\n|$)/g;
/** A trailing line that may still become a closing fence. */
const PARTIAL_CLOSE = /\n[ \t]*`{0,3}[ \t]*$/;

/**
 * Splits accumulated reply text into text and fenced-card segments. Only a
 * bare ``` line closes a card; a FENCE_OPEN inside an open card restarts it,
 * and the abandoned card comes back as `restarted` (never as text). Card text
 * only ever grows across calls on a growing input (a held-back suffix is
 * either confirmed as body later or turns out to be a fence), so a caller can
 * push the difference into a stream. `done` releases held text.
 */
export function segments(src: string, done = false): Segment[] {
	const out: Segment[] = [];
	const closeLine = done ? CLOSE_LINE_DONE : CLOSE_LINE;
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
		closeLine.lastIndex = lineEnd;
		const close = closeLine.exec(src);
		const restart = src.indexOf(FENCE_OPEN, lineEnd);
		if (restart >= 0 && (!close || restart < close.index)) {
			out.push({ kind: 'card', text: src.slice(lineEnd + 1, restart), closed: false, restarted: true });
			i = restart;
			continue;
		}
		if (!close) {
			const body = src.slice(lineEnd + 1);
			out.push({ kind: 'card', text: done ? body : holdBack(body.replace(PARTIAL_CLOSE, ''), FENCE_OPEN), closed: false });
			break;
		}
		out.push({ kind: 'card', text: src.slice(lineEnd + 1, close.index), closed: true });
		i = close.index + close[0].length;
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

/** A line where a card's raw spec starts: `pawbar-card` (a fence marker that lost its backticks) or `{"ui":`. */
const SPEC_LINE = /^[ \t]*(?:`*pawbar-card|\{\s*"ui"\s*:)/;
const SPEC_MARKERS = ['pawbar-card', '{"ui":'];
const FENCE_LINE = /^[ \t]*```[ \t]*\r?$/;

/**
 * The text renderer's last line of defence: drops every line from one that
 * starts a card spec (SPEC_LINE) through the next bare ``` line, or to the end.
 * While `streaming`, a last line that is still the start of a marker is held
 * back too, so "pawbar-c" never flashes. `hidden` says something was dropped.
 */
export function hideSpecText(text: string, streaming: boolean): { text: string; hidden: boolean } {
	const lines = text.split('\n');
	const kept: string[] = [];
	let hiding = false;
	let hidden = false;
	lines.forEach((line, n) => {
		if (hiding) {
			if (FENCE_LINE.test(line)) hiding = false;
			return;
		}
		const tail = line.trimStart();
		const partial = streaming && n === lines.length - 1 && tail !== '' && SPEC_MARKERS.some((m) => m.startsWith(tail.replace(/^`+/, '')));
		if (SPEC_LINE.test(line)) hiding = hidden = true;
		kept.push(hiding || partial ? '' : line);
	});
	return { text: kept.join('\n'), hidden };
}
