// ruler-math: nice steps, labels, and tick positions across zoom levels and units.
import { describe, it, expect } from 'vitest';
import { formatTick, niceStep, rulerTicks } from './ruler-math.js';

describe('ruler-math', () => {
  it('picks 1/2/5 x 10^k steps', () => {
    expect(niceStep(0.3)).toBe(0.5);
    expect(niceStep(1.2)).toBe(2);
    expect(niceStep(3)).toBe(5);
    expect(niceStep(7)).toBe(10);
    expect(niceStep(64)).toBe(100);
    expect(niceStep(0.012)).toBeCloseTo(0.02);
  });

  it('formats without float noise or -0', () => {
    expect(formatTick(0.30000000000000004, 0.1)).toBe('0.3');
    expect(formatTick(-0, 1)).toBe('0');
    expect(formatTick(150, 50)).toBe('150');
  });

  it('points at zoom 1: labels every 100 pt, ticks land on the transform', () => {
    const t = rulerTicks(500, 20, 1);
    expect(t.step).toBe(100);
    expect(t.major.map((m) => m.label)).toEqual(['0', '100', '200', '300', '400']);
    expect(t.major[1].px).toBe(120); // pan + 100 * zoom
    expect(t.minor).toContain(30); // 10 subdivisions of 10 px
  });

  it('inches on a points document follow zoom', () => {
    // unitSize 72 (pt per inch); at zoom 2 an inch is 144 px, so labels go every half inch.
    const z2 = rulerTicks(600, 0, 2 * 72);
    expect(z2.step).toBe(0.5);
    expect(z2.major.slice(0, 3).map((m) => [m.px, m.label])).toEqual([[0, '0'], [72, '0.5'], [144, '1']]);
    // zoomed out to 0.25 an inch is 18 px, so labels go every 5 in.
    expect(rulerTicks(600, 0, 0.25 * 72).step).toBe(5);
    // zoomed in to 8, an inch is 576 px: labels every 0.2 in.
    const z8 = rulerTicks(600, 0, 8 * 72);
    expect(z8.step).toBeCloseTo(0.2);
    expect(z8.major[1].label).toBe('0.2');
  });

  it('mm with a negative pan labels negative values to the left of the origin', () => {
    const t = rulerTicks(400, 200, (72 / 25.4) * 1);
    expect(t.major.some((m) => m.label.startsWith('-'))).toBe(true);
    const zero = t.major.find((m) => m.label === '0')!;
    expect(zero.px).toBeCloseTo(200);
  });
});
