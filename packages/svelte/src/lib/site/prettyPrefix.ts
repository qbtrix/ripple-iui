// lib/site/prettyPrefix.ts — Pretty-prints a JSON text that may still be arriving.
// A single character walk, no parse: strings pass through verbatim (escapes
// included), whitespace outside strings is dropped, `:` gets one space, and
// `{` `[` `,` break the line at two-space indent. The break after an opener
// is deferred to the next real character, so `{}` and `[]` stay on one line
// and the output for a prefix is always a prefix of the output for the longer
// text: the view grows at the end and never reflows. Never throws; stray
// closers clamp the depth at zero. For display only (the spec peek).
// lineTokens colours one output line on its own: a break only ever falls
// outside a string, so every line starts outside one and needs no context.
// A caller that keeps unchanged lines (JsonLines) tokenises only the tail.

export function prettyPrefix(text: string): string {
	let out = '';
	let depth = 0;
	let inString = false;
	let escaped = false;
	let pendingOpen = false;
	const br = () => `\n${'  '.repeat(depth)}`;

	for (const ch of text) {
		if (inString) {
			out += ch;
			if (escaped) escaped = false;
			else if (ch === '\\') escaped = true;
			else if (ch === '"') inString = false;
			continue;
		}
		if (ch === ' ' || ch === '\n' || ch === '\r' || ch === '\t') continue;
		const closer = ch === '}' || ch === ']';
		if (pendingOpen) {
			pendingOpen = false;
			if (closer) {
				depth = Math.max(0, depth - 1);
				out += ch;
				continue;
			}
			out += br();
		}
		if (ch === '{' || ch === '[') {
			out += ch;
			depth++;
			pendingOpen = true;
		} else if (closer) {
			depth = Math.max(0, depth - 1);
			out += br() + ch;
		} else if (ch === ',') out += ',' + br();
		else if (ch === ':') out += ': ';
		else {
			if (ch === '"') inString = true;
			out += ch;
		}
	}
	return out;
}

export type TokKind = 'key' | 'str' | 'num' | 'lit' | 'punct';
export type Tok = { t: TokKind; v: string };

// A string (an unterminated one too: the streaming tail), a number, a word, or one other character.
const TOKEN = /("(?:[^"\\]|\\.)*\\?"?)|(-?[\d.][\d.eE+-]*)|([A-Za-z]+)|(\s+)|([^])/g;

/** One prettyPrefix line as JSON tokens. A string followed by `:` is a key; whitespace stays punctuation. */
export function lineTokens(line: string): Tok[] {
	const out: Tok[] = [];
	for (const m of line.matchAll(TOKEN)) {
		const [, str, num, word, space, other] = m;
		if (str !== undefined) out.push({ t: /^\s*:/.test(line.slice(m.index + str.length)) ? 'key' : 'str', v: str });
		else if (num !== undefined) out.push({ t: 'num', v: num });
		else if (word !== undefined) out.push({ t: 'lit', v: word });
		else out.push({ t: 'punct', v: space ?? other });
	}
	return out;
}
