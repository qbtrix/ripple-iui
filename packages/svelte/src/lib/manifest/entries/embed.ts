// @file manifest/entries/embed.ts
// @description Manifest entry for the `embed` widget.
// @created 2026-05-22 — Increment 5 (escape-hatch widgets).
import type { WidgetManifestEntry } from '../index.js';

export const embedEntry: WidgetManifestEntry = {
  type: 'embed',
  category: 'media',
  description:
    'Sandboxed iframe escape hatch — embeds a remote https URL or an inline srcdoc document. The iframe sandbox is renderer-controlled; the spec cannot widen it. Frame runs at an opaque origin.',
  props: {
    mode: {
      type: '"url" | "srcdoc"',
      required: true,
      description: 'Embed a remote page (`url`) or an inline document (`srcdoc`).',
    },
    url: {
      type: 'string',
      required: false,
      description: 'Remote page URL — used when mode=url. Must be https://.',
    },
    srcdoc: {
      type: 'string',
      required: false,
      description: 'Inline HTML document — used when mode=srcdoc. Capped at 64KB.',
    },
    title: {
      type: 'string',
      required: true,
      description: 'Accessible title for the iframe.',
    },
    height: {
      type: 'number',
      required: false,
      description: 'Fixed height in px. Ignored when aspectRatio is set.',
    },
    aspectRatio: {
      type: 'string',
      required: false,
      description: 'Aspect ratio such as "16 / 9". Wins over height.',
    },
    allow: {
      type: 'string[]',
      required: false,
      description:
        'Permissions-policy tokens. Only fullscreen, autoplay, encrypted-media, picture-in-picture are honored; anything else is dropped.',
    },
  },
  example: {
    type: 'embed',
    props: {
      mode: 'url',
      url: 'https://www.youtube.com/embed/dQw4w9WgXcQ',
      title: 'Embedded video',
      aspectRatio: '16 / 9',
      allow: ['fullscreen', 'encrypted-media'],
    },
  },
};
