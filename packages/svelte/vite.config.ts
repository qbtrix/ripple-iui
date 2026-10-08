import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => ({
	plugins: [tailwindcss(), sveltekit()],
	// /live's order demo posts to this test store. Host config, read at build
	// time (the page is prerendered, so $env/dynamic can't serve it):
	// PUBLIC_STORE_URL=http://localhost:3917/test-store bun run build:site
	define: {
		'import.meta.env.PUBLIC_STORE_URL': JSON.stringify(
			loadEnv(mode, '.', 'PUBLIC_').PUBLIC_STORE_URL || 'https://lab.pocketpaw.xyz/test-store'
		)
	}
}));
