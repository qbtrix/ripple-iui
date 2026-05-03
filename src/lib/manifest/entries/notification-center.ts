import type { WidgetManifestEntry } from '../index.js';

export const notificationCenterEntry: WidgetManifestEntry = {
  type: 'notification-center',
  category: 'overlay',
  description: 'Notification inbox with read tracking, unread badge, mark-all-read, and optional inline mode.',
  props: {
    value: { type: 'Array<{ id: string | number; title: string; description?: string; severity?: "info" | "success" | "warning" | "error"; read?: boolean }>', required: true, description: 'Notifications.' },
    title: { type: 'string', required: false, description: 'Panel title.' },
    emptyText: { type: 'string', required: false, description: 'Empty-state text.' },
    inline: { type: 'boolean', required: false, description: 'Hide bell trigger; render inline.' },
  },
  example: {
    type: 'notification-center',
    props: {
      title: 'Notifications',
      value: [
        { id: 1, title: 'Document shared', description: 'Sarah shared a document with you', severity: 'info', read: false },
        { id: 2, title: 'Payment received', description: 'Invoice #2024-001 paid', severity: 'success', read: true },
      ],
    },
  },
};
