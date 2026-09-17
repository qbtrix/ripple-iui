// @file ui/status-text.test.ts
// @description NEW 2026-09-17 (fix/port-gaps). Status colours painted as text
//   failed WCAG AA in light mode: `text-ripple-error` on its own `/10` tint
//   measured 2.89:1, success 2.07:1, warning lower still. The tones are fill
//   colours; used as text on a light ground they are too pale.
//
//   Three guards:
//   1. theme.css publishes `--ripple-{tone}-text` for every status tone as a
//      blend of the tone toward the surface ink, and each reaches 4.5:1 on the
//      plain ground and on the tone's own /10 and /15 tints, under
//      paw-enterprise's light and dark tokens. The dark check runs twice for
//      error: with the alias to `--destructive`, and with paw-enterprise's
//      `.ripple-root` override to `--paw-error`.
//   2. No packaged component paints text with a raw tone
//      (`text-ripple-error`, `text-destructive`, …); it uses the `-text` token.
//   3. TaskRows' solid done/failed badges keep their white icon at 3:1, the
//      non-text threshold, against the fill.
//   4. UPDATED 2026-09-17: the destructive Button and ErrorState's action
//      button put a white label on solid red, 3.59:1 light and 2.89:1 dark.
//      Each darkens its fill toward black in its own scoped CSS (the host's
//      --destructive is left alone), at rest and on hover, and the label must
//      reach 4.5:1 in every state while hover stays distinct from rest.
import { test, expect } from 'vitest';
import { oklch, toRgb, mix, over, contrast, type Lab } from './__fixtures__/contrast.js';

const TONES = ['error', 'success', 'warning', 'info'] as const;
type Tone = (typeof TONES)[number];

// paw-enterprise src/styles/global.css. The ground is its --background, opaque.
type Host = { fg: Lab; ground: Lab } & Record<Tone, Lab>;
const common = {
  success: oklch(0.72, 0.17, 155),
  warning: oklch(0.8, 0.16, 80),
  info: oklch(0.7, 0.12, 250),
};
const HOSTS: Record<string, Host> = {
  light: { ...common, fg: oklch(0.15, 0.015, 260), ground: oklch(0.97, 0.005, 260), error: oklch(0.65, 0.22, 25) },
  'dark, --destructive': { ...common, fg: oklch(0.95, 0.005, 260), ground: oklch(0.13, 0.015, 260), error: oklch(0.704, 0.191, 22.216) },
  'dark, --paw-error': { ...common, fg: oklch(0.95, 0.005, 260), ground: oklch(0.13, 0.015, 260), error: oklch(0.65, 0.22, 25) },
};

async function read(path: string): Promise<string> {
  // vitest empties .css imports, `?raw` included. ripple's tsconfig has no node types.
  // @ts-ignore
  const { readFileSync } = await import('node:fs');
  return readFileSync(path, 'utf8');
}

test('every status tone has a text token that reaches 4.5:1 on its tint and the plain ground', async () => {
  const css = await read('src/lib/theme.css');
  const failures: string[] = [];
  for (const tone of TONES) {
    const decl = css.match(
      new RegExp(`--ripple-${tone}-text:\\s*color-mix\\(in oklab,\\s*var\\(--ripple-${tone}\\)\\s+([\\d.]+)%,\\s*var\\(--ripple-surface-foreground\\)\\)`)
    );
    // Without a token the text is the raw tone, so measure that: the failure
    // output then shows what shipped.
    if (!decl) failures.push(`--ripple-${tone}-text is not declared as a blend toward the surface ink`);
    else if (!css.includes(`--color-ripple-${tone}-text: var(--ripple-${tone}-text);`)) {
      failures.push(`--color-ripple-${tone}-text utility missing`);
    }
    const p = decl ? Number(decl[1]) / 100 : 1;
    for (const [name, h] of Object.entries(HOSTS)) {
      const ground = toRgb(h.ground);
      const text = toRgb(mix(h[tone], h.fg, p));
      const base = toRgb(h[tone]);
      for (const [where, bg] of [
        ['plain', ground],
        ['/10 tint', over(base, 0.1, ground)],
        ['/15 tint', over(base, 0.15, ground)],
      ] as const) {
        const ratio = contrast(text, bg);
        if (ratio < 4.5) failures.push(`${tone} ${name} ${where}: ${ratio.toFixed(2)}`);
      }
    }
  }
  expect(failures).toEqual([]);
});

