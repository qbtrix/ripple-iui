// @file manifest/entries/footer.ts — manifest entry for the `footer` widget.
// @created 2026-05-30 — RFC 12 marketing widget pack.
// @change 2026-06-09 — moved to category 'marketing'; flagged staticSafe (links
//   + text only, no client JS).
import type { WidgetManifestEntry } from '../index.js';

export const footerEntry: WidgetManifestEntry = {
  type: 'footer',
  category: 'marketing',
  staticSafe: true,
  description: 'Marketing footer: columns of links plus a copyright line. Use at the bottom of a landing page.',
  props: {
    columns: { type: 'Array<{ title: string; links: Array<{ label: string; href: string }> }>', required: false, description: 'Footer link columns.' },
    copyright: { type: 'string', required: false, description: 'Copyright / legal line.' },
  },
  example: {
    type: 'footer',
    props: {
      columns: [
        { title: 'Company', links: [{ label: 'About', href: '#about' }, { label: 'Careers', href: '#careers' }] },
        { title: 'Legal', links: [{ label: 'Privacy', href: '#privacy' }, { label: 'Terms', href: '#terms' }] },
      ],
      copyright: '© 2026 Bright Smile Dental',
    },
  },
};
