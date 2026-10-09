// manifest/entries/itinerary.ts — the LLM-facing entry for the itinerary data
// widget (design doc 2026-10-09 §3.5). Data rows use `kind` from closed enums,
// never `type`; `days` is the bound field; no events beyond the bind.
import type { WidgetManifestEntry } from '../index.js';

const STOP_KINDS = '"sight" | "food" | "stay" | "transit" | "activity" | "shop" | "nature" | "nightlife" | "flight"';
const LEG_KINDS = '"flight" | "train" | "bus" | "car" | "ferry" | "walk"';

export const itineraryEntry: WidgetManifestEntry = {
  type: 'itinerary',
  category: 'composite',
  description:
    'Trip plan by day: days[{label, when, theme, stay, stops[{time, title, kind, place, cost, minutes, must, done}]}], route[], legs[], packing[], budget. Bind days to tick and add stops.',
  props: {
    title: { type: 'string', required: false, description: 'Trip name, e.g. "5 days in Tokyo".' },
    subtitle: { type: 'string', required: false, description: 'One line under the title (dates, travellers).' },
    verdict: { type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }', required: false, description: 'The answer up front, at most 140 chars. Omit it and the spend line leads.' },
    currency: { type: 'string', required: false, description: 'ISO 4217 code for every cost. Default "USD". Never put a symbol in the numbers.' },
    budget: { type: 'number', required: false, description: 'Trip budget. Planned spend (stop and leg costs) is shown against it: warning past 90%, alert when over.' },
    route: { type: 'string[]', required: false, description: 'Cities in order, drawn as a route strip. Derived from legs when omitted.' },
    days: {
      type: `Array<{ id?: string; label: string; when?: string; theme?: string; stay?: string; stops: Array<{ id?: string; time?: string; title: string; kind: ${STOP_KINDS}; place?: string; cost?: number; minutes?: number; must?: boolean; done?: boolean; image?: string }> }>`,
      required: true,
      description:
        'The days. `when` is a display label ("Fri 16 Oct"); `time` shows as written ("08:30"). `must` tags a must-see. Two-way bind with `bind: "{state.days}"` so ticking a stop or adding one persists.',
    },
    open: { type: 'number', required: false, description: 'Index of the expanded day. Default 0; set it to today for "what is next today".' },
    legs: { type: `Array<{ id?: string; from: string; to: string; kind: ${LEG_KINDS}; ref?: string; minutes?: number; cost?: number }>`, required: false, description: 'Transport between cities. `ref` is the train, flight or line name.' },
    packing: { type: 'Array<{ id?: string; group: string; items: string[] }>', required: false, description: 'Packing list by group.' },
  },
  example: {
    type: 'itinerary',
    bind: '{state.days}',
    props: {
      title: 'Weekend in Lisbon',
      subtitle: '2 days · 2 travellers',
      currency: 'USD',
      budget: 400,
      route: ['Lisbon', 'Sintra', 'Lisbon'],
      legs: [
        { from: 'Lisbon', to: 'Sintra', kind: 'train', ref: 'Rossio line', minutes: 40, cost: 5 },
        { from: 'Sintra', to: 'Lisbon', kind: 'train', ref: 'Rossio line', minutes: 40, cost: 5 },
      ],
      days: [
        {
          label: 'Day 1',
          when: 'Sat 17 Oct',
          theme: 'Alfama and the river',
          stay: 'Casa Azulejo, Alfama',
          stops: [
            { time: '09:30', title: 'Miradouro da Graça', kind: 'sight', place: 'Graça', minutes: 45, cost: 0 },
            { time: '11:00', title: 'Tram 28 to Baixa', kind: 'transit', minutes: 30, cost: 3 },
            { time: '13:00', title: 'Grilled sardines at Taberna Rio', kind: 'food', place: 'Baixa', cost: 28, must: true },
          ],
        },
        {
          label: 'Day 2',
          when: 'Sun 18 Oct',
          theme: 'Sintra palaces',
          stops: [
            { time: '10:00', title: 'Pena Palace', kind: 'sight', place: 'Sintra', minutes: 120, cost: 20, must: true },
            { time: '14:00', title: 'Moorish Castle walk', kind: 'nature', minutes: 90, cost: 12 },
          ],
        },
      ],
      packing: [{ group: 'Essentials', items: ['Walking shoes', 'Light jacket', 'Travel adapter'] }],
    },
  },
};
