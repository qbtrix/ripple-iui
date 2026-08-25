// ui-spec.version.test.ts — spec versioning contract + the removal of the dead
// `data` (DataFetcher) field.
//
// Before this, `version` was `z.literal('1.0')`, so a spec declaring any other
// version — including a purely additive `1.1` — failed to parse outright. The
// contract now: same major renders, different major is refused.
//
// Review pass: helper renamed to isCompatibleUISpecVersion (Gen-1 scoped; the
// old name stays as a deprecated alias and is pinned here), semver patch
// digits ("1.0.0") now parse, and the legacy-fetcher console warning has
// coverage for both the warning and the Gen-2 non-warning path.

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from '@testing-library/svelte';
import {
	CURRENT_SPEC_VERSION,
	isCompatibleUISpecVersion,
	isCompatibleSpecVersion,
	safeParseUISpec,
	parseUISpec
} from '@ripple-ui/core';
import Ripple from '$lib/Ripple.svelte';

const ui = { type: 'text', props: { text: 'hi' } };

describe('spec version compatibility', () => {
	it('the current version is compatible', () => {
		expect(isCompatibleUISpecVersion(CURRENT_SPEC_VERSION)).toBe(true);
	});

	it('accepts a newer MINOR — additive changes must still render', () => {
		expect(isCompatibleUISpecVersion('1.1')).toBe(true);
		expect(isCompatibleUISpecVersion('1.99')).toBe(true);

		// The regression this fixes: a 1.1 spec used to fail parse entirely.
		const result = safeParseUISpec({ version: '1.1', ui });
		expect(result.success).toBe(true);
	});

	it('tolerates a semver patch digit — LLMs emit "1.0.0" constantly', () => {
		expect(isCompatibleUISpecVersion('1.0.0')).toBe(true);
		expect(isCompatibleUISpecVersion('1.2.3')).toBe(true);
		expect(safeParseUISpec({ version: '1.0.0', ui }).success).toBe(true);
	});

	it('refuses a different MAJOR rather than mis-rendering it', () => {
		expect(isCompatibleUISpecVersion('2.0')).toBe(false);
		expect(isCompatibleUISpecVersion('0.9')).toBe(false);

		const result = safeParseUISpec({ version: '2.0', ui });
		expect(result.success).toBe(false);
	});

	it('rejects a malformed version string', () => {
		for (const bad of ['', '1', 'v1.0', 'next', '1.x', '1.0.0.0']) {
			expect(isCompatibleUISpecVersion(bad)).toBe(false);
		}
		expect(safeParseUISpec({ version: 'v1.0', ui }).success).toBe(false);
	});

	it('defaults to the current version when omitted', () => {
		expect(parseUISpec({ ui }).version).toBe(CURRENT_SPEC_VERSION);
	});

	it('keeps the deprecated isCompatibleSpecVersion alias working', () => {
		expect(isCompatibleSpecVersion).toBe(isCompatibleUISpecVersion);
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

describe('legacy fetcher console warning', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('warns once when a Gen-1 spec carries a fetcher-shaped `data` block', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(Ripple, {
			props: {
				spec: {
					version: '1.0',
					data: { rows: { url: 'https://example.com/rows', method: 'GET' } },
					ui
				}
			}
		});
		const fetcherWarnings = warn.mock.calls.filter((c) =>
			String(c[0]).includes('remote fetchers')
		);
		expect(fetcherWarnings).toHaveLength(1);
	});

	it('does NOT warn on Gen-2 inline data that happens to contain a url', () => {
		const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
		render(Ripple, {
			props: {
				spec: {
					version: '2.0',
					intent: 'detail',
					// Live, consumed inline data — `url` here is content, not a fetcher.
					data: { report: { url: 'https://example.com/q2.pdf', title: 'Q2' } }
				}
			}
		});
		const fetcherWarnings = warn.mock.calls.filter((c) =>
			String(c[0]).includes('remote fetchers')
		);
		expect(fetcherWarnings).toHaveLength(0);
	});
});
