// svelte.config.js: one config for two builds. `bun run build` packages the
// library with svelte-package (the adapter is not involved). `bun run
// build:site` runs vite build, and adapter-static writes the public site
// (landing, playground, showcase) to build/ for the Workers static-assets
// deploy in wrangler.jsonc. Routes are prerendered where they can be; a page
// that fails to prerender is warned about and served by the 404.html SPA shell,
// which boots the client router on that URL.
import adapter from '@sveltejs/adapter-static';
import { loadEnv } from 'vite';

// Content Security Policy, written by SvelteKit as a <meta> tag on every
// prerendered page (mode 'hash' adds the hash of its own inline bootstrap). No
// 'unsafe-inline' script: a javascript: URL a card might smuggle in cannot run.
// Styles keep 'unsafe-inline' because Svelte and the widgets set style
// attributes and transitions inject <style>. connect-src lists /live's test
// store and, only when PUBLIC_PAWBAR_LIVE=1, the Paw Bar API, read at build time
// like vite.config.ts does (which also fails a build with a half-set env); dev adds
// localhost for the mock and Vite's HMR socket. img-src allows the two image
// hosts the showcase uses (its news feed's favicon service stays blocked) and
// the store's origin, which serves the menu photos in a menu-order card, and
// OpenStreetMap's tile server, which the tracking card's `order-status` map
// loads (its `osm` preset).
// 'unsafe-hashes' plus one hash admits exactly the `this.__e=event` attribute
// Svelte's SSR puts on <img> so hydration can replay a load event.
// 'wasm-unsafe-eval' lets the docs search compile Pagefind's same-origin wasm;
// it does not allow eval() of JS. frame-ancestors cannot be set from a meta tag.
const dev = process.env.NODE_ENV !== 'production';
const env = loadEnv(dev ? 'development' : 'production', process.cwd(), 'PUBLIC_');
const originOf = (url) => {
	try {
		return new URL(url).origin;
	} catch {
		return null;
	}
};
const storeOrigin = originOf(env.PUBLIC_STORE_URL || 'https://lab.pocketpaw.xyz/test-store');
const connectSrc = [
	'self',
	env.PUBLIC_PAWBAR_LIVE === '1' ? originOf(env.PUBLIC_PAWBAR_ENDPOINT) : null,
	storeOrigin,
	...(dev ? ['http://localhost:*', 'ws://localhost:*'] : [])
].filter((v) => v != null);

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ fallback: '404.html' }),
		// Absolute asset paths: the 404.html shell is served at arbitrary depths
		// (/showcase/x/y), where relative ./_app paths would resolve wrongly.
		paths: { relative: false },
		prerender: {
			// Docs and llms files are generated from src/docs: an error there (a
			// broken ```ripple block, a missing page) fails the build. Elsewhere a
			// page that cannot prerender falls back to the SPA shell, so it warns.
			handleHttpError: ({ path, message }) => {
				if (/^\/(docs|llms)/.test(path)) throw new Error(message);
				console.warn(message);
			},
			handleMissingId: 'warn'
		},
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'wasm-unsafe-eval', 'unsafe-hashes', 'sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I='],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'https://images.unsplash.com', 'https://i.pravatar.cc', 'https://tile.openstreetmap.org', ...(storeOrigin ? [storeOrigin] : [])],
				'font-src': ['self'],
				'connect-src': connectSrc,
				'frame-src': ['none'],
				'object-src': ['none'],
				'base-uri': ['self'],
				'form-action': ['none']
			}
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
