import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, '.', 'PUBLIC_');
	return {
		plugins: [tailwindcss(), sveltekit()],
		// Host config read at build time (the pages are prerendered, so $env/dynamic
		// can't serve it). /live's order demo posts to the test store:
		// PUBLIC_STORE_URL=http://localhost:3917/test-store bun run build:site
		// The landing chat calls the Paw Bar API; with any of the three unset it
		// replays recorded answers instead. Against the local mock (bun run dev:mock):
		// PUBLIC_PAWBAR_ENDPOINT=http://localhost:5288 PUBLIC_PAWBAR_WIDGET_ID=demo PUBLIC_PAWBAR_SITE_KEY=demo
		// Typed text opens Paw OS (PUBLIC_PAWOS_URL); add PUBLIC_TYPED_LOCAL=1 with a
		// localhost endpoint to keep it on the local Paw Bar instead.
		define: {
			'import.meta.env.PUBLIC_STORE_URL': JSON.stringify(env.PUBLIC_STORE_URL || 'https://lab.pocketpaw.xyz/test-store'),
			'import.meta.env.PUBLIC_PAWBAR_ENDPOINT': JSON.stringify(env.PUBLIC_PAWBAR_ENDPOINT || ''),
			'import.meta.env.PUBLIC_PAWBAR_WIDGET_ID': JSON.stringify(env.PUBLIC_PAWBAR_WIDGET_ID || ''),
			'import.meta.env.PUBLIC_PAWBAR_SITE_KEY': JSON.stringify(env.PUBLIC_PAWBAR_SITE_KEY || ''),
			'import.meta.env.PUBLIC_PAWOS_URL': JSON.stringify(env.PUBLIC_PAWOS_URL || 'https://os.pocketpaw.xyz'),
			'import.meta.env.PUBLIC_TYPED_LOCAL': JSON.stringify(env.PUBLIC_TYPED_LOCAL || '')
		}
	};
});
