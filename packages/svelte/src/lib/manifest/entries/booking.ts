// manifest/entries/booking.ts — manifest entry for `booking`: a table or
// service booking in stages inside a chat card. The server fills `services`,
// `days` and `tz` from the store and attaches `on_book`; the model writes
// `party` and `preferred` only. The host answers a booking through `notice`
// and `confirmed`. The example carries no handler on purpose: a model-written
// `on_book` is refused by the host.
import type { WidgetManifestEntry } from '../index.js';

const slots = (date: string, full: string[]) =>
  ['17:30', '18:00', '18:30', '19:00', '19:30', '20:00'].map((t) => {
    const [h, m] = t.split(':').map(Number);
    return {
      start: `${date}T${t}:00-04:00`,
      label: `${h - 12}:${String(m).padStart(2, '0')} PM`,
      available: !full.includes(t),
    };
  });

export const bookingEntry: WidgetManifestEntry = {
  type: 'booking',
  category: 'composite',
  description:
    'Booking in stages: what, when, details, review. Server fills `services` and `days` (date_label, slots); model sets `party` and `preferred` {date, after}. Fires on_book.',
  props: {
    title: { type: 'string', required: false, description: 'Heading. Defaults to "Book a table" for a table service, else "Book an appointment".' },
    subtitle: { type: 'string', required: false, description: 'The place, e.g. "Juniper & Ash, Dupont".' },
    verdict: { type: '{ text: string; status?: "good" | "warn" | "bad" | "info" | "neutral" }', required: false, description: 'One sentence shown first, at most 140 chars.' },
    currency: { type: 'string', required: false, description: 'ISO 4217 code for service prices. Default "USD".' },
    services: {
      type: 'Array<{ id: string; name: string; kind?: "table" | "hair" | "beauty" | "health" | "class" | "other"; duration_min: number; price?: number; image?: string; party?: { min: number; max: number } }>',
      required: false,
      description: 'Server-filled from the store. A service with `party` asks for a party size within those bounds.',
    },
    days: {
      type: 'Array<{ date: string; date_label: string; slots: Array<{ start: string; label: string; available: boolean }> }>',
      required: false,
      description: 'Server-filled: days (YYYY-MM-DD, label "Fri 16 Oct") with slots (ISO start with the store offset, label "7:00 PM"). Unavailable slots show as Full.',
    },
    tz: { type: 'string', required: false, description: 'Server-filled store timezone, e.g. "America/New_York". Shown as "Times are New York time."' },
    party: { type: 'number', required: false, description: 'Model: the party size the visitor asked for. Clamped to the service bounds.' },
    preferred: { type: '{ date?: string; after?: string }', required: false, description: 'Model: the visitor\'s ask, e.g. "Friday evening" is { date: "2026-10-16", after: "18:00" }. Pre-selects the nearest open slot.' },
    notice: { type: '{ kind: "error" | "info"; text: string; code?: "slot_taken"; start?: string }', required: false, description: 'Host: the answer to a booking. code "slot_taken" (with the slot\'s start) returns to the times with it marked Full.' },
    confirmed: { type: '{ booking_id: string; label: string; date_label: string; service_name: string; party?: number }', required: false, description: 'Host: the confirmed booking. Shows the confirmation and no more actions.' },
    selection: { type: '{ service_id?: string; start?: string; party?: number; customer?: { name?: string; email?: string; phone?: string }; notes?: string }', required: false, description: 'Bindable: the request in progress.' },
  },
  events: {
    on_book: {
      type: 'EventAction',
      required: false,
      description: 'Host-attached, never model-written. Fired with { service_id, start, party?, customer: { name, email?, phone? }, notes? }.',
    },
  },
  example: {
    type: 'booking',
    props: {
      subtitle: 'Juniper & Ash, Dupont',
      tz: 'America/New_York',
      party: 4,
      preferred: { date: '2026-10-16', after: '19:00' },
      services: [{ id: 'table', name: 'Dinner table', kind: 'table', duration_min: 90, party: { min: 1, max: 8 } }],
      days: [
        { date: '2026-10-15', date_label: 'Thu 15 Oct', slots: slots('2026-10-15', ['19:00']) },
        { date: '2026-10-16', date_label: 'Fri 16 Oct', slots: slots('2026-10-16', ['18:30', '19:00', '19:30']) },
        { date: '2026-10-17', date_label: 'Sat 17 Oct', slots: slots('2026-10-17', ['18:00', '18:30', '19:00', '19:30', '20:00']) },
      ],
    },
    bind: '{state.booking}',
  },
};
