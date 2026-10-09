// lib/site/playground/theme.ts — Light or dark for the preview frame only.
// Why not just a `.dark` class on the frame: many tokens are aliases declared
// on :root only (`--ripple-surface: var(--card)` in lib/theme.css), and an
// alias is resolved where it is declared, so a nested .dark flips --card and
// leaves every --ripple-* alias on the page's theme. And a light frame inside
// a dark page has nothing to inherit from. So this collects every custom
// property the page's stylesheets declare on :root (plus .dark for dark) and
// the frame sets them inline: each alias is then resolved at the frame.
// Unlayered rules beat layered ones, as in the cascade; @media blocks are
// skipped. Ceiling: Tailwind `dark:` utilities follow the OS media query and
// `.dark x` descendant selectors follow the page, so neither obeys the frame.

export type Theme = 'light' | 'dark';

const ROOT = new Set([':root', ':where(:root)', ':host']);

function selectorsOf(rule: CSSStyleRule): string[] {
	return rule.selectorText.split(',').map((s) => s.trim());
}

function collect(rules: CSSRuleList, layered: boolean, want: (sel: string) => boolean, into: [Map<string, string>, Map<string, string>]) {
	for (const rule of Array.from(rules)) {
		if (typeof CSSStyleRule !== 'undefined' && rule instanceof CSSStyleRule) {
			if (!selectorsOf(rule).some(want)) continue;
			const target = into[layered ? 0 : 1];
			for (const name of Array.from(rule.style)) if (name.startsWith('--')) target.set(name, rule.style.getPropertyValue(name).trim());
		} else if (typeof CSSLayerBlockRule !== 'undefined' && rule instanceof CSSLayerBlockRule) {
			collect(rule.cssRules, true, want, into);
		}
	}
}

/** Inline style text that pins the frame to `theme`. Empty when the stylesheets cannot be read. */
export function themeStyle(theme: Theme, sheets: Iterable<CSSStyleSheet> = typeof document === 'undefined' ? [] : Array.from(document.styleSheets)): string {
	const want = (sel: string) => ROOT.has(sel) || (theme === 'dark' && sel === '.dark');
	const maps: [Map<string, string>, Map<string, string>] = [new Map(), new Map()];
	// Document order, as on <html class="dark">: :root and .dark weigh the same, so the later rule wins.
	for (const sheet of sheets) {
		try {
			collect(sheet.cssRules, false, want, maps);
		} catch {
			/* a cross-origin sheet: not ours */
		}
	}
	const vars = new Map([...maps[0], ...maps[1]]);
	if (!vars.size) return '';
	return [...vars].map(([k, v]) => `${k}: ${v}`).join('; ') + `; color-scheme: ${theme}`;
}
