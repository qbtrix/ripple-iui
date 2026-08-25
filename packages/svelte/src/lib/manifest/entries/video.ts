// @file manifest/entries/video.ts
// @description Manifest entry for the `video` widget (VideoPlayer).
// @created 2026-05-31 — composite consumer widgets migration (ocean-flow port).
import type { WidgetManifestEntry } from '../index.js';

export const videoEntry: WidgetManifestEntry = {
  type: 'video',
  category: 'media',
  description:
    'Video player over a native video element: play/pause, seek, volume/mute, auto-hiding controls, fullscreen, and picture-in-picture.',
  props: {
    src: { type: 'string', required: true, description: 'Video source URL.' },
    poster: { type: 'string', required: false, description: 'Poster image shown before playback.' },
    title: { type: 'string', required: false, description: 'Title overlaid on the controls bar.' },
    autoplay: { type: 'boolean', required: false, description: 'Start playing on mount.' },
    muted: { type: 'boolean', required: false, description: 'Start muted.' },
    loop: { type: 'boolean', required: false, description: 'Loop playback.' },
    controls: { type: 'boolean', required: false, description: 'Show the custom controls bar. Default true.' },
  },
  example: {
    type: 'video',
    props: { src: 'https://example.com/clip.mp4', poster: 'https://example.com/poster.jpg', title: 'Demo Clip' },
  },
};
