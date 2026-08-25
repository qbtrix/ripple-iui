// src/lib/motion/load-tier1.ts
// @file motion/load-tier1.ts
// @description The ONLY module allowed to import motion.dev (`motion`). The
//   import is a CLIENT-ONLY dynamic import inside a function — never top-level
//   — because motion.dev touches window/document at import time and would
//   throw on the workerd SSR pass. The lint gate (scripts/check-no-toplevel-
//   anim-imports.ts) allowlists this file's dynamic import and bans all others.
// @created 2026-05-30 — RFC 12 animation primitive, Tier 1 engine.

/** Lazily import the motion.dev `animate` fn. Returns null on the server. */
export async function loadAnimate(): Promise<
  | ((el: Element, keyframes: Record<string, unknown>, options?: Record<string, unknown>) => { finished?: Promise<unknown>; stop?: () => void })
  | null
> {
  if (typeof window === 'undefined') return null;
  const mod = await import('motion');
  // motion.dev exposes `animate` at the package root.
  return (mod as { animate: typeof import('motion')['animate'] }).animate as never;
}

/** Lazily import the motion.dev `inView` observer. Returns null on the server. */
export async function loadInView(): Promise<
  | ((el: Element, onStart: (entry: { target: Element }) => void | (() => void), options?: Record<string, unknown>) => () => void)
  | null
> {
  if (typeof window === 'undefined') return null;
  const mod = await import('motion');
  return (mod as { inView: typeof import('motion')['inView'] }).inView as never;
}
