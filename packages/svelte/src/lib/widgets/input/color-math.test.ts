// color-math: hex <-> rgb <-> hsv <-> cmyk round trips and edge cases.
import { describe, it, expect } from 'vitest';
import { cmykToRgb, hexToRgb, hsvToRgb, normalizeHex, rgbToCmyk, rgbToHex, rgbToHsv } from './color-math.js';

describe('color-math', () => {
  it('parses 3- and 6-digit hex, rejects junk', () => {
    expect(hexToRgb('#0052cc')).toEqual({ r: 0, g: 82, b: 204 });
    expect(hexToRgb('fff')).toEqual({ r: 255, g: 255, b: 255 });
    expect(hexToRgb('#12345')).toBeNull();
    expect(hexToRgb(null)).toBeNull();
    expect(normalizeHex('#ABC')).toBe('#aabbcc');
  });

  it('rgb -> hex clamps and pads', () => {
    expect(rgbToHex({ r: 0, g: 82, b: 204 })).toBe('#0052cc');
    expect(rgbToHex({ r: 300, g: -4, b: 15.6 })).toBe('#ff0010');
  });

  it('hsv round trips', () => {
    for (const hex of ['#0052cc', '#ff0000', '#00ff00', '#123456', '#ffffff', '#000000', '#808080']) {
      expect(rgbToHex(hsvToRgb(rgbToHsv(hexToRgb(hex)!)))).toBe(hex);
    }
    expect(rgbToHsv({ r: 255, g: 0, b: 0 })).toEqual({ h: 0, s: 1, v: 1 });
    expect(rgbToHsv({ r: 0, g: 0, b: 255 }).h).toBe(240);
  });

  it('cmyk conversions', () => {
    expect(rgbToCmyk({ r: 0, g: 0, b: 0 })).toEqual({ c: 0, m: 0, y: 0, k: 100 });
    expect(rgbToCmyk({ r: 255, g: 255, b: 255 })).toEqual({ c: 0, m: 0, y: 0, k: 0 });
    expect(rgbToCmyk({ r: 255, g: 0, b: 0 })).toEqual({ c: 0, m: 100, y: 100, k: 0 });
    expect(cmykToRgb({ c: 0, m: 100, y: 100, k: 0 })).toEqual({ r: 255, g: 0, b: 0 });
    expect(cmykToRgb({ c: 100, m: 60, y: 0, k: 20 })).toEqual({ r: 0, g: 82, b: 204 });
    expect(rgbToCmyk(cmykToRgb({ c: 100, m: 60, y: 0, k: 20 }))).toEqual({ c: 100, m: 60, y: 0, k: 20 });
  });
});
