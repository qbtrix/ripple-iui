// @file manifest/entries/drawing-canvas.ts
// @description Manifest entry for the `drawing-canvas` widget.
// @created 2026-05-31 — composite consumer widgets migration (ocean-flow port).
import type { WidgetManifestEntry } from '../index.js';

export const drawingCanvasEntry: WidgetManifestEntry = {
  type: 'drawing-canvas',
  category: 'interactive',
  description:
    'Canvas 2D drawing pad with brush, eraser, color, size, undo/redo, clear, and PNG export. Supports mouse and touch. Exports via the on_save event.',
  props: {
    width: { type: 'number', required: false, description: 'Canvas width in px. Default 400.' },
    height: { type: 'number', required: false, description: 'Canvas height in px. Default 300.' },
    backgroundColor: { type: 'string', required: false, description: 'Background fill. Default "#ffffff".' },
    initialImage: { type: 'string', required: false, description: 'Data URL pre-loaded onto the canvas.' },
  },
  events: {
    on_save: { type: 'EventAction', required: false, description: 'Fired with a PNG data URL when the user exports.' },
  },
  example: {
    type: 'drawing-canvas',
    props: { width: 400, height: 300, backgroundColor: '#ffffff' },
  },
};
