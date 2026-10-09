// routes/pawbar/copy.test.ts — The landing's visible copy has no em/en dashes and never claims a live model.
// Greps the landing route and the chat's components and strings with comments
// stripped (headers here legitimately use dashes; visitors never see them).
// A test file is skipped. Scenario titles feed the chips, so scenarios.ts is in.

import { expect, test } from 'vitest';

const SOURCES = import.meta.glob(['../+page.svelte', '../live/scenarios.ts', './*.svelte', './*.ts', '!./*.test.ts'], {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const visible = (src: string) =>
	src
		.replace(/<!--[\s\S]*?-->/g, '')
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|\s)\/\/.*$/gm, '$1');

test('the glob found the landing, the scenarios and the chat sources', () => {
	expect(Object.keys(SOURCES)).toEqual(expect.arrayContaining(['../+page.svelte', '../live/scenarios.ts', './Chat.svelte', './session.svelte.ts']));
});

test.each(Object.keys(SOURCES))('%s has no dashes or "live model" in its strings', (file) => {
	const text = visible(SOURCES[file]);
	expect(text.match(/.*[\u2013\u2014].*/g) ?? []).toEqual([]);
	expect(text.match(/.*live model.*/gi) ?? []).toEqual([]);
});
