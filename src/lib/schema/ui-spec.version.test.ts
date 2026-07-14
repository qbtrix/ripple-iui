// ui-spec.version.test.ts — spec versioning contract + the removal of the dead
// `data` (DataFetcher) field.
//
// Before this, `version` was `z.literal('1.0')`, so a spec declaring any other
// version — including a purely additive `1.1` — failed to parse outright. The
// contract now: same major renders, different major is refused.

import { describe, it, expect } from 'vitest';
import {
	CURRENT_SPEC_VERSION,
	isCompatibleSpecVersion,
	safeParseUISpec,
	parseUISpec
} from './ui-spec.js';

const ui = { type: 'text', props: { text: 'hi' } };

describe('spec version compatibility', () => {
	it('the current version is compatible', () => {
		expect(isCompatibleSpecVersion(CURRENT_SPEC_VERSION)).toBe(true);
	});

	it('accepts a newer MINOR — additive changes must still render', () => {
		expect(isCompatibleSpecVersion('1.1')).toBe(true);
		expect(isCompatibleSpecVersion('1.99')).toBe(true);

		// The regression this fixes: a 1.1 spec used to fail parse entirely.
		const result = safeParseUISpec({ version: '1.1', ui });
		expect(result.success).toBe(true);
	});

	it('refuses a different MAJOR rather than mis-rendering it', () => {
		expect(isCompatibleSpecVersion('2.0')).toBe(false);
		expect(isCompatibleSpecVersion('0.9')).toBe(false);

		const result = safeParseUISpec({ version: '2.0', ui });
		expect(result.success).toBe(false);
	});

	it('rejects a malformed version string', () => {
		for (const bad of ['', '1', 'v1.0', '1.0.0', 'next', '1.x']) {
			expect(isCompatibleSpecVersion(bad)).toBe(false);
		}
		expect(safeParseUISpec({ version: 'v1.0', ui }).success).toBe(false);
	});

	it('defaults to the current version when omitted', () => {
		expect(parseUISpec({ ui }).version).toBe(CURRENT_SPEC_VERSION);
	});
});

describe('dead DataFetcher removal', () => {
	it('drops a legacy `data` fetcher block instead of pretending to honour it', () => {
		// This never fetched anything — Ripple seeds `ui-data` with an empty store
		// and never populates it from `spec.data`. Parsing must not carry it
		// forward as if it were live.
		const parsed = parseUISpec({
			version: '1.0',
			data: { rows: { url: 'https://example.com/rows', method: 'GET' } },
			ui
		});
		expect('data' in parsed).toBe(false);
	});

	it('still preserves `sources` — the live server-executed path', () => {
		const parsed = parseUISpec({
			version: '1.0',
			sources: { rows: { bind: 'state.rows' } },
			ui
		});
		expect(parsed.sources).toEqual({ rows: { bind: 'state.rows' } });
	});
});
