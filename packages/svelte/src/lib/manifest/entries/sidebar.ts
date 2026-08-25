import type { WidgetManifestEntry } from '../index.js';

export const sidebarEntry: WidgetManifestEntry = {
  type: 'sidebar',
  category: 'layout',
  description: 'Navigation sidebar with grouped items, icons, badges, and optional footer. Pair with app-shell.',
  props: {
    title: { type: 'string', required: false, description: 'Sidebar title.' },
    items: { type: 'Array<{ label: string; icon?: string; href?: string; group?: string; active?: boolean; badge?: string; value?: string }>', required: true, description: 'Navigation items.' },
    value: { type: 'string', required: false, description: 'Currently selected item value.' },
  },
  example: {
    type: 'sidebar',
    props: {
      title: 'Workspace',
      items: [
        { label: 'Inbox', icon: 'inbox', value: 'inbox', badge: '3' },
        { label: 'Projects', icon: 'folder', value: 'projects' },
        { label: 'Settings', icon: 'settings', value: 'settings' },
      ],
      value: 'inbox',
    },
  },
};
