// @file manifest/entries/newsletter.ts — manifest entry for the `newsletter` widget.
// @created 2026-05-30 — RFC 12 marketing widget pack.
import type { WidgetManifestEntry } from '../index.js';

export const newsletterEntry: WidgetManifestEntry = {
  type: 'newsletter',
  category: 'input',
  description: 'Email-capture band: heading, subtext, email field, submit button. Aliased as email-capture. Emits the entered email via on_submit.',
  props: {
    heading: { type: 'string', required: false, description: 'Headline above the field.' },
    subtext: { type: 'string', required: false, description: 'Supporting copy.' },
    placeholder: { type: 'string', required: false, description: 'Input placeholder. Default "you@example.com".' },
    button: { type: 'string', required: false, description: 'Submit button label. Default "Subscribe".' },
  },
  events: {
    on_submit: { type: 'EventHandler', required: false, description: 'Fires with the entered email on submit.' },
  },
  example: {
    type: 'newsletter',
    props: { heading: 'Stay in the loop', subtext: 'Tips and offers, no spam.', placeholder: 'you@email.com', button: 'Subscribe' },
    on_submit: { action: 'emit', target: 'subscribe', value: '{state.email}' },
  },
};
