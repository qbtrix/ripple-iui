import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { pawbarEnv } from './src/lib/site/pawbar-env.js';
import pkg from './package.json' with { type: 'json' };

// The top bar's GitHub star count, fetched once per production build so the
// site never calls GitHub at runtime (CSP and the no-third-party rule). Any
// failure (offline, rate limit, slow) yields '' and the bar shows no number;
// it never fails the build. GITHUB_STARS_URL overrides the endpoint (point it
// at a dead port to prove the offline build).
async function githubStars(url = 'https://api.github.com/repos/qbtrix/ripple-iui'): Promise<string> {
	try {
		const res = await fetch(url, { signal: AbortSignal.timeout(3000), headers: { accept: 'application/vnd.github+json' } });
		const n = res.ok ? (await res.json()).stargazers_count : undefined;
		if (typeof n !== 'number') return '';
		return n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k` : String(n);
	} catch {
		return '';
	}
}

export default defineConfig(async ({ command, mode }) => {
	const env = loadEnv(mode, '.', 'PUBLIC_');
	const stars = command === 'build' ? await githubStars(loadEnv(mode, '.', 'GITHUB_STARS_').GITHUB_STARS_URL || undefined) : '';
	// Throws on a production build with Paw Bar vars set but no PUBLIC_PAWBAR_LIVE=1.
	const pawbar = pawbarEnv(env, mode);
	return {
		plugins: [tailwindcss(), sveltekit()],
		// Host config read at build time (the pages are prerendered, so $env/dynamic
		// can't serve it). /live's order demo posts to the test store:
		// PUBLIC_STORE_URL=http://localhost:3917/test-store bun run build:site
		// The landing chat replays recorded answers unless the live Paw Bar path is
		// switched on explicitly. Against the local mock (bun run dev:mock):
		// PUBLIC_PAWBAR_LIVE=1 PUBLIC_PAWBAR_ENDPOINT=http://localhost:5288 PUBLIC_PAWBAR_WIDGET_ID=demo PUBLIC_PAWBAR_SITE_KEY=demo
		define: {
			'import.meta.env.PUBLIC_STORE_URL': JSON.stringify(env.PUBLIC_STORE_URL || 'https://lab.pocketpaw.xyz/test-store'),
			'import.meta.env.PUBLIC_PAWBAR_LIVE': JSON.stringify(pawbar.live ? '1' : ''),
			'import.meta.env.PUBLIC_PAWBAR_ENDPOINT': JSON.stringify(pawbar.endpoint),
			'import.meta.env.PUBLIC_PAWBAR_WIDGET_ID': JSON.stringify(pawbar.widgetId),
			'import.meta.env.PUBLIC_PAWBAR_SITE_KEY': JSON.stringify(pawbar.siteKey),
			'import.meta.env.PUBLIC_GITHUB_STARS': JSON.stringify(stars),
			// Read here, not imported by the page: package.json sits outside the
			// dev server's fs.allow, so a page import works in the build but not in dev.
			'import.meta.env.PUBLIC_RIPPLE_VERSION': JSON.stringify(pkg.version)
		}
	};
});
