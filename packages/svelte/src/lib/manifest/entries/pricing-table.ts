import type { WidgetManifestEntry } from '../index.js';

export const pricingTableEntry: WidgetManifestEntry = {
  type: 'pricing-table',
  category: 'vertical',
  description: 'Multi-tier pricing comparison cards with feature checklists, popular badge, and CTAs.',
  props: {
    tiers: { type: 'Array<{ id: string; name: string; price: string | number; period?: string; description?: string; features?: Array<string | { label: string; included?: boolean }>; cta?: string; popular?: boolean }>', required: true, description: 'Pricing tiers.' },
    currency: { type: 'string', required: false, description: 'Currency symbol prepended to numeric prices. Default "$".' },
  },
  example: {
    type: 'pricing-table',
    props: {
      currency: '$',
      tiers: [
        { id: 'free', name: 'Free', price: 0, period: 'month', features: [{ label: 'Up to 3 projects', included: true }, { label: 'Priority support', included: false }], cta: 'Get started' },
        { id: 'pro', name: 'Pro', price: 99, period: 'month', features: [{ label: 'Unlimited projects', included: true }, { label: 'Priority support', included: true }], cta: 'Start trial', popular: true },
        { id: 'enterprise', name: 'Enterprise', price: 'Custom', features: [{ label: 'Unlimited projects', included: true }, { label: 'SSO', included: true }], cta: 'Contact sales' },
      ],
    },
  },
};
