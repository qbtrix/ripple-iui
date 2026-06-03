import type { WidgetManifestEntry } from '../index.js';

export const commandPaletteEntry: WidgetManifestEntry = {
  type: 'command-palette',
  category: 'overlay',
  description: 'Searchable command palette with keyboard shortcuts, grouping, and global hotkey (default ⌘K).',
  props: {
    value: { type: 'boolean', required: false, description: 'Open state. Use with bind.' },
    commands: { type: 'Array<{ id: string; label: string; keywords?: string[]; icon?: string; shortcut?: string; group?: string; description?: string; disabled?: boolean }>', required: true, description: 'Command list.' },
    placeholder: { type: 'string', required: false, description: 'Search input placeholder.' },
    emptyText: { type: 'string', required: false, description: 'Empty-results text.' },
    shortcut: { type: 'string', required: false, description: 'Global hotkey. Default "mod+k".' },
  },
  example: {
    type: 'command-palette',
    props: {
      value: false,
      shortcut: 'mod+k',
      commands: [
        { id: 'create', label: 'Create document', keywords: ['new', 'doc'], icon: 'plus', group: 'Documents' },
        { id: 'search', label: 'Search', keywords: ['find'], icon: 'search', shortcut: 'mod+f', group: 'Navigation' },
      ],
    },
  },
  pocket: {
    state: { paletteOpen: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'button',
          props: { label: 'Open command palette', variant: 'secondary' },
          on_click: { action: 'open', target: 'paletteOpen' },
        },
        {
          type: 'command-palette',
          props: {
            shortcut: 'mod+k',
            commands: [
              { id: 'create', label: 'Create document', keywords: ['new', 'doc'], icon: 'plus', group: 'Documents' },
              { id: 'search', label: 'Search', keywords: ['find'], icon: 'search', shortcut: 'mod+f', group: 'Navigation' },
              { id: 'settings', label: 'Open settings', icon: 'settings', shortcut: 'mod+,', group: 'Navigation' },
            ],
          },
          bind: 'state.paletteOpen',
        },
      ],
    },
  },
};
