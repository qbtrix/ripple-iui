import type { WidgetManifestEntry } from '../index.js';

export const commandPaletteEntry: WidgetManifestEntry = {
  type: 'command-palette',
  category: 'overlay',
  description: 'Searchable palette over commands and content: grouped sections, fuzzy search over labels, aliases and menu paths, recents, global hotkey (default ⌘K).',
  props: {
    value: { type: 'boolean', required: false, description: 'Open state. Use with bind.' },
    commands: { type: 'Array<{ id: string; label: string; group?: string; aliases?: string[]; keywords?: string[]; menu?: string; description?: string; shortcut?: string; icon?: string; thumb?: string; disabled?: boolean }>', required: true, description: 'Items: commands and content. group makes sections; thumb is an image URL.' },
    groups: { type: 'string[]', required: false, description: 'Section order by group name.' },
    recent: { type: 'string[]', required: false, description: 'Recently used ids, shown first on an empty query.' },
    slash: { type: 'boolean', required: false, description: 'Also open on "/" outside text fields.' },
    limit: { type: 'number', required: false, description: 'Most rows rendered for a query. Default 50.' },
    groupLimit: { type: 'number', required: false, description: 'Rows per section on an empty query. Default 6.' },
    loading: { type: 'boolean', required: false, description: 'Show a Searching row (async sources).' },
    placeholder: { type: 'string', required: false, description: 'Search input placeholder.' },
    emptyText: { type: 'string', required: false, description: 'Empty-results text.' },
    shortcut: { type: 'string', required: false, description: 'Global hotkey. Default "mod+k"; "" turns it off.' },
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
