// src/lib/systems/variable-font-weight.ts
// @file systems/variable-font-weight.ts
// @description Variable-font weight transition. Animates
//   `font-variation-settings: 'wght' N` for a smooth weight change.
// @provenance Ported from Fluid Functionalism (github.com/mickadesign/
//   fluid-functionalism, MIT) — systems only.
// @created 2026-05-30 — RFC 12 premium pack, FF systems layer.

export function wghtStyle(weight: number): string {
  return `font-variation-settings: 'wght' ${weight}`;
}

export interface AnimateWghtOptions { from: number; to: number; durationMs?: number; trigger?: 'hover' | 'none'; }

/** Svelte action: tween the font weight on hover (or set the resting weight). */
export function animateWght(node: HTMLElement, opts: AnimateWghtOptions) {
  let options = opts;
  const set = (w: number) => node.style.setProperty('font-variation-settings', `'wght' ${w}`);
  set(options.from);
  node.style.transition = `${node.style.transition ? node.style.transition + ', ' : ''}font-variation-settings ${options.durationMs ?? 200}ms ease`;
  const enter = () => set(options.to);
  const leave = () => set(options.from);
  const hoverEnabled = (options.trigger ?? 'hover') === 'hover';
  if (hoverEnabled) {
    node.addEventListener('mouseenter', enter);
    node.addEventListener('mouseleave', leave);
  }
  return {
    update(next: AnimateWghtOptions) { options = next; set(options.from); },
    destroy() {
      if (hoverEnabled) { node.removeEventListener('mouseenter', enter); node.removeEventListener('mouseleave', leave); }
    },
  };
}
