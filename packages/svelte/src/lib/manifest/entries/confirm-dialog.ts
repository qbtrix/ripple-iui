import type { WidgetManifestEntry } from '../index.js';

export const confirmDialogEntry: WidgetManifestEntry = {
  type: 'confirm-dialog',
  category: 'overlay',
  description: 'Auto-mounted confirmation dialog. Renders pending confirm actions invoked from elsewhere in the spec.',
  props: {},
  example: { type: 'confirm-dialog', props: {} },
  pocket: {
    state: {
      projects: [
        { id: 1, name: 'Atlas migration' },
        { id: 2, name: 'Onboarding redesign' },
      ],
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'confirm-dialog' },
        {
          type: 'each',
          items: 'state.projects',
          item_as: 'project',
          children: [
            {
              type: 'flex',
              props: { gap: '12px', align: 'center', justify: 'between' },
              children: [
                { type: 'text', props: { text: '{project.name}' } },
                {
                  type: 'button',
                  props: { label: 'Delete', variant: 'destructive', size: 'sm' },
                  on_click: {
                    action: 'confirm',
                    title: 'Delete {project.name}?',
                    message: 'This cannot be undone.',
                    confirm_label: 'Delete',
                    on_confirm: [
                      { action: 'remove', target: 'projects', value: '{project}' },
                      { action: 'toast', message: 'Deleted', variant: 'success' },
                    ],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  },
};
