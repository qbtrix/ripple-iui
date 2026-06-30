// @file manifest/entries/richtext.ts
// @description Manifest entry for the `richtext` DISPLAY widget — renders a
//   trusted rich-HTML string (e.g. TipTap StarterKit output) with prose styling.
//   The render half of the editor's rich-text inline edit (PIECE 1). Distinct
//   from the `rich-text` INPUT widget (WYSIWYG editor): `richtext` only paints
//   committed HTML; authoring happens via the visual editor's inline TipTap path.
// @created 2026-06-30 (editor chrome PIECE 1 — TipTap rich-HTML inline editing)
import type { WidgetManifestEntry } from '../index.js';

export const richtextEntry: WidgetManifestEntry = {
  type: 'richtext',
  category: 'display',
  // Renders to static markup (no client JS), so it is safe on prerendered pages.
  staticSafe: true,
  description: 'Render trusted rich HTML (e.g. TipTap StarterKit output) with prose styling. Authored inline by the visual editor.',
  props: {
    html: { type: 'string', required: false, description: 'Trusted rich HTML string (e.g. TipTap output).' },
  },
  example: {
    type: 'richtext',
    props: { html: '<p>Rich <strong>HTML</strong> content with a <em>list</em>:</p><ul><li>one</li><li>two</li></ul>' },
  },
};
