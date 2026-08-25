import type { WidgetManifestEntry } from '../index.js';

export const appShellEntry: WidgetManifestEntry = {
  type: 'app-shell',
  category: 'layout',
  description: 'App layout container with optional topbar and sidebar slots plus main content. Use with sidebar.',
  props: {},
  example: {
    type: 'app-shell',
    props: {},
    children: [
      { type: 'text', props: { text: 'Main app content' } },
    ],
  },
  pocket: {
    state: { activePage: 'overview' },
    ui: {
      type: 'app-shell',
      props: {},
      children: [
        {
          slot: 'sidebar',
          type: 'flex',
          props: { direction: 'column', gap: '4px' },
          children: [
            {
              type: 'button',
              props: { label: 'Overview', variant: '{state.activePage == "overview" ? "default" : "ghost"}' },
              on_click: { action: 'set', target: 'activePage', value: 'overview' },
            },
            {
              type: 'button',
              props: { label: 'Projects', variant: '{state.activePage == "projects" ? "default" : "ghost"}' },
              on_click: { action: 'set', target: 'activePage', value: 'projects' },
            },
            {
              type: 'button',
              props: { label: 'Settings', variant: '{state.activePage == "settings" ? "default" : "ghost"}' },
              on_click: { action: 'set', target: 'activePage', value: 'settings' },
            },
          ],
        },
        {
          type: 'if',
          condition: 'state.activePage == "overview"',
          children: [
            { type: 'heading', props: { level: 2, text: 'Overview' } },
            { type: 'text', props: { text: 'Welcome back. Pick a section from the sidebar.' } },
          ],
        },
        {
          type: 'if',
          condition: 'state.activePage == "projects"',
          children: [
            { type: 'heading', props: { level: 2, text: 'Projects' } },
            { type: 'text', props: { text: 'Your projects appear here.' } },
          ],
        },
        {
          type: 'if',
          condition: 'state.activePage == "settings"',
          children: [
            { type: 'heading', props: { level: 2, text: 'Settings' } },
            { type: 'text', props: { text: 'Configure your workspace.' } },
          ],
        },
      ],
    },
  },
};
