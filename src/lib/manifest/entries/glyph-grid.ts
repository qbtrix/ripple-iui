// Manifest entry for the glyph-grid widget (console telemetry pack, 2026-06-13).
// Updated 2026-07-08 (docs): description trimmed under 200 chars (manifest.test limit).
import type { WidgetManifestEntry } from '../index.js';

export const glyphGridEntry: WidgetManifestEntry = {
  type: 'glyph-grid',
  category: 'display',
  staticSafe: true,
  description:
    'N×N matrix of cells lit per a bitmap pattern — a 2D brightness array or a named glyph. Lit cells take the accent color with a subtle pulse (frozen under reduced-motion). Pure CSS, SSR-safe.',
  props: {
    pattern: { type: 'number[][]', required: false, description: '2D brightness grid (0 = unlit, 1..3 = lit intensity).' },
    glyph: { type: '"n1" | "nerve" | "paw" | "wave" | "check" | "block"', required: false, description: 'Named built-in glyph if no `pattern` given. Default "n1".' },
    cols: { type: 'number', required: false, description: 'Override grid columns (else derived from pattern width).' },
    rows: { type: 'number', required: false, description: 'Override grid rows.' },
    color: { type: 'string', required: false, description: 'Lit-cell color. Default the foreground token.' },
    cell: { type: 'number', required: false, description: 'Cell size in px. Default 14.' },
    pulse: { type: 'boolean', required: false, description: 'Animate a subtle lit-cell pulse. Default true.' },
  },
  example: {
    type: 'glyph-grid',
    props: { glyph: 'n1', color: '#2E6BFF', cell: 14 },
  },
};
