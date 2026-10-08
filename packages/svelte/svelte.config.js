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
// attributes and transitions inject <style>. connect-src lists the Paw Bar API
// and /live's test store, read at build time like vite.config.ts does; dev adds
// localhost for the mock and Vite's HMR socket. img-src allows the two image
// hosts the showcase uses (its news feed's favicon service stays blocked).
// 'unsafe-hashes' plus one hash admits exactly the `this.__e=event` attribute
// Svelte's SSR puts on <img> so hydration can replay a load event.
// frame-ancestors cannot be set from a meta tag.
const dev = process.env.NODE_ENV !== 'production';
const env = loadEnv(dev ? 'development' : 'production', process.cwd(), 'PUBLIC_');
const originOf = (url) => {
	try {
		return new URL(url).origin;
	} catch {
		return null;
	}
};
const connectSrc = [
	'self',
	originOf(env.PUBLIC_PAWBAR_ENDPOINT),
	originOf(env.PUBLIC_STORE_URL || 'https://lab.pocketpaw.xyz/test-store'),
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
			handleHttpError: 'warn',
			handleMissingId: 'warn'
		},
		csp: {
			mode: 'hash',
			directives: {
				'default-src': ['self'],
				'script-src': ['self', 'unsafe-hashes', 'sha256-7dQwUgLau1NFCCGjfn9FsYptB6ZtWxJin6VohGIu20I='],
				'style-src': ['self', 'unsafe-inline'],
				'img-src': ['self', 'data:', 'https://images.unsplash.com', 'https://i.pravatar.cc'],
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
