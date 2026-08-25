import type { WidgetManifestEntry } from '../index.js';

export const breadcrumbEntry: WidgetManifestEntry = {
  type: 'breadcrumb',
  category: 'layout',
  description: 'Navigation breadcrumb trail with customizable separator (chevron/slash/custom).',
  props: {
    items: { type: 'Array<{ label: string; href?: string; icon?: string }>', required: true, description: 'Breadcrumb items in order.' },
    separator: { type: '"chevron" | "slash" | string', required: false, description: 'Separator style. Default "chevron".' },
  },
  example: {
    type: 'breadcrumb',
    props: {
      items: [
        { label: 'Home', href: '/', icon: 'home' },
        { label: 'Projects', href: '/projects' },
        { label: 'Acme' },
      ],
      separator: 'chevron',
    },
  },
};
