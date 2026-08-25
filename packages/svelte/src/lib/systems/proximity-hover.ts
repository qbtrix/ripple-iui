// src/lib/systems/proximity-hover.ts
// @file systems/proximity-hover.ts
// @description Proximity-hover action — exposes a 0..1 `--proximity` CSS
//   custom property based on how close the cursor is to the element. CSS
//   consumes it (e.g. `opacity: calc(0.6 + 0.4 * var(--proximity))`).
//   rAF-throttled; transform-aware via getBoundingClientRect.
// @provenance Ported from Fluid Functionalism (github.com/mickadesign/
//   fluid-functionalism, MIT) — systems only.
// @created 2026-05-30 — RFC 12 premium pack, FF systems layer.

/** Linear proximity 1 (touching) → 0 (at/over radius). Pure. */
export function proximity(distance: number, radius: number): number {
  if (radius <= 0) return 0;
  return Math.max(0, Math.min(1, 1 - distance / radius));
}

export interface ProximityHoverOptions { radius?: number; }

export function proximityHover(node: HTMLElement, opts: ProximityHoverOptions = {}) {
  let radius = opts.radius ?? 200;
  let frame = 0;
  let pending: { x: number; y: number } | null = null;
  node.style.setProperty('--proximity', '0');

  const compute = () => {
    frame = 0;
    if (!pending) return;
    const rect = node.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = pending.x - cx;
    const dy = pending.y - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    node.style.setProperty('--proximity', String(proximity(dist, radius)));
  };

  const onMove = (e: PointerEvent) => {
    pending = { x: e.clientX, y: e.clientY };
    if (!frame) frame = requestAnimationFrame(compute);
  };

  window.addEventListener('pointermove', onMove);

  return {
    update(next: ProximityHoverOptions) { radius = next.radius ?? 200; },
    destroy() {
      window.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    },
  };
}
