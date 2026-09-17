// @file manifest/entries/faq.ts — manifest entry for the `faq` widget.
// @created 2026-06-09 — ITEM 3: marketing FAQ widget (native <details>).
//   category 'marketing', staticSafe (browser-native disclosure, no client JS).
import type { WidgetManifestEntry } from '../index.js';

export const faqEntry: WidgetManifestEntry = {
  type: 'faq',
  category: 'marketing',
  staticSafe: true,
  description: 'Frequently-asked-questions section: question/answer pairs as native <details> disclosures. Expands with no client JS. Aliased as faqs.',
  props: {
    title: { type: 'string', required: false, description: 'Optional section heading above the list.' },
    items: { type: 'Array<{ question: string; answer: string }>', required: true, description: 'The Q/A pairs.' },
  },
  example: {
    type: 'faq',
    props: {
      title: 'Questions, answered',
      items: [
        { question: 'How long does a visit take?', answer: 'Most first visits run 45 minutes — a cleaning, a check, and a plan.' },
        { question: 'Do you take my insurance?', answer: 'We bill all major plans directly and confirm your coverage before the appointment.' },
        { question: 'Can I reschedule online?', answer: 'Yes — change or cancel from the confirmation email up to 24 hours ahead.' },
      ],
    },
  },
};
