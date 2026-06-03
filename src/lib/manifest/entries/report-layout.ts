import type { WidgetManifestEntry } from '../index.js';

export const reportLayoutEntry: WidgetManifestEntry = {
  type: 'report-layout',
  category: 'composite',
  description:
    'Printable structured-document layout: branded header (logo + brand + title), meta block, body via children, optional footer + watermark. Print CSS hides actions and inverts to a clean B&W document.',
  props: {
    title: { type: 'string', required: true, description: 'Report title.' },
    subtitle: { type: 'string', required: false, description: 'Optional subtitle under the title.' },
    logo: { type: 'string', required: false, description: 'Logo image URL.' },
    brand: { type: 'string', required: false, description: 'Brand name displayed next to the logo.' },
    meta: { type: 'Array<{ label: string; value: string; icon?: string }>', required: false, description: 'Document meta block (period, author, version, generated at, etc.).' },
    footer: { type: 'string', required: false, description: 'Footnote / legal disclaimer at the bottom.' },
    showPrintAction: { type: 'boolean', required: false, description: 'Show a built-in Print button. Ignored when `actions` is provided. Default true.' },
    actions: { type: 'Array<{ id?: string; label: string; icon?: string; variant?: "default" | "outline" | "ghost"; actions?: EventAction | EventAction[] }>', required: false, description: 'Custom action buttons in the header (e.g. Download, Share).' },
    watermark: { type: 'string', required: false, description: 'Optional watermark text like "DRAFT" or "CONFIDENTIAL".' },
    paperWidth: { type: 'boolean', required: false, description: 'Constrain the body to a print-friendly column. Default true.' },
  },
  example: {
    type: 'report-layout',
    props: {
      title: 'Q1 2026 Compliance Audit',
      subtitle: 'Information security & access controls',
      brand: 'Acme Corp',
      meta: [
        { label: 'Period', value: 'Jan 1 – Mar 31, 2026' },
        { label: 'Generated', value: 'May 4, 2026' },
        { label: 'Author', value: 'Internal Audit' },
        { label: 'Version', value: '1.3' },
      ],
      footer: 'Confidential — internal use only. Do not redistribute outside Acme Corp.',
      watermark: 'DRAFT',
    },
    children: [
      { type: 'heading', props: { text: 'Executive summary', level: 2 } },
      { type: 'text', props: { text: 'Findings indicate strong access-control posture with three medium-risk items.' } },
    ],
  },
};
