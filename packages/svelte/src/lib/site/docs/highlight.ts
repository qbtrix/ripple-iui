// site/docs/highlight.ts — HTML escaping and a tiny JSON tokenizer for docs
// code blocks and the SpecExample spec view. Runs at build time (markdown) and
// in the browser (SpecExample), so it is plain string work, no DOM. Token
// classes (tok-key, tok-str, tok-num, tok-lit, tok-punct) are styled from the
// --code-* tokens in routes/site.css. Output is always escaped: safe for {@html}.

export function escapeHtml(s: string): string {
	return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;

/** Wrap JSON tokens in spans. Anything the pattern misses passes through escaped. */
export function highlightJson(src: string): string {
	let out = '';
	let last = 0;
	for (const m of src.matchAll(TOKEN)) {
		out += escapeHtml(src.slice(last, m.index));
		const [whole, str, colon, num, lit, punct] = m;
		if (str !== undefined) {
			out += `<span class="${colon ? 'tok-key' : 'tok-str'}">${escapeHtml(str)}</span>`;
			if (colon) out += `<span class="tok-punct">${escapeHtml(colon)}</span>`;
		} else if (num !== undefined) out += `<span class="tok-num">${num}</span>`;
		else if (lit !== undefined) out += `<span class="tok-lit">${lit}</span>`;
		else out += `<span class="tok-punct">${escapeHtml(punct ?? whole)}</span>`;
		last = m.index + whole.length;
	}
	return out + escapeHtml(src.slice(last));
}
