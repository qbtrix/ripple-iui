// src/lib/widgets/display/CodeBlock.contrast.test.ts
// Created 2026-09-17 (fix/port-gaps). Strings and numbers in a CodeBlock
// measured ~1.8:1 in light mode, and ToolCall's JSON arguments inherit them.
// They were painted `text-ripple-warning`: a status fill colour at oklch L 0.80,
// right for a badge tint and too pale to be text on a light surface.
//
// jsdom has no Tailwind and no cascade, so this resolves the colour by hand: a
// rule in the component's own style block that names one of the span's classes,
// bare or inside :global(), wins (it is unlayered, so it beats any utility);
// otherwise the span's `text-ripple-*` utility applies. That colour is then measured against the
// page ground under paw-enterprise's real light and dark tokens, and must reach
// WCAG AA for body text, 4.5:1, in both.
// UPDATED 2026-09-17 (fix/port-gaps, second pass): keywords are covered too.
//   They painted `text-ripple-accent` (paw-enterprise `--primary`,
//   oklch(0.533 0.26 262.6)), which measured 3.59:1 on the dark ground.
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import CodeBlock from './CodeBlock.svelte';

const SOURCE = Object.values(
  import.meta.glob('./CodeBlock.svelte', { query: '?raw', import: 'default', eager: true })
)[0] as string;

type Oklch = [number, number, number];
// paw-enterprise src/styles/global.css. Inside its .ripple-root, --ripple-warning
// is --paw-warning and CodeBlock's surface is transparent, so the ground is the
// page's --background (made opaque here).
const HOST: Record<'light' | 'dark', Record<string, Oklch>> = {
  light: {
    'ripple-warning': [0.8, 0.16, 80],
    'ripple-accent': [0.533, 0.26, 262.6],
    'ripple-surface-foreground': [0.15, 0.015, 260],
    ground: [0.97, 0.005, 260],
  },
  dark: {
    'ripple-warning': [0.8, 0.16, 80],
    'ripple-accent': [0.533, 0.26, 262.6],
    'ripple-surface-foreground': [0.95, 0.005, 260],
    ground: [0.13, 0.015, 260],
  },
};

type Oklab = [number, number, number];
const toLab = ([l, c, h]: Oklch): Oklab => [
  l,
  c * Math.cos((h * Math.PI) / 180),
  c * Math.sin((h * Math.PI) / 180),
];

/** WCAG relative luminance of an oklab colour (sRGB gamut, clamped). */
function luminance([L, a, b]: Oklab): number {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const clamp = (v: number) => Math.min(1, Math.max(0, v));
  const r = clamp(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s);
  const g = clamp(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s);
  const bl = clamp(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
}

const contrast = (x: Oklab, y: Oklab) => {
  const [hi, lo] = [luminance(x), luminance(y)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
};

/** `var(--token)` or `color-mix(in oklab, var(--a) P%, var(--b))`, resolved to oklab. */
function resolve(css: string, theme: 'light' | 'dark'): Oklab {
  const token = (name: string) => {
    const v = HOST[theme][name];
    if (!v) throw new Error(`no host value for --${name}`);
    return toLab(v);
  };
  const mix = css.match(/color-mix\(\s*in oklab\s*,\s*var\(--([\w-]+)\)\s+([\d.]+)%\s*,\s*var\(--([\w-]+)\)\s*\)/);
  if (mix) {
    const p = Number(mix[2]) / 100;
    const [a, b] = [token(mix[1]), token(mix[3])];
    return [0, 1, 2].map((i) => a[i] * p + b[i] * (1 - p)) as Oklab;
  }
  const single = css.match(/^var\(--([\w-]+)\)$/);
  if (single) return token(single[1]);
  throw new Error(`cannot resolve colour: ${css}`);
}

/** The colour a highlighted span actually paints with. */
function inkOf(span: Element): string {
  const style = SOURCE.match(/<style>([\s\S]*?)<\/style>/)?.[1] ?? '';
  const classes = (span.getAttribute('class') ?? '').split(/\s+/);
  for (const c of classes) {
    const rule = style.match(new RegExp(`\\.${c}\\)?\\s*\\{[^}]*?[^-]color:\\s*([^;]+);`));
    if (rule) return rule[1].trim();
  }
  const utility = classes.map((c) => c.match(/^text-(ripple-[a-z-]+)$/)?.[1]).find(Boolean);
  if (!utility) throw new Error(`no colour on span: ${classes.join(' ')}`);
  return `var(--${utility})`;
}

describe('CodeBlock literal contrast', () => {
  const { container } = render(CodeBlock, {
    props: { code: '{"name": "pistachio", "count": 42, "ok": true}', language: 'json' },
  });
  const spans = Array.from(container.querySelectorAll('code span'));
  const span = (text: string) => spans.find((el) => el.textContent === text)!;

  for (const theme of ['light', 'dark'] as const) {
    it(`strings, numbers and keywords reach 4.5:1 on the ${theme} ground`, () => {
      const ground = toLab(HOST[theme].ground);
      for (const text of ['"pistachio"', '42', 'true']) {
        const ratio = contrast(resolve(inkOf(span(text)), theme), ground);
        expect(ratio, `${text} in ${theme}`).toBeGreaterThanOrEqual(4.5);
      }
    });
  }
});
