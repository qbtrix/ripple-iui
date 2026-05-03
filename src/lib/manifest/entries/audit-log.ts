import type { WidgetManifestEntry } from '../index.js';

export const auditLogEntry: WidgetManifestEntry = {
  type: 'audit-log',
  category: 'vertical',
  description: 'Timeline of system events with actor, action, target, severity, and expandable details.',
  props: {
    entries: { type: 'Array<{ id: string | number; actor: string; actorIcon?: string; action: string; target?: string; timestamp?: string; details?: string | Record<string, unknown>; severity?: "info" | "warning" | "destructive" | "success" }>', required: true, description: 'Audit events.' },
    showDetails: { type: 'boolean', required: false, description: 'Allow expanding details. Default true.' },
  },
  example: {
    type: 'audit-log',
    props: {
      entries: [
        { id: '1', actor: 'Alice Johnson', action: 'created', target: 'workspace:acme-prod', timestamp: '2026-05-03 14:32 UTC', severity: 'success' },
        { id: '2', actor: 'Bob Smith', action: 'updated API key', target: 'key:sk_live_xyz', timestamp: '2026-05-03 13:15 UTC', severity: 'warning' },
        { id: '3', actor: 'System', action: 'deleted user', target: 'user:charlie@old.com', timestamp: '2026-05-03 12:00 UTC', severity: 'destructive' },
      ],
    },
  },
};
