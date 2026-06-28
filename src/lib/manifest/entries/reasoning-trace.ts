// @file manifest/entries/reasoning-trace.ts
// @description NEW (AI-native tier, 2026-06-24). Manifest entry for the
//   reasoning-trace widget — an agent's collapsible chain-of-thought steps.
import type { WidgetManifestEntry } from '../index.js';

export const reasoningTraceEntry: WidgetManifestEntry = {
  type: 'reasoning-trace',
  category: 'ai',
  description:
    "Agent reasoning trace. Collapsed shows \"Reasoned for N steps\"; expanded shows an ordered list of {title, detail?, status} steps. Active step shimmers. Collapsed by default.",
  props: {
    steps: { type: 'array', required: false, description: 'Ordered steps: array of { title, detail?, status: "thinking"|"done" }.' },
    streaming: { type: 'boolean', required: false, description: 'Agent is still reasoning — summary reads "Reasoning…".' },
    collapsed: { type: 'boolean', required: false, description: 'Initial collapsed state. Default true.' },
  },
  example: {
    type: 'reasoning-trace',
    props: {
      steps: [
        { title: 'Parse the request', status: 'done' },
        { title: 'Search the widget catalog', detail: 'Looking for a streaming-text primitive.', status: 'thinking' },
      ],
      streaming: true,
    },
  },
};
