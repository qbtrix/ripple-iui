// site/docs/model.ts — Browser-safe constants and the "Copy for your model"
// text. Kept apart from content.ts, whose import.meta.glob would otherwise ship
// every page's markdown in the client bundle.

export const SITE_URL = 'https://ripple.pocketpaw.xyz';
export const SLIM_MANIFEST_URL = 'https://github.com/qbtrix/ripple-iui/releases/latest/download/manifest.slim.json';

/** The page markdown plus the line that tells a model where the widget catalog lives. */
export function forYourModel(markdown: string): string {
	return `${markdown.trimEnd()}\n\nRipple widget catalog (slim manifest): ${SLIM_MANIFEST_URL}\n`;
}
