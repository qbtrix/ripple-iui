// manifest/entries/comparison-layout.ts — the concierge's view of
// comparison-layout (design doc 2026-10-09 §3.2): items, features with `kind`
// (never `type`), the winner with its reason, picks, and `chosen` as the one
// bindable field. `on_choose` is node-level, under `events`. Per-item
// `actions` (Choose) and `learn_more` stay EventAction-typed in `items`: the
// server builds its handler checks from them (composite-actions.test.ts).
import type { WidgetManifestEntry } from '../index.js';

export const comparisonLayoutEntry: WidgetManifestEntry = {
  type: 'comparison-layout',
  category: 'composite',
  description:
    'Which to pick: items {id,name,price,image} compared on features {key,label,kind,better,unit}, a winner {id,reason} card, picks tags, best cells marked, price vs winner.',
  props: {
    title: { type: 'string', required: false, description: 'Header title.' },
    subtitle: { type: 'string', required: false, description: 'One line under the title.' },
    verdict: {
      type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }',
      required: false,
      description: 'The answer up front, at most 140 chars, e.g. "Nimbus Pro 15 if you edit video; Aero 14 for battery."',
    },
    currency: { type: 'string', required: false, description: 'ISO 4217 code for numeric prices. Default "USD". Never put a symbol in the data.' },
    items: {
      type: 'Array<{ id: string; name: string; subtitle?: string; price?: number; image?: string; product_id?: string; rating?: number; actions?: EventAction | EventAction[]; learn_more?: EventAction | EventAction[]; [featureKey: string]: unknown }>',
      required: true,
      description: '2 to 6 items. `price` is a number; feature values are keyed by feature `key`. With `product_id` the server fills name, price and image. Per item, `actions` fires on Choose and `learn_more` on Learn more.',
    },
    features: {
      type: 'Array<{ key: string; label: string; section?: string; kind?: "text" | "number" | "boolean" | "rating" | "icon" | "price" | "color"; better?: "higher" | "lower"; unit?: string; icon?: "battery" | "weight" | "display" | "cpu" | "memory" | "storage" | "camera" | "speed" | "price" | "ports" | "wifi" | "keyboard" | "audio" | "security" | "warranty" | "size" | "rating" | "support"; highlight?: boolean }>',
      required: false,
      description: 'Rows, grouped into section chips by `section`. `better` marks the best numeric cell. An `icon`-kind value is one of the `icon` words (or a list of them). `highlight` puts the row on the item card. Inferred from item keys when omitted.',
    },
    winner: {
      type: '{ id: string; reason: string; runner_up?: { id: string; reason: string } }',
      required: false,
      description: 'The best pick, shown first with its reason, photo and price; every other price shows its difference from it.',
    },
    picks: {
      type: 'Array<{ id: string; label: string }>',
      required: false,
      description: 'At most 3 per-need tags on items, e.g. "Best for travel", "Lightest".',
    },
    chosen: {
      type: 'string',
      required: false,
      description: 'The chosen item id. Use top-level `bind` to keep it in state (e.g. `bind: "pick"`).',
    },
    primaryLabel: { type: 'string', required: false, description: 'Choose button label. Default "Choose".' },
    defaultView: { type: '"card" | "table"', required: false, description: 'Detailed view below 720px until the visitor picks one. Default "card"; wider always shows the table.' },
    showDiffToggle: { type: 'boolean', required: false, description: 'Show the "Differences only" filter. Default true.' },
  },
  events: {
    on_choose: {
      type: 'EventAction | EventAction[]',
      required: false,
      description: 'Fires with { id, name, product_id? } when the visitor picks an item.',
    },
  },
  example: {
    type: 'comparison-layout',
    bind: 'pick',
    props: {
      title: 'Three laptops for a designer who travels',
      verdict: { text: 'Aero 14 for battery and weight; Nimbus Pro 15 if you edit video.', status: 'good' },
      currency: 'USD',
      winner: {
        id: 'aero-14',
        reason: 'Lightest of the three with the longest battery, and the lowest price.',
        runner_up: { id: 'vertex-x13', reason: 'Same battery and a better keyboard, for $200 more.' },
      },
      picks: [
        { id: 'nimbus-pro-15', label: 'Best for video' },
        { id: 'vertex-x13', label: 'Best keyboard' },
      ],
      items: [
        { id: 'aero-14', name: 'Aero 14', subtitle: '14-inch ultralight', price: 1099, battery: 18, weight: 1.2, memory: 16, gpu: false, rating: 4.6, extras: ['wifi', 'ports'] },
        { id: 'nimbus-pro-15', name: 'Nimbus Pro 15', subtitle: '15-inch creator', price: 1799, battery: 11, weight: 1.9, memory: 32, gpu: true, rating: 4.4, extras: ['display', 'audio'] },
        { id: 'vertex-x13', name: 'Vertex X13', subtitle: '13-inch business', price: 1299, battery: 18, weight: 1.3, memory: 16, gpu: false, rating: 4.5, extras: ['keyboard', 'security'] },
      ],
      features: [
        { key: 'battery', label: 'Battery', section: 'Everyday', kind: 'number', unit: 'h', better: 'higher', icon: 'battery', highlight: true },
        { key: 'weight', label: 'Weight', section: 'Everyday', kind: 'number', unit: 'kg', better: 'lower', icon: 'weight', highlight: true },
        { key: 'extras', label: 'Stands out for', section: 'Everyday', kind: 'icon' },
        { key: 'memory', label: 'Memory', section: 'Performance', kind: 'number', unit: 'GB', better: 'higher', icon: 'memory' },
        { key: 'gpu', label: 'Discrete GPU', section: 'Performance', kind: 'boolean' },
        { key: 'rating', label: 'Owner rating', section: 'Reviews', kind: 'rating', better: 'higher', icon: 'rating' },
      ],
    },
  },
};