const ALL_SVELTE = import.meta.glob('../**/*.svelte', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

test('no packaged component paints text with a raw status tone', () => {
  expect(Object.keys(ALL_SVELTE).length).toBeGreaterThan(300);
  const raw = /\btext-(?:ripple-(?:error|success|warning|info)|destructive)(?![\w-])/g;
  const offenders: string[] = [];
  for (const [rel, src] of Object.entries(ALL_SVELTE)) {
    const code = src
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    for (const m of code.matchAll(raw)) offenders.push(`${rel} ${m[0]}`);
  }
  expect(offenders).toEqual([]);
});

test("TaskRows' solid badges keep a white icon at 3:1 against the fill", async () => {
  const src = await read('src/lib/widgets/ai/TaskRows.svelte');
  const white = toRgb(oklch(1, 0, 0));
  const failures: string[] = [];
  for (const tone of ['success', 'error'] as const) {
    // A scoped fill rule that darkens the tone, if TaskRows has one; else the raw tone.
    const rule = src.match(
      new RegExp(`background(?:-color)?:\\s*color-mix\\(in oklab,\\s*var\\(--ripple-${tone}\\)\\s+([\\d.]+)%,\\s*black\\)`)
    );
    const p = rule ? Number(rule[1]) / 100 : 1;
    for (const [name, h] of Object.entries(HOSTS)) {
      const fill = toRgb(mix(h[tone], oklch(0, 0, 0), p));
      const ratio = contrast(white, fill);
      if (ratio < 3) failures.push(`${tone} badge ${name}: ${ratio.toFixed(2)}`);
    }
  }
  expect(failures).toEqual([]);
});

test('solid destructive buttons keep a white label at 4.5:1 at rest and on hover', async () => {
  // paw-enterprise --destructive, light and dark; --destructive-foreground is white in both.
  const RED: Record<string, Lab> = {
    light: oklch(0.65, 0.22, 25),
    dark: oklch(0.704, 0.191, 22.216),
  };
  const white = toRgb(oklch(1, 0, 0));
  const failures: string[] = [];
  for (const file of ['src/lib/widgets/input/Button.svelte', 'src/lib/widgets/overlay/ErrorState.svelte']) {
    const src = await read(file);
    const rules = [
      ...src.matchAll(
        /([^{}]*)\{\s*background-color:\s*color-mix\(in oklab,\s*var\(--destructive\)\s+([\d.]+)%,\s*black\);?\s*\}/g
      ),
    ].map((m) => ({ selector: m[1].trim(), p: Number(m[2]) / 100 }));
    const rest = rules.find((r) => !/:hover|:active/.test(r.selector));
    const hover = rules.find((r) => /:hover/.test(r.selector));
    if (!rest) failures.push(`${file}: no darkened rest fill`);
    if (!hover) failures.push(`${file}: no darkened hover fill`);
    if (rest && hover && rest.p === hover.p) failures.push(`${file}: hover fill equals rest`);
    const states = rules.length ? rules : [{ selector: 'raw --destructive', p: 1 }];
    for (const { selector, p } of states) {
      for (const [theme, red] of Object.entries(RED)) {
        const ratio = contrast(white, toRgb(mix(red, oklch(0, 0, 0), p)));
        if (ratio < 4.5) failures.push(`${file} ${selector} ${theme}: ${ratio.toFixed(2)}`);
      }
    }
  }
  expect(failures).toEqual([]);
});
