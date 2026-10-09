// manifest/entries/menu-order.ts — the LLM-facing description of the
// menu-order widget (widgets/composite/MenuOrder.svelte). The model writes
// product ids, `featured` and `preset`; server hydration fills prices, photos,
// option groups, `fulfilment`, `fee`, `checkout` and the `on_checkout` handler
// (design doc 2026-10-09 §4.1), so the example carries no handler.
import type { WidgetManifestEntry } from '../index.js';

export const menuOrderEntry: WidgetManifestEntry = {
  type: 'menu-order',
  category: 'composite',
  staticSafe: false,
  description:
    'Order from a menu in stages: browse, customise, details, review. items[] of {product_id, name, price, groups?}; featured {id, reason}; preset [{id, qty}]. Binds cart; emits on_checkout.',
  props: {
    title: { type: 'string', required: false, description: 'Restaurant or menu name.' },
    subtitle: { type: 'string', required: false, description: 'One line under the title (hours, area).' },
    verdict: { type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }', required: false, description: 'One sentence shown first, at most 140 chars.' },
    currency: { type: 'string', required: false, description: 'ISO 4217 code. Default USD. Never a symbol.' },
    items: {
      type: 'Array<{ id?: string; product_id?: string; name?: string; description?: string; price?: number; image?: string; category?: string; tags?: string[]; kind?: "main" | "side" | "drink" | "dessert" | "product"; featured?: boolean; groups?: Array<{ id: string; name: string; choose: "one" | "many"; required?: boolean; max?: number; options: Array<{ id: string; name: string; price_delta?: number }> }> }>',
      required: true,
      description: 'Menu items. Write product_id (and name for streaming); the server fills price, image and groups. Items without product_id are display only. Rows use kind, never type.',
    },
    featured: { type: '{ id: string; reason?: string }', required: false, description: 'The pick for this visitor, by id or product_id, with a short reason.' },
    preset: { type: 'Array<{ id: string; qty: number }>', required: false, description: 'Pre-fills quantities ("two burgers").' },
    fulfilment: { type: 'Array<"pickup" | "delivery">', required: false, description: 'Server-filled. Default ["pickup"].' },
    fee: { type: '{ delivery?: number }', required: false, description: 'Server-filled delivery fee.' },
    checkout: { type: 'boolean', required: false, description: 'Server-filled. Ordering controls show only when true. Default false (display only).' },
    cart: {
      type: '{ lines: Array<{ product_id: string; name: string; qty: number; option_ids: string[]; unit_price: number }>; fulfilment?: "pickup" | "delivery"; total?: number }',
      required: false,
      description: 'Bindable. The lines so far (qty 1 to 20, at most 30 lines), never the customer. Totals are display only; the store reprices.',
    },
  },
  events: {
    on_checkout: {
      type: 'EventAction | EventAction[]',
      required: false,
      description: 'Server-wired. Fires with { lines, fulfilment, customer: { name, email, phone, address? }, total } when the visitor continues to payment. Name, email and phone are required, plus the address for delivery.',
    },
  },
  example: {
    type: 'menu-order',
    props: {
      title: 'Copper Griddle',
      currency: 'USD',
      featured: { id: 'mushroom-swiss', reason: 'Vegetarian and under $13.' },
      items: [
        { product_id: 'smash-burger', name: 'Double Smash Burger', kind: 'main', category: 'Burgers' },
        { product_id: 'mushroom-swiss', name: 'Mushroom Swiss', kind: 'main', category: 'Burgers' },
        { product_id: 'shoestring-fries', name: 'Shoestring Fries', kind: 'side', category: 'Sides' },
        { product_id: 'malted-shake', name: 'Malted Vanilla Shake', kind: 'dessert', category: 'Shakes' },
      ],
    },
  },
};
