import type { WidgetManifestEntry } from '../index.js';

export const formLayoutEntry: WidgetManifestEntry = {
  type: 'form-layout',
  category: 'composite',
  description:
    'Multi-section form scaffold with side nav anchors, sticky save bar (cancel + submit), and dirty/saving/error indicators. Compose a `form` widget inside for validation.',
  props: {
    title: { type: 'string', required: false, description: 'Form title.' },
    description: { type: 'string', required: false, description: 'Form description.' },
    sections: { type: 'Array<{ id: string; title: string; description?: string; icon?: string }>', required: false, description: 'Side-nav anchor list. Each entry should match the `id` attribute of a section in `children`.' },
    progress: { type: 'number', required: false, description: '0–100. Shown next to the title.' },
    valid: { type: 'boolean', required: false, description: 'When false, the submit button is disabled and an "Resolve errors" tag is shown. Default true.' },
    dirty: { type: 'boolean', required: false, description: 'Show "Unsaved changes" tag.' },
    saving: { type: 'boolean', required: false, description: 'Show "Saving…" tag and disable the submit button.' },
    submitLabel: { type: 'string', required: false, description: 'Submit button label. Default "Save changes".' },
    cancelLabel: { type: 'string', required: false, description: 'Cancel button label. Default "Cancel".' },
    submitActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions to dispatch when submit is clicked.' },
    cancelActions: { type: 'EventAction | EventAction[]', required: false, description: 'Actions to dispatch when cancel is clicked.' },
    showCancel: { type: 'boolean', required: false, description: 'Show the cancel button. Default true.' },
    stickyBar: { type: 'boolean', required: false, description: 'Pin the action bar to the bottom of the viewport. Default true.' },
  },
  example: {
    type: 'form-layout',
    props: {
      title: 'Account settings',
      description: 'Update your profile, security, and notification preferences.',
      sections: [
        { id: 'profile', title: 'Profile', description: 'Name, email, avatar', icon: 'user' },
        { id: 'security', title: 'Security', description: '2FA & sessions', icon: 'shield' },
        { id: 'notifications', title: 'Notifications', icon: 'bell' },
      ],
      progress: 60,
      dirty: true,
      submitActions: [{ action: 'toast', message: 'Saved', variant: 'success' }],
    },
    children: [
      { type: 'section', id: 'profile', props: { title: 'Profile' }, children: [
        { type: 'input', bind: 'name', props: { label: 'Name' } },
      ] },
      { type: 'section', id: 'security', props: { title: 'Security' }, children: [
        { type: 'switch', bind: 'twofa', props: { label: 'Enable 2FA' } },
      ] },
    ],
  },
};
