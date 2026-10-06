// widgets/craft/ruler-math.ts
// Tick layout for CanvasViewport's rulers. A ruler maps screen pixel s to the
// ruler value (s - pan) / pxPerUnit, where pxPerUnit = zoom * unitSize (screen
// px per ruler unit; unitSize = document units per ruler unit, e.g. 72 for
// inches on a points document). The labelled step is the smallest 1/2/5 x 10^k
// whose spacing is at least `minMajorPx`; minor ticks subdivide it while they
// stay at least 5 px apart.

export interface RulerTicks {
  /** Units between labelled ticks. */
  step: number;
  major: { px: number; label: string }[];
  minor: number[];
}

export function niceStep(minUnits: number): number {
  const p = 10 ** Math.floor(Math.log10(Math.max(minUnits, 1e-9)));
  for (const m of [1, 2, 5, 10]) if (m * p >= minUnits - 1e-12) return m * p;
  return 10 * p;
}

export function formatTick(v: number, step: number): string {
  const decimals = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
  const n = +v.toFixed(decimals);
  return String(n === 0 ? 0 : n);
}

export function rulerTicks(length: number, pan: number, pxPerUnit: number, minMajorPx = 64): RulerTicks {
  const ppu = Math.max(pxPerUnit, 1e-9);
  const step = niceStep(minMajorPx / ppu);
  const lead = Math.round(step / 10 ** Math.floor(Math.log10(step) + 1e-9));
  const divs = (lead === 2 ? [4, 2] : lead === 5 ? [5] : [10, 5, 2]).find((d) => (step * ppu) / d >= 5) ?? 1;
  const start = (0 - pan) / ppu;
  const end = (length - pan) / ppu;
  const major: RulerTicks['major'] = [];
  const minor: number[] = [];
  const first = Math.floor(start / step);
  const last = Math.ceil(end / step);
  for (let i = first; i <= last && major.length < 500; i++) {
    const v = i * step;
    const px = pan + v * ppu;
    if (px >= -1 && px <= length + 1) major.push({ px, label: formatTick(v, step) });
    for (let j = 1; j < divs; j++) {
      const mpx = pan + (v + (step * j) / divs) * ppu;
      if (mpx >= 0 && mpx <= length) minor.push(mpx);
    }
  }
  return { step, major, minor };
}
