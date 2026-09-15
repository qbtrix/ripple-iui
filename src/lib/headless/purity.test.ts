/**
 * @file purity.test.ts
 * @description The gate that makes "headless" a build-enforced property
 * rather than a claim in a README.
 *
 * The failure this prevents is quiet: someone adds a convenience import
 * to a module `headless/` already depends on, and months later a Node
 * consumer gets `document is not defined` at import time, with a stack
 * pointing at a file nobody thought was part of the headless surface.
 *
 * So the check is transitive. It walks the real import graph from
 * `headless/index.ts` and asserts of every reachable file:
 *
 *   1. no `.svelte` import (component or `.svelte.ts` rune module),
 *   2. no import from `svelte` or `svelte/*`,
 *   3. no top-level `document` / `window` / `navigator` use.
 *
 * Rule 3 is deliberately about MODULE-LEVEL access, not function bodies:
 * a function that touches `document` when a browser host calls it is
 * fine; an import-time reference is what breaks Node.
 *
 * Sources are read through Vite's `import.meta.glob(..., '?raw')` rather
 * than `node:fs` — this repo has no `@types/node`, and the glob keeps the
 * gate runnable in any vitest environment.
 *
 * @changes
 *   - 2026-08-25: created (headless core, wave 1).
 */

import { describe, it, expect } from 'vitest';

