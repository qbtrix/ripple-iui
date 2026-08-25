// @file manifest/entries/stream-text.ts
// @description NEW (AI-native tier, 2026-06-24). Manifest entry for the
//   stream-text widget — progressive/streaming text render for agent output.
import type { WidgetManifestEntry } from '../index.js';

export const streamTextEntry: WidgetManifestEntry = {
  type: 'stream-text',
  category: 'ai',
  description:
    'Progressive/streaming text. Bind text to a growing state path for live agent streaming, or pass speed for a typewriter reveal. Blinking caret + aria-busy while streaming.',
  props: {
    text: { type: 'string', required: false, description: 'Text to render. Bind to a growing state path for live streaming.' },
    streaming: { type: 'boolean', required: false, description: 'Show the blinking caret + aria-busy. True while the agent is producing.' },
    markdown: { type: 'boolean', required: false, description: 'Render the revealed text as markdown (reuses the Markdown widget). Default false.' },
    speed: { type: 'number', required: false, description: 'Typewriter speed in chars/sec. When set, the string types itself in. Omit for verbatim render.' },
    done: { type: 'boolean', required: false, description: 'Streaming finished — clears busy/caret even if streaming was left true.' },
    size: { type: 'string', required: false, description: "Font size: 'sm' | 'md' | 'lg'. Default 'md'." },
  },
  example: {
    type: 'stream-text',
    props: { text: 'The agent is thinking through the request', streaming: true },
  },
};
