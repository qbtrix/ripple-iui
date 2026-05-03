import type { WidgetManifestEntry } from '../index.js';

export const settingsListEntry: WidgetManifestEntry = {
  type: 'settings-list',
  category: 'vertical',
  description: 'Grouped list of settings with labels, descriptions, and right-aligned control widgets.',
  props: {
    items: { type: 'Array<{ id?: string; label: string; description?: string; group?: string; control?: UISpec }>', required: true, description: 'Settings rows; `control` is a nested widget spec.' },
  },
  example: {
    type: 'settings-list',
    props: {
      items: [
        { group: 'Account', label: 'Email address', description: 'Your primary login email.', control: { type: 'input', props: { value: 'alice@example.com' } } },
        { group: 'Account', label: 'Two-factor auth', description: 'Secure your account.', control: { type: 'switch', props: { checked: true } } },
        { group: 'Notifications', label: 'Email digests', description: 'Receive activity summaries.', control: { type: 'switch', props: { checked: true } } },
      ],
    },
  },
};
