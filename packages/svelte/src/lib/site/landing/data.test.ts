// site/landing/data.test.ts — The landing's build-time data: doc fences found
// (or the build fails), release lines cleaned, first-widget timing measured.

import { describe, expect, test } from 'vitest';
import { buildLandingData, docFence, firstWidgetMs, median, parseRelease } from './data.js';
import { scenarios } from '../../../routes/live/scenarios.js';

const repo = 'https://github.com/x/y';

describe('docFence', () => {
	const list = [{ slug: 'a/b', raw: '# T\n\n```ts\n// one\nconst a = 1;\n```\n\n```bash\nbun add x\n```\n' }] as never;
	test('returns the block holding the marker', () => {
		expect(docFence('a/b', 'bun add', list)).toEqual({ lang: 'bash', code: 'bun add x' });
	});
	test('throws when the marker is gone, so the build fails', () => {
		expect(() => docFence('a/b', 'nope', list)).toThrow(/no code block containing "nope"/);
		expect(() => docFence('c/d', 'x', list)).toThrow(/no doc page/);
	});
});

describe('parseRelease', () => {
	test('drops the version prefix and dashes', () => {
		expect(parseRelease('v0.8.0\t2026-09-27\tv0.8.0: slim headless runtime', repo)).toEqual({
			tag: 'v0.8.0',
			date: '2026-09-27',
			note: 'Slim headless runtime',
			url: `${repo}/releases/tag/v0.8.0`
		});
		expect(parseRelease('v0.7.0\t2026-09-18\tv0.7.0 — the split — done', repo)).toMatchObject({
			note: 'The split, done'
		});
		expect(parseRelease('v0.6.0\t2026-07-02\tripple v0.6.0 — editor export', repo)?.note).toBe('Editor export');
	});
	test('a subject that is only the version is skipped', () => {
		expect(parseRelease('v0.3.1\t2026-05-29\tv0.3.1', repo)).toBeNull();
	});
});

test('firstWidgetMs is the arrival time of the chunk that completes the first catalog widget', () => {
	const chunks = [
		{ t: 0, text: '{"state":{"a":1},' },
		{ t: 40, text: '"ui":{"ty' },
		{ t: 90, text: 'pe":"car' },
		{ t: 90, text: 'd"' },
		{ t: 150, text: ',"children":[]}}' }
	];
	expect(firstWidgetMs(chunks, new Set(['card']))).toBe(90);
	expect(firstWidgetMs(chunks, new Set(['flex']))).toBeNull();
});

test('median', () => {
	expect(median([5, 1, 3])).toBe(3);
	expect(median([4, 1, 3, 2])).toBe(2.5);
});

test('buildLandingData reads the manifest, the docs and the recordings', () => {
	const d = buildLandingData({ releases: [], sizes: null });
	expect(d.widgetCount).toBe(d.categories.reduce((n, c) => n + c.types.length, 0));
	expect(d.minis.map((m) => m.type)).toEqual(['approval-gate', 'todo-list', 'data-grid', 'flashcard']);
	expect(d.firstWidget?.n).toBe(scenarios.length);
	expect(d.firstWidget?.medianMs).toBeGreaterThan(0);
	const [svelte, headless] = d.integration;
	expect(svelte.files.map((f) => f.name)).toEqual(['Terminal', 'src/app.css', 'src/routes/api/ui/+server.ts', 'src/routes/+page.svelte']);
	expect(svelte.files[2].code).not.toContain('// src/routes');
	expect(headless.files[0].code).toBe('npm install @ripple-ui/core');
});
