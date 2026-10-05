// widgets/input/color-math.ts
// Pure colour conversions behind ColorPicker: hex <-> RGB (0-255) <-> HSV
// (h 0-360, s/v 0-1) and naive device CMYK (0-100, no ICC profile). CMYK from
// RGB is the simple k = 1 - max formula; a print host that stores exact CMYK
// passes it to the picker instead of relying on this round trip.

export interface Rgb { r: number; g: number; b: number }
export interface Hsv { h: number; s: number; v: number }
export interface Cmyk { c: number; m: number; y: number; k: number }

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** '#abc' or '#aabbcc' (with or without '#') -> RGB, else null. */
export function hexToRgb(hex: string | null | undefined): Rgb | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((hex ?? '').trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  const n = parseInt(h, 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  return '#' + [r, g, b].map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('');
}

/** Lower-case 6-digit '#rrggbb', or null when not a hex colour. */
export function normalizeHex(hex: string | null | undefined): string | null {
  const rgb = hexToRgb(hex);
  return rgb ? rgbToHex(rgb) : null;
}

export function rgbToHsv({ r, g, b }: Rgb): Hsv {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const max = Math.max(R, G, B);
  const d = max - Math.min(R, G, B);
  let h = 0;
  if (d) {
    if (max === R) h = ((G - B) / d) % 6;
    else if (max === G) h = (B - R) / d + 2;
    else h = (R - G) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max };
}

export function hsvToRgb({ h, s, v }: Hsv): Rgb {
  const f = (n: number) => {
    const k = (n + h / 60) % 6;
    return Math.round((v - v * s * Math.max(0, Math.min(k, 4 - k, 1))) * 255);
  };
  return { r: f(5), g: f(3), b: f(1) };
}

export function rgbToCmyk({ r, g, b }: Rgb): Cmyk {
  const [R, G, B] = [r / 255, g / 255, b / 255];
  const k = 1 - Math.max(R, G, B);
  if (k >= 1) return { c: 0, m: 0, y: 0, k: 100 };
  const p = (x: number) => Math.round(((1 - x - k) / (1 - k)) * 100);
  return { c: p(R), m: p(G), y: p(B), k: Math.round(k * 100) };
}

export function cmykToRgb({ c, m, y, k }: Cmyk): Rgb {
  const K = 1 - clamp(k, 0, 100) / 100;
  const ch = (x: number) => Math.round(255 * (1 - clamp(x, 0, 100) / 100) * K);
  return { r: ch(c), g: ch(m), b: ch(y) };
}
