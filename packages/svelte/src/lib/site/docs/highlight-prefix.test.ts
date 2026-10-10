// site/docs/highlight-prefix.test.ts — Token colouring of a JSON stream cut at any byte.

import { describe, expect, test } from 'vitest';
import { highlightJson, highlightJsonPrefix } from './highlight.js';
import { prettyPrefix } from '../prettyPrefix.js';
import billSplitter from '../../../routes/live/fixtures/bill-splitter.json';

describe('highlightJsonPrefix', () => {
	test('an open string at the end is one tok-str: no number or brace flashes inside it', () => {
		expect(highlightJsonPrefix('"description": "Split 4 ways {')).toBe(
			'<span class="tok-key">&quot;description&quot;</span><span class="tok-punct">:</span> <span class="tok-str">&quot;Split 4 ways {</span>'
		);
		expect(highlightJsonPrefix('"a\\"b')).toBe('<span class="tok-str">&quot;a\\&quot;b</span>');
	});

	test('a closed line highlights exactly like highlightJson', () => {
		for (const s of ['"a": "x",', '"n": -1.5,', '{', '"ok": true', '"q": "say \\"hi\\""'])
			expect(highlightJsonPrefix(s)).toBe(highlightJson(s));
	});

	test('a printed line never re-tokenises as the stream grows', () => {
		const wire = billSplitter.chunks.map((c) => c.text).join('');
		const final = prettyPrefix(wire).split('\n').map((l) => highlightJson(l.trimStart()));
		for (let i = 0; i <= wire.length; i += 7) {
			const lines = prettyPrefix(wire.slice(0, i)).split('\n');
			lines.slice(0, -1).forEach((l, k) => expect(highlightJson(l.trimStart())).toBe(final[k]));
		}
	});
});
