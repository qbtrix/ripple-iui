import type { WidgetManifestEntry } from '../index.js';

export const terminalEntry: WidgetManifestEntry = {
  type: 'terminal',
  category: 'composite',
  description: 'Terminal emulator with stdout/stderr/info/command line types. Optional interactive command input.',
  props: {
    lines: { type: 'Array<{ text: string; type?: "stdout" | "stderr" | "info" | "command"; timestamp?: string }>', required: true, description: 'Terminal lines.' },
    interactive: { type: 'boolean', required: false, description: 'Show command input at bottom.' },
    maxHeight: { type: 'string', required: false, description: 'Max height before scrolling. Default "300px".' },
    title: { type: 'string', required: false, description: 'Window title shown in header bar.' },
  },
  example: {
    type: 'terminal',
    props: {
      title: 'Build Output',
      interactive: true,
      lines: [
        { text: 'npm run build', type: 'command' },
        { text: 'Building…', type: 'info' },
        { text: 'Build completed', type: 'stdout' },
      ],
    },
  },
};
