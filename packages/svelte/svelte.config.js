// svelte.config.js: one config for two builds. `bun run build` packages the
// library with svelte-package (the adapter is not involved). `bun run
// build:site` runs vite build, and adapter-static writes the public site
// (landing, playground, showcase) to build/ for the Workers static-assets
// deploy in wrangler.jsonc. Routes are prerendered where they can be; a page
// that fails to prerender is warned about and served by the 404.html SPA shell,
// which boots the client router on that URL.
import adapter from '@sveltejs/adapter-static';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({ fallback: '404.html' }),
		prerender: {
			handleHttpError: 'warn',
			handleMissingId: 'warn'
		}
	},
	vitePlugin: {
		dynamicCompileOptions: ({ filename }) =>
			filename.includes('node_modules') ? undefined : { runes: true }
	}
};

export default config;
