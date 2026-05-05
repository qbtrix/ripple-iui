import type { WidgetManifestEntry } from '../index.js';

export const confirmDialogEntry: WidgetManifestEntry = {
  type: 'confirm-dialog',
  category: 'overlay',
  description: 'Auto-mounted confirmation dialog. Renders pending confirm actions invoked from elsewhere in the spec.',
  props: {},
  example: { type: 'confirm-dialog', props: {} },
};
