import type { WidgetManifestEntry } from '../index.js';

export const auditLogEntry: WidgetManifestEntry = {
  type: 'audit-log',
  category: 'vertical',
  description: 'Timeline of events with actor, action, target, severity, type. Supports filter chips, day/week grouping, expandable details, and selectable rows for a side detail panel.',
  props: {
    entries: { type: 'Array<{ id: string | number; actor: string; actorIcon?: string; action: string; target?: string; timestamp?: string; type?: string; details?: string | Record<string, unknown>; severity?: "info" | "warning" | "destructive" | "success" }>', required: true, description: 'Audit events. `type` (e.g. "auth", "billing") enables type-filter chips.' },
    showDetails: { type: 'boolean', required: false, description: 'Allow expanding details. Default true.' },
    groupBy: { type: '"none" | "day" | "week"', required: false, description: 'Group entries by their timestamp granularity. Default "none". Requires parsable `timestamp` strings.' },
    showFilters: { type: 'boolean', required: false, description: 'Render a filter chip bar (type, severity, actor) above the list. Default false.' },
    selectedId: { type: 'string | number', required: false, description: 'Highlights a row. Pair with `onSelectId` (or use bind) to drive a side detail panel.' },
  },
  example: {
    type: 'audit-log',
    props: {
      groupBy: 'day',
      showFilters: true,
      entries: [
        { id: '1', actor: 'Alice Johnson', action: 'created', target: 'workspace:acme-prod', type: 'workspace', timestamp: '2026-05-03 14:32 UTC', severity: 'success' },
        { id: '2', actor: 'Bob Smith', action: 'updated API key', target: 'key:sk_live_xyz', type: 'auth', timestamp: '2026-05-03 13:15 UTC', severity: 'warning' },
        { id: '3', actor: 'System', action: 'deleted user', target: 'user:charlie@old.com', type: 'user', timestamp: '2026-05-03 12:00 UTC', severity: 'destructive' },
        { id: '4', actor: 'Alice Johnson', action: 'invited member', target: 'dana@acme.com', type: 'workspace', timestamp: '2026-05-02 09:21 UTC', severity: 'info' },
      ],
    },
  },
};
