// Modified: 2026-04-07 — Added c4, workflow to WidgetType enum and diagram category
// Modified: 2026-06-24 — Added the AI-native display tier (stream-text, tool-call, reasoning-trace) to the WidgetType enum and a new `ai` category.
import { z } from 'zod';

export const WidgetType = z.enum([
  // Layout
  'container', 'flex', 'grid', 'card', 'tabs',
  // Display
  'text', 'heading', 'image', 'badge', 'progress', 'avatar', 'stat',
  // Input
  'button', 'input', 'select', 'checkbox', 'switch',
  // Data
  'table', 'chart',
  // Control
  'if', 'each',
  // Diagram
  'c4', 'workflow',
  // Research
  'source-card', 'citation', 'sources-bar', 'discover-card', 'follow-up',
  'company-header', 'ticker', 'kv-table', 'timeline', 'callout', 'news-card',
  // AI-native display tier
  'stream-text', 'tool-call', 'reasoning-trace'
]);

export type WidgetType = z.infer<typeof WidgetType>;

export const WIDGET_CATEGORIES = {
  layout: ['container', 'flex', 'grid', 'card', 'tabs', 'dashboard', 'dashboard-slot', 'glass-card'],
  display: ['text', 'heading', 'image', 'badge', 'progress', 'avatar', 'metric', 'stat', 'soul-status'],
  input: ['button', 'input', 'select', 'checkbox', 'switch'],
  data: ['table', 'chart'],
  control: ['if', 'each'],
  composite: ['terminal'],
  diagram: ['c4', 'workflow'],
  research: ['source-card', 'citation', 'sources-bar', 'discover-card', 'follow-up',
    'company-header', 'ticker', 'kv-table', 'timeline', 'callout', 'news-card',
    'analyst-bar', 'range-bar'],
  ai: ['stream-text', 'tool-call', 'reasoning-trace']
} as const;