/** Every lib source, keyed by a path relative to this file's directory. */
const SOURCES = import.meta.glob('../**/*.ts', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

const ENTRY = './index.ts';

/**
 * Static import/export sources: `from '...'` plus bare `import '...'`.
 *
 * The body matcher is `[^;]*?`, not `[^\n;]*?`, so a MULTI-LINE block
 * (`export {\n  A,\n  B\n} from './x.js'`) is seen. Restricting it to one
 * line silently skipped most of this file's own entry point, which is
 * precisely the hole the "crawler actually works" test guards.
 */
const IMPORT_RE =
	/(?:^|\n)\s*(?:import|export)\b[^;]*?from\s+['"]([^'"]+)['"]|(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g;

/** Dynamic `import('...')` — reachable at runtime, so it counts too. */
const DYNAMIC_RE = /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g;

function specifiersOf(source: string): string[] {
	const out: string[] = [];
	for (const re of [IMPORT_RE, DYNAMIC_RE]) {
		re.lastIndex = 0;
		let m: RegExpExecArray | null;
		while ((m = re.exec(source)) !== null) {
			const spec = m[1] ?? m[2];
			if (spec) out.push(spec);
		}
	}
	return out;
}

/** Normalize a `./a/../b/c` style path into `./b/c`. */
function normalize(path: string): string {
	const parts: string[] = [];
	for (const part of path.split('/')) {
		if (part === '' || part === '.') continue;
		if (part === '..') parts.pop();
		else parts.push(part);
	}
	return parts.join('/');
}

/** Directory of a glob key, relative to this file. */
function dirOf(key: string): string {
	const idx = key.lastIndexOf('/');
	return idx === -1 ? '' : key.slice(0, idx);
}

/**
 * Resolve a relative specifier to a SOURCES key, honouring the repo's
 * `.js`-in-source / `.ts`-on-disk convention and index files.
 */
function resolveLocal(fromKey: string, spec: string): string | null {
	if (!spec.startsWith('.')) return null;
	const joined = normalize(`${dirOf(fromKey)}/${spec}`);
	const candidates = [
		joined.replace(/\.js$/, '.ts'),
		joined.replace(/\.js$/, '.svelte.ts'),
		joined,
		`${joined}.ts`,
		`${joined}/index.ts`
	];
	for (const candidate of candidates) {
		for (const prefix of ['../', './']) {
			const key = prefix === './' ? `./${candidate}` : `../${candidate}`;
			if (key in SOURCES) return key;
		}
	}
	return null;
}

/**
 * Glob keys arrive relative to this file's directory (`./index.ts` for a
 * sibling, `../core/x.ts` for a cousin). Build one lookup that accepts either.
 */
function sourceOf(key: string): string | undefined {
	return SOURCES[key];
}

/** Walk the transitive import graph from the headless entry point. */
function crawl(): { files: string[]; svelteImports: Array<{ file: string; spec: string }> } {
	const seen = new Set<string>();
	const svelteImports: Array<{ file: string; spec: string }> = [];
	const queue = [ENTRY];

	while (queue.length > 0) {
		const key = queue.pop()!;
		if (seen.has(key)) continue;
		const source = sourceOf(key);
		if (source === undefined) continue;
		seen.add(key);

		for (const spec of specifiersOf(source)) {
			// A `.svelte` component or a `.svelte.ts` rune module: both need the compiler.
			if (spec.endsWith('.svelte') || spec.includes('.svelte.')) {
				svelteImports.push({ file: key, spec });
				continue;
			}
			if (spec === 'svelte' || spec.startsWith('svelte/')) {
				svelteImports.push({ file: key, spec });
				continue;
			}
			const local = resolveLocal(key, spec);
			if (local) queue.push(local);
		}
	}

	return { files: [...seen], svelteImports };
}

/**
 * Strip comments and string literals before scanning for DOM globals, so a
 * mention in a doc comment (this file's own header, for one) is not a hit.
 */
function stripCommentsAndStrings(source: string): string {
	return source
		.replace(/\/\*[\s\S]*?\*\//g, '')
		.replace(/(^|[^:])\/\/[^\n]*/g, '$1')
		.replace(/'(?:[^'\\\n]|\\.)*'/g, "''")
		.replace(/"(?:[^"\\\n]|\\.)*"/g, '""')
		.replace(/`(?:[^`\\]|\\.)*`/g, '``');
}

/**
 * Lines at module top level (depth 0 by bracket counting) that touch a DOM
 * global. Inside a function body is fine — at import time is not.
 */
function topLevelDomUse(source: string): string[] {
	const clean = stripCommentsAndStrings(source);
	const hits: string[] = [];
	let depth = 0;

	for (const line of clean.split('\n')) {
		if (depth === 0 && /\b(document|window|navigator|localStorage)\b/.test(line)) {
			hits.push(line.trim());
		}
		for (const ch of line) {
			if (ch === '{' || ch === '(' || ch === '[') depth++;
			else if (ch === '}' || ch === ')' || ch === ']') depth--;
		}
	}
	return hits;
}

describe('headless purity', () => {
	const graph = crawl();

	it('reaches a non-trivial module graph (the crawler actually works)', () => {
		// Guards the whole suite against silently passing on an empty crawl —
		// a broken resolver would otherwise make every assertion below vacuous.
		expect(graph.files.length).toBeGreaterThan(3);
		expect(graph.files.some((f) => f.endsWith('resolve-tree.ts'))).toBe(true);
		expect(graph.files.some((f) => f.endsWith('event-dispatcher.ts'))).toBe(true);
		expect(graph.files.some((f) => f.endsWith('expression-resolver.ts'))).toBe(true);
	});

	it('imports nothing from svelte, transitively', () => {
		expect(graph.svelteImports).toEqual([]);
	});

	it('touches no DOM global at module top level', () => {
		const offenders: Array<{ file: string; lines: string[] }> = [];
		for (const file of graph.files) {
			const source = sourceOf(file);
			if (!source) continue;
			const lines = topLevelDomUse(source);
			if (lines.length > 0) offenders.push({ file, lines });
		}
		expect(offenders).toEqual([]);
	});

	it('the entry point imports cleanly in this environment', async () => {
		const mod = await import('./index.js');
		expect(typeof mod.createHeadlessRuntime).toBe('function');
		expect(typeof mod.resolveTree).toBe('function');
		expect(typeof mod.HeadlessStateManager).toBe('function');
	});
});
