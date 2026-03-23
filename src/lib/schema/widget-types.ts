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
  'if', 'each'
]);

export type WidgetType = z.infer<typeof WidgetType>;

export const WIDGET_CATEGORIES = {
  layout: ['container', 'flex', 'grid', 'card', 'tabs'],
  display: ['text', 'heading', 'image', 'badge', 'progress', 'avatar'],
  input: ['button', 'input', 'select', 'checkbox', 'switch'],
  data: ['table', 'chart'],
  control: ['if', 'each']
} as const;
