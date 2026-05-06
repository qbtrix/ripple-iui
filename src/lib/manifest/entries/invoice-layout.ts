import type { WidgetManifestEntry } from '../index.js';

export const invoiceLayoutEntry: WidgetManifestEntry = {
  type: 'invoice-layout',
  category: 'composite',
  description:
    'Full invoice / quote / receipt document with branded header, bill-to / ship-to, status, totals, payment instructions, and notes. Composes the `invoice-lines` widget for line items.',
  props: {
    docType: { type: '"Invoice" | "Quote" | "Receipt" | "Credit note"', required: false, description: 'Document type label. Default "Invoice".' },
    from: { type: '{ name: string; logo?: string; address?: string; email?: string; phone?: string; taxId?: string }', required: true, description: 'The party issuing the document.' },
    billTo: { type: '{ name: string; address?: string; email?: string; phone?: string; taxId?: string }', required: true, description: 'The party being billed.' },
    shipTo: { type: '{ name: string; address?: string }', required: false, description: 'Optional ship-to block (when different from bill-to).' },
    invoiceNumber: { type: 'string', required: true, description: 'Document number (e.g. "INV-2026-042").' },
    issueDate: { type: 'string', required: true, description: 'Issue date (any human-readable format).' },
    dueDate: { type: 'string', required: false, description: 'Due date.' },
    status: { type: '"draft" | "sent" | "paid" | "overdue" | "void"', required: false, description: 'Status badge.' },
    currency: { type: 'string', required: false, description: 'Currency symbol prepended to numeric amounts. Default "$".' },
    lines: { type: 'Array<{ id?: string | number; description: string; quantity?: number; unitPrice?: number; total?: number; note?: string }>', required: true, description: 'Line items.' },
    summary: { type: 'Array<{ label: string; value: number; isNegative?: boolean }>', required: false, description: 'Tax / discount / shipping rows shown after subtotal.' },
    subtotal: { type: 'number', required: false, description: 'Override the auto-computed subtotal.' },
    total: { type: 'number', required: false, description: 'Override the auto-computed grand total.' },
    notes: { type: 'string', required: false, description: 'Notes shown at the bottom (free-form text).' },
    paymentTerms: { type: 'string', required: false, description: 'Short payment terms summary (e.g. "Net 30").' },
    paymentMethods: { type: 'Array<{ label: string; detail?: string }>', required: false, description: 'Payment method instructions (e.g. ACH details, wire info).' },
    actions: { type: 'Array<{ id?: string; label: string; icon?: string; variant?: "default" | "outline" | "ghost"; actions?: EventAction | EventAction[] }>', required: false, description: 'Action buttons at the bottom (Download, Pay, Send).' },
  },
  example: {
    type: 'invoice-layout',
    props: {
      docType: 'Invoice',
      from: { name: 'Acme Corp', address: '1 Market St, San Francisco, CA', email: 'billing@acme.com', taxId: 'US-83-1234567' },
      billTo: { name: 'Globex Industries', address: '500 Industrial Pkwy, Springfield, IL', email: 'ap@globex.com' },
      invoiceNumber: 'INV-2026-042',
      issueDate: 'May 1, 2026',
      dueDate: 'May 31, 2026',
      status: 'sent',
      paymentTerms: 'Net 30',
      lines: [
        { description: 'Enterprise plan — May 2026', quantity: 1, unitPrice: 2500 },
        { description: 'Additional seats (40 × $30)', quantity: 40, unitPrice: 30 },
        { description: 'Onboarding services', quantity: 4, unitPrice: 250, note: '4-hour kickoff' },
      ],
      summary: [
        { label: 'Subtotal', value: 4900 },
        { label: 'Tax (8.5%)', value: 416.5 },
      ],
      paymentMethods: [
        { label: 'Wire transfer', detail: 'Routing 121000358 · Account 9876543210' },
        { label: 'ACH', detail: 'Same details as wire' },
      ],
      notes: 'Thank you for your business.',
      actions: [
        { id: 'download', label: 'Download PDF', icon: 'download', variant: 'outline' },
        { id: 'pay', label: 'Pay invoice', icon: 'credit-card' },
      ],
    },
  },
};
