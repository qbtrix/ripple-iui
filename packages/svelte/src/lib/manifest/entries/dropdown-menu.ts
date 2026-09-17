import type { WidgetManifestEntry } from '../index.js';

export const dropdownMenuEntry: WidgetManifestEntry = {
  type: 'dropdown-menu',
  category: 'overlay',
  description: 'Dropdown menu with items, icons, shortcuts, and separators. Emits onchange with selected item value.',
  props: {
    label: { type: 'string', required: false, description: 'Trigger button label.' },
    triggerVariant: { type: '"default" | "outline" | "ghost" | "secondary"', required: false, description: 'Trigger button style.' },
    items: { type: 'Array<{ label?: string; icon?: string; value?: unknown; variant?: string; disabled?: boolean; type?: "separator" | "item"; shortcut?: string }>', required: true, description: 'Menu items.' },
    side: { type: '"top" | "right" | "bottom" | "left"', required: false, description: 'Popover position.' },
    align: { type: '"start" | "center" | "end"', required: false, description: 'Alignment.' },
    hideChevron: { type: 'boolean', required: false, description: 'Hide trailing chevron.' },
  },
  example: {
    type: 'dropdown-menu',
    props: {
      label: 'Actions',
      items: [
        { label: 'Edit', icon: 'edit', value: 'edit' },
        { label: 'Duplicate', icon: 'copy', value: 'duplicate' },
        { type: 'separator' },
        { label: 'Delete', icon: 'trash-2', value: 'delete', variant: 'destructive' },
      ],
    },
  },
};
