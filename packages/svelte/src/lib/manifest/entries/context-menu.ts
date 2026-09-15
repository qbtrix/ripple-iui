import type { WidgetManifestEntry } from '../index.js';

export const contextMenuEntry: WidgetManifestEntry = {
  type: 'context-menu',
  category: 'overlay',
  description: 'Right-click context menu with items, icons, shortcuts, and separators.',
  props: {
    items: { type: 'Array<{ label?: string; icon?: string; value?: unknown; variant?: string; disabled?: boolean; type?: "separator" | "item"; shortcut?: string }>', required: true, description: 'Menu items.' },
    trigger: { type: 'string | UISpec', required: false, description: 'Right-clickable trigger.' },
  },
  example: {
    type: 'context-menu',
    props: {
      trigger: 'Right-click row',
      items: [
        { label: 'Cut', icon: 'scissors', value: 'cut', shortcut: '⌘X' },
        { label: 'Copy', icon: 'copy', value: 'copy', shortcut: '⌘C' },
        { label: 'Paste', icon: 'clipboard', value: 'paste', shortcut: '⌘V' },
        { type: 'separator' },
        { label: 'Delete', icon: 'trash-2', value: 'delete', variant: 'destructive' },
      ],
    },
  },
};
