// Updated: Added 'glass-card' and 'soul-status' to WIDGET_CATEGORIES (integration merge)
import { z } from 'zod';

export const WidgetType = z.enum([
  // Layout
  'container', 'flex', 'grid', 'card', 'tabs',
  // Display
  'text', 'heading', 'image', 'badge', 'progress', 'avatar',
  // Input
  'button', 'input', 'select', 'checkbox', 'switch',
  // Data
  'table', 'chart',
  // Control
  'if', 'each',
  // Research
  'source-card', 'citation', 'sources-bar', 'discover-card', 'follow-up',
  'company-header', 'ticker', 'kv-table', 'timeline', 'callout', 'news-card'
]);

export type WidgetType = z.infer<typeof WidgetType>;

export const WIDGET_CATEGORIES = {
  layout: ['container', 'flex', 'grid', 'card', 'tabs', 'dashboard', 'dashboard-slot', 'glass-card'],
  display: ['text', 'heading', 'image', 'badge', 'progress', 'avatar', 'metric', 'feed', 'soul-status'],
  input: ['button', 'input', 'select', 'checkbox', 'switch'],
  data: ['table', 'chart'],
  control: ['if', 'each'],
  composite: ['terminal'],
  research: ['source-card', 'citation', 'sources-bar', 'discover-card', 'follow-up',
    'company-header', 'ticker', 'kv-table', 'timeline', 'callout', 'news-card',
    'analyst-bar', 'range-bar']
} as const;
