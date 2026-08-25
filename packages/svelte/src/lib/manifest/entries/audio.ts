// @file manifest/entries/audio.ts
// @description Manifest entry for the `audio` widget (AudioPlayer).
// @created 2026-05-31 — composite consumer widgets migration (ocean-flow port).
import type { WidgetManifestEntry } from '../index.js';

export const audioEntry: WidgetManifestEntry = {
  type: 'audio',
  category: 'media',
  description:
    'Audio player over a native audio element: play/pause, seek, volume/mute, skip ±10s, with cover art and title. Optional decorative bar strip.',
  props: {
    src: { type: 'string', required: true, description: 'Audio source URL.' },
    title: { type: 'string', required: false, description: 'Track title. Default "Audio Track".' },
    artist: { type: 'string', required: false, description: 'Artist / author line.' },
    cover: { type: 'string', required: false, description: 'Cover art image URL.' },
    autoplay: { type: 'boolean', required: false, description: 'Start playing on mount.' },
    showWaveform: { type: 'boolean', required: false, description: 'Render a static decorative bar strip.' },
  },
  example: {
    type: 'audio',
    props: { src: 'https://example.com/track.mp3', title: 'Ambient Loop', artist: 'Unknown', showWaveform: true },
  },
};
