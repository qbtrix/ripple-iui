// @file manifest/entries/model-viewer.ts
// @description Manifest entry for the `model-viewer` widget.
// @created 2026-05-22 — Increment 5 (escape-hatch widgets).
import type { WidgetManifestEntry } from '../index.js';

export const modelViewerEntry: WidgetManifestEntry = {
  type: 'model-viewer',
  category: 'media',
  description:
    'Declarative 3D model viewer for GLB/GLTF assets — orbit controls, AR, and environment lighting, all driven by props. The viewer module is lazy-loaded on first use.',
  props: {
    src: {
      type: 'string',
      required: true,
      description: 'GLB or GLTF model URL.',
    },
    poster: {
      type: 'string',
      required: false,
      description: 'Image shown before the model loads.',
    },
    alt: {
      type: 'string',
      required: false,
      description: 'Accessible description of the model.',
    },
    cameraControls: {
      type: 'boolean',
      required: false,
      description: 'Allow mouse / touch orbit and zoom. Default true.',
    },
    autoRotate: {
      type: 'boolean',
      required: false,
      description: 'Slowly rotate the model when idle. Default false.',
    },
    ar: {
      type: 'boolean',
      required: false,
      description: 'Enable the "View in your space" AR affordance where supported.',
    },
    environmentImage: {
      type: 'string',
      required: false,
      description: 'URL of an HDR / image-based lighting environment.',
    },
    exposure: {
      type: 'number',
      required: false,
      description: 'Scene exposure (1 = neutral).',
    },
    shadowIntensity: {
      type: 'number',
      required: false,
      description: 'Strength of the contact shadow under the model (0–1).',
    },
  },
  example: {
    type: 'model-viewer',
    props: {
      src: 'https://modelviewer.dev/shared-assets/models/Astronaut.glb',
      alt: 'A 3D model of an astronaut',
      cameraControls: true,
      autoRotate: true,
    },
  },
};
