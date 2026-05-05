import type { WidgetManifestEntry } from '../index.js';

export const invoiceLinesEntry: WidgetManifestEntry = {
  type: 'invoice-lines',
  category: 'vertical',
  description: 'Invoice line-item table with qty, unit price, totals. Auto-computes subtotal; supports tax/discount summary rows.',
  props: {
    lines: { type: 'Array<{ id?: string | number; description: string; quantity?: number; unitPrice?: number; total?: number; note?: string }>', required: true, description: 'Line items.' },
    currency: { type: 'string', required: false, description: 'Currency symbol. Default "$".' },
    summary: { type: 'Array<{ label: string; value: number; isNegative?: boolean }>', required: false, description: 'Tax/discount/shipping rows.' },
    subtotal: { type: 'number', required: false, description: 'Override auto-computed subtotal.' },
    total: { type: 'number', required: false, description: 'Override auto-computed grand total.' },
    showRowTotals: { type: 'boolean', required: false, description: 'Show line-totals column. Default true.' },
  },
  example: {
    type: 'invoice-lines',
    props: {
      currency: '$',
      lines: [
        { id: 'line1', description: 'Enterprise annual plan', quantity: 1, unitPrice: 12000, note: '12 months @ $1,000/mo' },
        { id: 'line2', description: 'Premium support add-on', quantity: 12, unitPrice: 500 },
        { id: 'line3', description: 'Custom integration setup', quantity: 1, unitPrice: 2500 },
      ],
      summary: [
        { label: 'Subtotal', value: 18000 },
        { label: 'Tax (8%)', value: 1440 },
        { label: 'Discount', value: 1000, isNegative: true },
      ],
      total: 18440,
    },
  },
};
