<!-- src/routes/showcase/wave1/+page.svelte -->
<script lang="ts">
  import { Ripple } from '$lib/index.js';

  const spec = {
    version: '1.0' as const,
    state: { chipOpen: true, popoverOpen: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '32px' },
      class: 'p-8 max-w-5xl mx-auto',
      children: [
        { type: 'page-header', props: { eyebrow: 'WAVE 1', title: 'Wave 1 Widgets', subtitle: '13 widgets that close out the gap audit' } },

        // Inline micros
        { type: 'heading', props: { text: 'Inline micros', level: 3 } },
        {
          type: 'card',
          children: [
            {
              type: 'flex',
              props: { gap: '12px', wrap: 'wrap', align: 'center' },
              children: [
                { type: 'chip', props: { label: 'default' } },
                { type: 'chip', props: { label: 'primary', variant: 'primary' } },
                { type: 'chip', props: { label: 'success', variant: 'success' } },
                { type: 'chip', props: { label: 'warning', variant: 'warning' } },
                { type: 'chip', props: { label: 'destructive', variant: 'destructive' } },
                { type: 'chip', props: { label: 'closable', variant: 'primary', closable: true } },
                { type: 'kbd', props: { keys: ['⌘', 'K'] } },
                { type: 'kbd', props: { keys: 'Enter' } },
                { type: 'status-dot', props: { variant: 'online', label: 'Online', pulse: true } },
                { type: 'status-dot', props: { variant: 'busy', label: 'Busy' } },
                { type: 'status-dot', props: { variant: 'away', label: 'Away' } },
                { type: 'status-dot', props: { variant: 'offline', label: 'Offline' } },
                { type: 'trend', props: { value: 12.4 } },
                { type: 'trend', props: { value: -3.2 } },
                { type: 'trend', props: { value: 0 } },
                { type: 'trend', props: { value: 1500, format: 'currency' } },
                { type: 'icon', props: { name: 'sparkles', size: 18 } },
                { type: 'icon', props: { name: 'zap', size: 18 } },
                { type: 'icon', props: { name: 'rocket', size: 18 } },
                { type: 'copy', props: { value: 'sk_test_abc123', label: 'API key' } },
                { type: 'text', props: { text: 'Inline ', size: 'sm' }, class: 'inline' },
                { type: 'code', props: { value: 'const x = 1' } }
              ]
            }
          ]
        },

        // Loading + Avatar group
        { type: 'heading', props: { text: 'Loading & avatar-group', level: 3 } },
        {
          type: 'card',
          children: [
            {
              type: 'flex',
              props: { gap: '24px', align: 'center', wrap: 'wrap' },
              children: [
                { type: 'loading', props: { showLabel: true, label: 'Loading…', inline: true } },
                {
                  type: 'avatar-group',
                  props: {
                    size: 'md',
                    max: 3,
                    users: [
                      { fallback: 'AB' },
                      { fallback: 'CD' },
                      { fallback: 'EF' },
                      { fallback: 'GH' },
                      { fallback: 'IJ' }
                    ]
                  }
                }
              ]
            }
          ]
        },

        // Overlays
        { type: 'heading', props: { text: 'Overlays (hover/click to interact)', level: 3 } },
        {
          type: 'card',
          children: [
            {
              type: 'flex',
              props: { gap: '24px', align: 'center', wrap: 'wrap' },
              children: [
                {
                  type: 'tooltip',
                  props: { content: 'I am a tooltip', side: 'top' },
                  hasChildren: true,
                  children: [
                    { type: 'button', props: { label: 'Hover me', variant: 'outline' } }
                  ]
                },
                {
                  type: 'popover',
                  props: {
                    side: 'bottom',
                    content: {
                      type: 'flex',
                      props: { direction: 'column', gap: '8px' },
                      children: [
                        { type: 'heading', props: { text: 'Popover content', level: 5 } },
                        { type: 'text', props: { text: 'Click outside to dismiss.', size: 'sm' } }
                      ]
                    }
                  },
                  hasChildren: true,
                  children: [
                    { type: 'button', props: { label: 'Open popover', variant: 'outline' } }
                  ]
                },
                {
                  type: 'hover-card',
                  props: {
                    side: 'bottom',
                    content: {
                      type: 'flex',
                      props: { gap: '8px', align: 'center' },
                      children: [
                        { type: 'avatar-group', props: { users: [{ fallback: 'JD' }] } },
                        {
                          type: 'flex',
                          props: { direction: 'column' },
                          children: [
                            { type: 'text', props: { text: 'Jane Doe', weight: 'semibold' } },
                            { type: 'text', props: { text: 'Software engineer', size: 'sm' } }
                          ]
                        }
                      ]
                    }
                  },
                  hasChildren: true,
                  children: [
                    { type: 'button', props: { label: 'Hover for card', variant: 'outline' } }
                  ]
                }
              ]
            }
          ]
        },

        // Toast
        { type: 'heading', props: { text: 'Toast', level: 3 } },
        {
          type: 'card',
          children: [
            {
              type: 'flex',
              props: { gap: '8px', wrap: 'wrap' },
              children: [
                { type: 'button', props: { label: 'Info toast' }, on_click: { action: 'toast', message: 'Saved.', variant: 'info' } },
                { type: 'button', props: { label: 'Success toast', variant: 'outline' }, on_click: { action: 'toast', message: 'All done!', variant: 'success' } },
                { type: 'button', props: { label: 'Warning toast', variant: 'outline' }, on_click: { action: 'toast', message: 'Heads up.', variant: 'warning' } },
                { type: 'button', props: { label: 'Error toast', variant: 'destructive' }, on_click: { action: 'toast', message: 'Something failed.', variant: 'error' } }
              ]
            },
            { type: 'toast', props: { position: 'bottom-right' } }
          ]
        }
      ]
    }
  };
</script>

<Ripple {spec} />
