// lib/site/pawbar-env.ts — Reads the landing chat's Paw Bar config from the build env.
// The live path is opt-in: it is on only when PUBLIC_PAWBAR_LIVE=1, and then
// the endpoint, widget id and site key must all be set. Without the flag every
// value comes back empty, so vite.config.ts defines nothing live and
// svelte.config.js adds no Paw Bar origin to the CSP. A production build that
// has any other PUBLIC_PAWBAR_* var set without the flag throws: a half-set
// env should fail the build, not ship quietly with the live path off.
// Pure, so vite.config.ts can import it and the guard has its own unit test.

export interface PawbarEnv {
	live: boolean;
	endpoint: string;
	widgetId: string;
	siteKey: string;
}

export function pawbarEnv(env: Record<string, string | undefined>, mode: string): PawbarEnv {
	const live = env.PUBLIC_PAWBAR_LIVE === '1';
	if (!live) {
		const stray = Object.keys(env).filter((k) => k.startsWith('PUBLIC_PAWBAR_') && k !== 'PUBLIC_PAWBAR_LIVE' && env[k]);
		if (mode === 'production' && stray.length)
			throw new Error(
				`${stray.join(', ')} set without PUBLIC_PAWBAR_LIVE=1. The landing chat's live Paw Bar path is opt-in: ` +
					'set PUBLIC_PAWBAR_LIVE=1 to enable it, or unset these to ship the recorded replay.'
			);
		return { live: false, endpoint: '', widgetId: '', siteKey: '' };
	}
	const cfg = {
		live: true,
		endpoint: env.PUBLIC_PAWBAR_ENDPOINT ?? '',
		widgetId: env.PUBLIC_PAWBAR_WIDGET_ID ?? '',
		siteKey: env.PUBLIC_PAWBAR_SITE_KEY ?? ''
	};
	if (mode === 'production' && !(cfg.endpoint && cfg.widgetId && cfg.siteKey))
		throw new Error(
			'PUBLIC_PAWBAR_LIVE=1 needs PUBLIC_PAWBAR_ENDPOINT, PUBLIC_PAWBAR_WIDGET_ID and PUBLIC_PAWBAR_SITE_KEY.'
		);
	return cfg;
}
