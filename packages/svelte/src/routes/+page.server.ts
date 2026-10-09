// The landing's data below the hero, built once at prerender (site/landing/data.ts).
// Two inputs need IO and are optional: the last four tagged releases (git) and
// the core runtime sizes (esbuild over packages/core/dist, gzipped). Either one
// failing drops its section or number from the page; it never fails the build.
// Both run at module scope, so `vite dev` pays for them once, not per request.

// This package has no @types/node (nothing else here runs on the server), so
// the three builtins are untyped; their few call sites are typed by hand.
// @ts-expect-error no @types/node
import { execFileSync } from 'node:child_process';
// @ts-expect-error no @types/node
import { resolve } from 'node:path';
// @ts-expect-error no @types/node
import { gzipSync } from 'node:zlib';
import { buildLandingData, parseRelease, type CoreSizes, type Release } from '$lib/site/landing/data.js';

const REPO = 'https://github.com/qbtrix/ripple-iui';

function releases(): Release[] {
	try {
		const out: string = execFileSync(
			'git',
			['for-each-ref', 'refs/tags', '--sort=-creatordate', '--format=%(refname:short)%09%(creatordate:short)%09%(subject)'],
			{ encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }
		);
		return out
			.split('\n')
			.map((line: string) => parseRelease(line.trim(), REPO))
			.filter((r: Release | null): r is Release => r !== null)
			.slice(0, 4);
	} catch {
		return [];
	}
}

// What a consumer ships for one import, minified and gzipped. The build runs
// from packages/svelte, so core's dist is a sibling.
async function coreSizes(): Promise<CoreSizes | null> {
	try {
		const { build } = await import('esbuild');
		const dist: string = resolve('../core/dist');
		const size = async (name: string, file: string) => {
			const r = await build({
				stdin: { contents: `export { ${name} } from ${JSON.stringify(resolve(dist, file))};`, resolveDir: dist },
				bundle: true,
				minify: true,
				format: 'esm',
				platform: 'neutral',
				write: false,
				logLevel: 'silent'
			});
			return gzipSync(r.outputFiles[0].contents).length as number;
		};
		return {
			headless: await size('createHeadlessRuntime', 'headless/index.js'),
			slim: await size('createSlimHeadlessRuntime', 'headless/slim.js')
		};
	} catch {
		return null;
	}
}

const data = coreSizes().then((sizes) => buildLandingData({ releases: releases(), sizes }));

export const load = () => data;
