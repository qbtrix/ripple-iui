<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '$lib/types.js';

  function handleEvent(event: RippleEvent) {
    console.log('RippleEvent:', event);
  }

  // ── Layout Widgets ──────────────────────────────────────────

  const containerSpec = {
    version: '1.0' as const,
    ui: {
      type: 'container',
      style: { padding: '16px', background: 'hsl(var(--muted) / 0.3)', 'border-radius': '8px' },
      children: [
        { type: 'text', props: { text: 'I am inside a container', size: 'sm' } }
      ]
    }
  };

  const flexSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '8px', align: 'center' },
      children: [
        { type: 'badge', props: { text: 'Flex', variant: 'default' } },
        { type: 'badge', props: { text: 'Row', variant: 'secondary' } },
        { type: 'badge', props: { text: 'Layout', variant: 'outline' } },
      ]
    }
  };

  const gridSpec = {
    version: '1.0' as const,
    ui: {
      type: 'grid',
      props: { columns: 3, gap: '12px' },
      children: [
        { type: 'card', props: { title: 'Cell 1' }, children: [{ type: 'text', props: { text: 'Grid item', size: 'sm' } }] },
        { type: 'card', props: { title: 'Cell 2' }, children: [{ type: 'text', props: { text: 'Grid item', size: 'sm' } }] },
        { type: 'card', props: { title: 'Cell 3' }, children: [{ type: 'text', props: { text: 'Grid item', size: 'sm' } }] },
      ]
    }
  };

  const cardSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '12px' },
      children: [
        { type: 'card', props: { title: 'Default Card', description: 'A standard card with header' }, children: [{ type: 'text', props: { text: 'Card content here', size: 'sm' } }] },
        { type: 'card', props: { title: 'Selected', variant: 'selected' }, children: [{ type: 'text', props: { text: 'Highlighted card', size: 'sm' } }] },
        { type: 'card', props: { title: 'Muted', variant: 'muted' }, children: [{ type: 'text', props: { text: 'Subdued card', size: 'sm' } }] },
      ]
    }
  };

  const tabsSpec = {
    version: '1.0' as const,
    state: { currentTab: 'Overview' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'tabs',
          props: { tabs: ['Overview', 'Details', 'Settings'] },
          bind: 'currentTab',
          children: [
            { type: 'text', props: { text: 'Overview content goes here.', size: 'sm' } },
            { type: 'text', props: { text: 'Detailed information panel.', size: 'sm' } },
            { type: 'text', props: { text: 'Settings and configuration.', size: 'sm' } },
          ]
        },
        { type: 'text', props: { text: 'Active tab → {state.currentTab}', size: 'xs' } }
      ]
    }
  };

  // ── Layout extras ───────────────────────────────────────────

  const accordionSpec = {
    version: '1.0' as const,
    ui: {
      type: 'accordion',
      props: {
        items: [
          { value: 'q1', title: 'Is bind two-way?', content: 'Yes — typing into any input updates the bound state path immediately.' },
          { value: 'q2', title: 'Can I run a flow on click?', content: 'Yes — on_click accepts a single action or an array; flow + branch + confirm + validate are all supported.' },
          { value: 'q3', title: 'How do I filter a list?', content: 'Use each + an inner if condition with a string method like .toLowerCase().includes(state.query).' }
        ]
      }
    }
  };

  const separatorSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'text', props: { text: 'Above the line', size: 'sm' } },
        { type: 'separator' },
        { type: 'text', props: { text: 'Below the line', size: 'sm' } }
      ]
    }
  };

  const alertSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'alert', props: { variant: 'info', title: 'Heads up', description: 'A new version is available — refresh to update.' } },
        { type: 'alert', props: { variant: 'success', title: 'Saved', description: 'Your changes were saved successfully.' } },
        { type: 'alert', props: { variant: 'warning', title: 'Quota nearing', description: 'You have used 92% of your monthly quota.' } },
        { type: 'alert', props: { variant: 'destructive', title: 'Action failed', description: 'The deletion did not complete. No data was lost.' } }
      ]
    }
  };

  const dropdownMenuSpec = {
    version: '1.0' as const,
    state: { lastAction: '—' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px', align: 'start' },
      children: [
        {
          type: 'dropdown-menu',
          props: {
            label: 'Actions',
            triggerVariant: 'outline',
            items: [
              { label: 'Edit', icon: 'pencil', value: 'edit', shortcut: '⌘E' },
              { label: 'Duplicate', icon: 'copy', value: 'duplicate', shortcut: '⌘D' },
              { label: 'Share', icon: 'share', value: 'share' },
              { type: 'separator' },
              { label: 'Archive', icon: 'archive', value: 'archive' },
              { label: 'Delete', icon: 'trash-2', value: 'delete', variant: 'destructive', shortcut: '⌫' }
            ]
          },
          on_change: { action: 'set', target: 'lastAction' }
        },
        { type: 'text', props: { text: 'Last action → {state.lastAction}', size: 'xs' } }
      ]
    }
  };

  const sheetSpec = {
    version: '1.0' as const,
    state: { open: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px', align: 'start' },
      children: [
        {
          type: 'button',
          props: { label: 'Open sheet' },
          on_click: { action: 'set', target: 'open', value: true }
        },
        {
          type: 'sheet',
          bind: 'open',
          props: { side: 'right', title: 'Filters', description: 'Tune the dataset.' },
          children: [
            {
              type: 'flex',
              props: { direction: 'column', gap: '12px' },
              children: [
                { type: 'input', props: { label: 'Search' } },
                { type: 'select', props: { label: 'Status', options: ['Active', 'Paused', 'Done'] } }
              ]
            }
          ]
        }
      ]
    }
  };

  const pageHeaderSpec = {
    version: '1.0' as const,
    ui: {
      type: 'page-header',
      props: { eyebrow: 'BILLING', title: 'Invoices', subtitle: 'View, download, and dispute invoices.' },
      children: [
        { type: 'button', props: { label: 'Export', variant: 'outline', size: 'sm' }, slot: 'actions' },
        { type: 'button', props: { label: 'New invoice', size: 'sm' }, slot: 'actions' }
      ]
    }
  };

  const heroSpec = {
    version: '1.0' as const,
    ui: {
      type: 'hero',
      props: {
        eyebrow: 'INTRODUCING',
        title: 'UI you describe, not draw',
        subtitle: 'Ripple turns JSON specs into fully interactive Svelte UI — with state, expressions, and event flows built in.',
        align: 'center'
      },
      children: [
        { type: 'button', props: { label: 'Get started' } },
        { type: 'button', props: { label: 'View on GitHub', variant: 'outline' } }
      ]
    }
  };

  const sectionSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '6px' },
      children: [
        {
          type: 'section',
          props: { title: 'Notifications', description: 'How and when we ping you.' },
          children: [
            { type: 'switch', props: { label: 'Email digests' } },
            { type: 'switch', props: { label: 'Real-time alerts' } }
          ]
        }
      ]
    }
  };

  const emptyStateSpec = {
    version: '1.0' as const,
    ui: {
      type: 'empty-state',
      props: {
        icon: 'search',
        title: 'No results',
        description: 'Try a different query or clear filters.'
      },
      children: [
        { type: 'button', props: { label: 'Clear filters', variant: 'outline', size: 'sm' } }
      ]
    }
  };

  const sidebarSpec = {
    version: '1.0' as const,
    state: { route: 'dashboard' },
    ui: {
      type: 'flex',
      props: { gap: '0' },
      style: { height: '320px', border: '1px solid hsl(var(--border))', 'border-radius': '8px', overflow: 'hidden' },
      children: [
        {
          type: 'sidebar',
          props: {
            title: 'Acme',
            items: [
              { label: 'Dashboard', icon: 'home', value: 'dashboard', group: 'Workspace' },
              { label: 'Projects', icon: 'folder', value: 'projects', group: 'Workspace', badge: '4' },
              { label: 'Team', icon: 'users', value: 'team', group: 'Workspace' },
              { label: 'Settings', icon: 'settings', value: 'settings', group: 'Account' },
              { label: 'Billing', icon: 'credit-card', value: 'billing', group: 'Account' }
            ]
          },
          bind: 'route'
        },
        {
          type: 'flex',
          props: { direction: 'column', gap: '8px' },
          style: { padding: '16px', flex: '1' },
          children: [
            { type: 'text', props: { text: 'Active route → {state.route}', size: 'sm', weight: 'medium' } },
            { type: 'text', props: { text: 'Click a sidebar item to update state.route.', size: 'xs' } }
          ]
        }
      ]
    }
  };

  const appShellSpec = {
    version: '1.0' as const,
    state: { route: 'dashboard' },
    ui: {
      type: 'app-shell',
      children: [
        {
          slot: 'topbar',
          type: 'flex',
          props: { align: 'center', gap: '12px' },
          children: [
            { type: 'text', props: { text: 'Acme', weight: 'semibold' } },
            { type: 'badge', props: { text: 'Pro', variant: 'secondary' } }
          ]
        },
        {
          slot: 'sidebar',
          type: 'sidebar',
          props: {
            items: [
              { label: 'Dashboard', icon: 'home', value: 'dashboard' },
              { label: 'Projects', icon: 'folder', value: 'projects' },
              { label: 'Team', icon: 'users', value: 'team' }
            ]
          },
          bind: 'route'
        },
        {
          type: 'flex',
          props: { direction: 'column', gap: '12px' },
          children: [
            {
              type: 'page-header',
              props: { title: '{state.route}', subtitle: 'Application shell composes sidebar + topbar + content slots.' }
            },
            {
              type: 'grid',
              props: { columns: 3, gap: '12px' },
              children: [
                { type: 'metric', props: { label: 'Open', value: 12 } },
                { type: 'metric', props: { label: 'In review', value: 4 } },
                { type: 'metric', props: { label: 'Closed', value: 38 } }
              ]
            }
          ]
        }
      ]
    }
  };

  const masterDetailSpec = {
    version: '1.0' as const,
    state: {
      selected: 1,
      issues: [
        { id: 1, title: 'Login broken on Safari', body: 'Users on iOS 17 see a blank screen after submitting the form.', status: 'Open' },
        { id: 2, title: 'Search returns stale results', body: 'After deleting an item, it still appears in search until the index rebuilds.', status: 'Triaged' },
        { id: 3, title: 'Add Slack integration', body: 'Customers want notifications when a thread is updated.', status: 'Open' }
      ]
    },
    ui: {
      type: 'grid',
      props: { columns: 2, gap: '12px' },
      style: { 'grid-template-columns': '220px 1fr' },
      children: [
        {
          type: 'flex',
          props: { direction: 'column', gap: '4px' },
          style: { 'border-right': '1px solid hsl(var(--border))', 'padding-right': '12px' },
          children: [
            {
              type: 'each',
              items: 'issues',
              item_as: 'issue',
              children: [
                {
                  type: 'button',
                  props: {
                    label: '{issue.title}',
                    variant: '{state.selected == issue.id ? "default" : "ghost"}',
                    size: 'sm',
                    class: 'justify-start'
                  },
                  on_click: { action: 'set', target: 'selected', value: '{issue.id}' }
                }
              ]
            }
          ]
        },
        {
          type: 'each',
          items: 'issues',
          item_as: 'issue',
          children: [
            {
              type: 'if',
              condition: '{state.selected == issue.id}',
              children: [
                {
                  type: 'flex',
                  props: { direction: 'column', gap: '8px' },
                  children: [
                    {
                      type: 'flex',
                      props: { align: 'center', gap: '8px' },
                      children: [
                        { type: 'heading', props: { text: '{issue.title}', level: 3 } },
                        { type: 'badge', props: { text: '{issue.status}', variant: 'secondary' } }
                      ]
                    },
                    { type: 'text', props: { text: '{issue.body}', size: 'sm' } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  };

  // ── Static info widgets ─────────────────────────────────────

  const prosConsSpec = {
    version: '1.0' as const,
    ui: {
      type: 'pros-cons',
      props: {
        prosLabel: 'Why JSON-spec UI',
        consLabel: 'When to skip',
        pros: [
          'LLM authors UI without writing Svelte',
          'Two-way bind covers 90% of forms with no boilerplate',
          'Deterministic — same spec renders the same DOM',
          'Hot-swappable for streaming responses'
        ],
        cons: [
          'Custom interactions still need a real component',
          'Bundle is heavier than hand-written HTML',
          'Not the right tool for animation-heavy art direction'
        ]
      }
    }
  };

  const comparisonTableSpec = {
    version: '1.0' as const,
    ui: {
      type: 'comparison-table',
      props: {
        label: 'Feature',
        columns: [
          { key: 'free', label: 'Free' },
          { key: 'pro', label: 'Pro', highlight: true },
          { key: 'ent', label: 'Enterprise' }
        ],
        rows: [
          { feature: 'Workspace members', free: '1', pro: '10', ent: 'Unlimited' },
          { feature: 'API requests / mo', free: '1k', pro: '100k', ent: 'Custom' },
          { feature: 'Audit log', free: false, pro: true, ent: true },
          { feature: 'Priority support', free: false, pro: true, ent: true },
          { feature: 'SSO / SAML', free: false, pro: false, ent: true },
          { feature: 'Custom contract', free: false, pro: false, ent: true }
        ]
      }
    }
  };

  const stepsSpec = {
    version: '1.0' as const,
    ui: {
      type: 'steps',
      props: {
        steps: [
          { title: 'Install', description: 'bun add @ripple-ui/svelte' },
          { title: 'Mount the renderer', description: 'Import <Ripple/> and pass it a JSON spec.' },
          { title: 'Wire onEvent', description: 'Forward navigate / api / toast actions to your host code.' },
          { title: 'Stream specs', description: 'Use a StreamSpecStore to render LLM-generated UI as it arrives.' }
        ]
      }
    }
  };

  const quoteSpec = {
    version: '1.0' as const,
    ui: {
      type: 'quote',
      props: {
        text: 'The most surprising thing about LLM-rendered UI is how often the spec is shorter than the answer it represents.',
        author: 'Ada Lovelace',
        role: 'Co-founder, Acme Labs',
        avatar: 'https://i.pravatar.cc/64?img=47'
      }
    }
  };

  const highlightSpec = {
    version: '1.0' as const,
    ui: {
      type: 'grid',
      props: { columns: 3, gap: '12px' },
      children: [
        { type: 'highlight', props: { value: '$1.2M', label: 'Annual recurring revenue', delta: '+12.4%', description: 'Trailing 12 months' } },
        { type: 'highlight', props: { value: '94%', label: 'Customer retention', delta: '-1.1%', description: 'Quarterly cohort' } },
        { type: 'highlight', props: { value: '142ms', label: 'p95 response time', tone: 'neutral', description: 'Last 7 days' } }
      ]
    }
  };

  const definitionListSpec = {
    version: '1.0' as const,
    ui: {
      type: 'definition-list',
      props: {
        items: [
          { term: 'Spec', definition: 'A JSON object that describes a UI tree, state, and event flows.' },
          { term: 'Bind', definition: 'A two-way reactive link between a widget value and a state path.' },
          { term: 'Flow', definition: 'A composite event handler with sequential steps and on_error fallback.' },
          { term: 'Intent', definition: 'A high-level UI goal (browse, form, dashboard) that the layout engine renders.' }
        ]
      }
    }
  };

  const articleMetaSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'heading', props: { text: 'Why interactive UI belongs in your AI responses', level: 3 } },
        {
          type: 'article-meta',
          props: {
            author: 'Ada Lovelace',
            role: 'Founding engineer',
            avatar: 'https://i.pravatar.cc/64?img=47',
            date: 'April 30, 2026',
            readTime: '6 min read'
          }
        }
      ]
    }
  };

  const faqSpec = {
    version: '1.0' as const,
    ui: {
      type: 'accordion',
      props: {
        items: [
          { value: 'q1', title: 'How is this different from a templating engine?', content: 'Specs include reactive state, expressions, and event flows — not just static substitution. Bind is two-way; on_change runs flows.' },
          { value: 'q2', title: 'Can the LLM see what the user typed?', content: 'Yes. Use the onStateChange callback on <Ripple> to receive every state write, or the emit / api actions for explicit notification.' },
          { value: 'q3', title: 'Is the markdown widget safe for untrusted input?', content: 'It renders raw HTML in markdown source via {@html}. Sanitize untrusted markdown on the host before passing it to Ripple.' }
        ]
      }
    }
  };

  // ── Display Widgets ─────────────────────────────────────────

  const textSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '4px' },
      children: [
        { type: 'text', props: { text: 'Extra small text', size: 'xs' } },
        { type: 'text', props: { text: 'Small text', size: 'sm' } },
        { type: 'text', props: { text: 'Base text (default)', size: 'base' } },
        { type: 'text', props: { text: 'Large text', size: 'lg' } },
        { type: 'text', props: { text: 'Extra large text', size: 'xl' } },
        { type: 'text', props: { text: '2XL bold text', size: '2xl', weight: 'bold' } },
      ]
    }
  };

  const headingSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '4px' },
      children: [
        { type: 'heading', props: { text: 'Heading Level 1', level: 1 } },
        { type: 'heading', props: { text: 'Heading Level 2', level: 2 } },
        { type: 'heading', props: { text: 'Heading Level 3', level: 3 } },
        { type: 'heading', props: { text: 'Heading Level 4', level: 4 } },
      ]
    }
  };

  const imageSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '12px', align: 'end' },
      children: [
        { type: 'image', props: { src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&q=70', alt: 'Landscape', width: 120, height: 80, rounded: 'md' } },
        { type: 'image', props: { src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&q=70', alt: 'Landscape', width: 80, height: 80, rounded: 'full' } },
        { type: 'image', props: { src: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=200&q=70', alt: 'Landscape', width: 120, height: 80, rounded: 'lg' } },
      ]
    }
  };

  const badgeSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '6px', wrap: 'wrap' },
      children: [
        { type: 'badge', props: { text: 'Default', variant: 'default' } },
        { type: 'badge', props: { text: 'Secondary', variant: 'secondary' } },
        { type: 'badge', props: { text: 'Destructive', variant: 'destructive' } },
        { type: 'badge', props: { text: 'Outline', variant: 'outline' } },
        { type: 'badge', props: { text: 'Success', variant: 'success' } },
        { type: 'badge', props: { text: 'Warning', variant: 'warning' } },
      ]
    }
  };

  const progressSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '10px' },
      children: [
        { type: 'progress', props: { value: 25 } },
        { type: 'progress', props: { value: 60, variant: 'thin' } },
        { type: 'progress', props: { value: 90, variant: 'thick' } },
      ]
    }
  };

  const avatarSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '8px', align: 'center' },
      children: [
        { type: 'avatar', props: { src: 'https://i.pravatar.cc/40?u=a', fallback: 'AB' } },
        { type: 'avatar', props: { src: 'https://i.pravatar.cc/40?u=b', fallback: 'CD' } },
        { type: 'avatar', props: { fallback: 'EF' } },
      ]
    }
  };

  const metricSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '24px' },
      children: [
        { type: 'metric', props: { label: 'Revenue', value: '$42K', trend: '+12%' } },
        { type: 'metric', props: { label: 'Users', value: '1,204', trend: '-3%', variant: 'compact' } },
        { type: 'metric', props: { label: 'Latency', value: '42ms', variant: 'horizontal' } },
      ]
    }
  };

  const feedSpec = {
    version: '1.0' as const,
    ui: {
      type: 'feed',
      props: {
        items: [
          { text: 'Deployment completed successfully', time: '2m ago', type: 'success' },
          { text: 'Database migration started', time: '5m ago', type: 'info' },
          { text: 'High memory usage detected', time: '12m ago', type: 'warning' },
          { text: 'Build failed on main branch', time: '18m ago', type: 'error' },
        ]
      }
    }
  };

  const markdownSpec = {
    version: '1.0' as const,
    ui: {
      type: 'markdown',
      props: {
        content: [
          '## Heading 2',
          '',
          'A short paragraph with **bold**, *italic*, ~~strikethrough~~, and `inline code`.',
          'Visit [Anthropic](https://anthropic.com) for more.',
          '',
          '- list item one',
          '- list item two',
          '  - nested',
          '',
          '> Block quote with a hint of italic.',
          '',
          '| col a | col b |',
          '| --- | --- |',
          '| alpha | beta |',
          '| gamma | delta |',
          '',
          '```ts',
          'const greeting = (name: string) => `Hello, ${name}!`;',
          '```'
        ].join('\n')
      }
    }
  };

  const codeBlockSvelte = [
    '<' + 'script>',
    '  let count = $state(0);',
    '</' + 'script>',
    '',
    '<button onclick={() => count++}>',
    '  clicks: {count}',
    '</button>'
  ].join('\n');

  const codeBlockJson = [
    '{',
    '  "type": "input",',
    '  "bind": "username",',
    '  "props": { "placeholder": "Your name" }',
    '}'
  ].join('\n');

  const codeBlockSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'code-block', props: { language: 'svelte', code: codeBlockSvelte } },
        { type: 'code-block', props: { language: 'json', code: codeBlockJson } }
      ]
    }
  };

  // ── Input Widgets ───────────────────────────────────────────

  const buttonSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '8px', wrap: 'wrap', align: 'center' },
      children: [
        { type: 'button', props: { label: 'Default' } },
        { type: 'button', props: { label: 'Secondary', variant: 'secondary' } },
        { type: 'button', props: { label: 'Destructive', variant: 'destructive' } },
        { type: 'button', props: { label: 'Outline', variant: 'outline' } },
        { type: 'button', props: { label: 'Ghost', variant: 'ghost' } },
        { type: 'button', props: { label: 'Link', variant: 'link' } },
        { type: 'button', props: { label: 'Small', size: 'sm' } },
        { type: 'button', props: { label: 'Large', size: 'lg' } },
      ]
    }
  };

  const inputSpec = {
    version: '1.0' as const,
    state: { name: '', email: '', keystrokes: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '10px' },
      children: [
        { type: 'input', props: { placeholder: 'Your name', label: 'Name', type: 'text' }, bind: 'name' },
        { type: 'input', props: { placeholder: 'you@example.com', label: 'Email', type: 'email' }, bind: 'email' },
        {
          type: 'input',
          props: { placeholder: 'Type to fire on_input', label: 'Live (on_input)', type: 'text' },
          on_input: { action: 'set', target: 'keystrokes' }
        },
        { type: 'input', props: { placeholder: 'Disabled field', disabled: true } },
        { type: 'text', props: { text: 'name → {state.name}  ·  email → {state.email}  ·  on_input → {state.keystrokes}', size: 'xs' } },
      ]
    }
  };

  const textareaSpec = {
    version: '1.0' as const,
    state: { bio: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'textarea',
          props: { label: 'Bio', placeholder: 'A few sentences...', rows: 3 },
          bind: 'bio'
        },
        { type: 'text', props: { text: 'Length: {state.bio.length}', size: 'xs' } },
      ]
    }
  };

  const selectSpec = {
    version: '1.0' as const,
    state: { color: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'select',
          props: {
            placeholder: 'Pick a color',
            options: [
              { value: 'red', label: 'Red' },
              { value: 'green', label: 'Green' },
              { value: 'blue', label: 'Blue' },
            ]
          },
          bind: 'color'
        },
        { type: 'text', props: { text: 'Selected → {state.color}', size: 'xs' } },
      ]
    }
  };

  const datePickerSpec = {
    version: '1.0' as const,
    state: { departure: '2026-05-15', returnDate: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'input', props: { label: 'Departure', type: 'date' }, bind: 'departure' },
        { type: 'input', props: { label: 'Return', type: 'date' }, bind: 'returnDate' },
        { type: 'text', props: { text: 'departure → {state.departure}  ·  return → {state.returnDate}', size: 'xs' } }
      ]
    }
  };

  const sliderSpec = {
    version: '1.0' as const,
    state: { volume: 40 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'slider', props: { label: 'Volume', min: 0, max: 100, step: 1 }, bind: 'volume' },
        { type: 'text', props: { text: 'volume → {state.volume}%', size: 'xs' } }
      ]
    }
  };

  const radioSpec = {
    version: '1.0' as const,
    state: { plan: 'pro' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'radio-group',
          props: {
            label: 'Plan',
            options: [
              { value: 'free', label: 'Free' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' }
            ]
          },
          bind: 'plan'
        },
        { type: 'text', props: { text: 'plan → {state.plan}', size: 'xs' } }
      ]
    }
  };

  const ratingSpec = {
    version: '1.0' as const,
    state: { stars: 3 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'rating', props: { label: 'Rate this UI', max: 5, showValue: true }, bind: 'stars' },
        { type: 'text', props: { text: 'rating → {state.stars} of 5', size: 'xs' } }
      ]
    }
  };

  const togglesSpec = {
    version: '1.0' as const,
    state: { agreed: false, dark: true },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'checkbox', props: { label: 'I agree to the terms' }, bind: 'agreed' },
        { type: 'switch', props: { label: 'Dark mode' }, bind: 'dark' },
        { type: 'text', props: { text: 'agreed → {state.agreed}  ·  dark → {state.dark}', size: 'xs' } },
      ]
    }
  };

  // ── Data Widgets ────────────────────────────────────────────

  const tableSpec = {
    version: '1.0' as const,
    ui: {
      type: 'data-table',
      props: {
        sortable: true,
        searchable: true,
        pageSize: 5,
        columns: [
          { key: 'name', label: 'Name', sortable: true },
          { key: 'role', label: 'Role', sortable: true },
          { key: 'status', label: 'Status' },
          { key: 'tickets', label: 'Tickets', sortable: true }
        ],
        rows: [
          { name: 'Alice Chen', role: 'Engineer', status: 'Active', tickets: 12 },
          { name: 'Bob Kumar', role: 'Designer', status: 'Away', tickets: 3 },
          { name: 'Carol Smith', role: 'PM', status: 'Active', tickets: 19 },
          { name: 'Dana Singh', role: 'Engineer', status: 'Active', tickets: 7 },
          { name: 'Eve Park', role: 'Researcher', status: 'Away', tickets: 1 },
          { name: 'Frank Tan', role: 'Engineer', status: 'Active', tickets: 22 },
          { name: 'Greta Olsen', role: 'Designer', status: 'Active', tickets: 5 },
          { name: 'Hugo Reyes', role: 'PM', status: 'Away', tickets: 14 }
        ],
        variant: 'striped'
      }
    }
  };

  const chartSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        {
          type: 'grid',
          props: { columns: 2, gap: '16px' },
          children: [
            {
              type: 'card',
              props: { title: 'Bar Chart', class: 'h-full' },
              children: [{
                type: 'chart',
                props: {
                  type: 'bar',
                  height: 200,
                  data: [
                    { label: 'Mon', value: 35 },
                    { label: 'Tue', value: 52 },
                    { label: 'Wed', value: 41 },
                    { label: 'Thu', value: 68 },
                    { label: 'Fri', value: 59 }
                  ]
                }
              }]
            },
            {
              type: 'card',
              props: { title: 'Pie Chart', class: 'h-full' },
              children: [{
                type: 'chart',
                props: {
                  type: 'pie',
                  height: 200,
                  data: [
                    { label: 'Desktop', value: 62 },
                    { label: 'Mobile', value: 30 },
                    { label: 'Tablet', value: 8 }
                  ]
                }
              }]
            }
          ]
        },
        {
          type: 'card',
          props: { title: 'AAPL — Candlestick (5D)' },
          children: [{
            type: 'chart',
            props: {
              type: 'candlestick',
              height: 240,
              data: [
                { label: 'Mar 24', value: 0, open: 218.55, close: 220.73, high: 221.48, low: 217.10 },
                { label: 'Mar 25', value: 0, open: 220.73, close: 223.85, high: 224.20, low: 219.90 },
                { label: 'Mar 26', value: 0, open: 224.10, close: 221.53, high: 225.61, low: 220.80 },
                { label: 'Mar 27', value: 0, open: 221.30, close: 224.37, high: 225.15, low: 220.68 },
                { label: 'Mar 28', value: 0, open: 224.50, close: 226.90, high: 227.34, low: 223.75 }
              ]
            }
          }]
        },
        {
          type: 'grid',
          props: { columns: 2, gap: '16px' },
          children: [
            {
              type: 'card',
              props: { title: 'NIFTY 50 — Area', class: 'h-full' },
              children: [{
                type: 'chart',
                props: {
                  type: 'area',
                  height: 200,
                  colors: ['#22c55e'],
                  data: [
                    { label: '9:30', value: 23420 },
                    { label: '10:00', value: 23485 },
                    { label: '10:30', value: 23510 },
                    { label: '11:00', value: 23465 },
                    { label: '11:30', value: 23530 },
                    { label: '12:00', value: 23575 },
                    { label: '12:30', value: 23550 },
                    { label: '13:00', value: 23610 },
                    { label: '13:30', value: 23590 },
                    { label: '14:00', value: 23640 },
                    { label: '14:30', value: 23680 },
                    { label: '15:00', value: 23710 },
                    { label: '15:30', value: 23695 }
                  ]
                }
              }]
            },
            {
              type: 'card',
              props: { title: 'Line — Weekly Trend', class: 'h-full' },
              children: [{
                type: 'chart',
                props: {
                  type: 'line',
                  height: 200,
                  data: [
                    { label: 'W1', value: 42 },
                    { label: 'W2', value: 38 },
                    { label: 'W3', value: 55 },
                    { label: 'W4', value: 48 },
                    { label: 'W5', value: 63 },
                    { label: 'W6', value: 71 }
                  ]
                }
              }]
            }
          ]
        },
        {
          type: 'card',
          props: { title: 'Portfolio Sparklines' },
          children: [{
            type: 'grid',
            props: { columns: 3, gap: '16px' },
            children: [
              {
                type: 'flex',
                props: { direction: 'column', gap: '6px' },
                children: [
                  {
                    type: 'flex',
                    props: { justify: 'between', align: 'center' },
                    children: [
                      { type: 'text', props: { text: 'AAPL', size: 'sm', weight: 'semibold' } },
                      { type: 'badge', props: { text: '+3.8%', variant: 'secondary' } }
                    ]
                  },
                  { type: 'chart', props: { type: 'sparkline', height: 48, data: [
                    { label: '1', value: 218 }, { label: '2', value: 220 }, { label: '3', value: 219 },
                    { label: '4', value: 222 }, { label: '5', value: 224 }, { label: '6', value: 226 }
                  ] } },
                  { type: 'text', props: { text: '$226.90', size: 'xs' } }
                ]
              },
              {
                type: 'flex',
                props: { direction: 'column', gap: '6px' },
                children: [
                  {
                    type: 'flex',
                    props: { justify: 'between', align: 'center' },
                    children: [
                      { type: 'text', props: { text: 'TSLA', size: 'sm', weight: 'semibold' } },
                      { type: 'badge', props: { text: '-5.4%', variant: 'destructive' } }
                    ]
                  },
                  { type: 'chart', props: { type: 'sparkline', height: 48, data: [
                    { label: '1', value: 280 }, { label: '2', value: 275 }, { label: '3', value: 272 },
                    { label: '4', value: 268 }, { label: '5', value: 270 }, { label: '6', value: 265 }
                  ] } },
                  { type: 'text', props: { text: '$265.10', size: 'xs' } }
                ]
              },
              {
                type: 'flex',
                props: { direction: 'column', gap: '6px' },
                children: [
                  {
                    type: 'flex',
                    props: { justify: 'between', align: 'center' },
                    children: [
                      { type: 'text', props: { text: 'NVDA', size: 'sm', weight: 'semibold' } },
                      { type: 'badge', props: { text: '+6.3%', variant: 'secondary' } }
                    ]
                  },
                  { type: 'chart', props: { type: 'sparkline', height: 48, data: [
                    { label: '1', value: 880 }, { label: '2', value: 895 }, { label: '3', value: 910 },
                    { label: '4', value: 905 }, { label: '5', value: 920 }, { label: '6', value: 935 }
                  ] } },
                  { type: 'text', props: { text: '$935.20', size: 'xs' } }
                ]
              }
            ]
          }]
        }
      ]
    }
  };

  // ── Control Flow ────────────────────────────────────────────

  const controlSpec = {
    version: '1.0' as const,
    state: { show: true, items: ['Alpha', 'Bravo', 'Charlie', 'Delta'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            { type: 'text', props: { text: 'Toggle visibility:', size: 'sm' } },
            { type: 'switch', bind: 'show' },
          ]
        },
        {
          type: 'if',
          condition: '{state.show}',
          children: [
            { type: 'card', props: { title: 'Conditional Card' }, children: [
              { type: 'text', props: { text: 'This card is conditionally rendered.', size: 'sm' } }
            ]}
          ],
          else_children: [
            { type: 'text', props: { text: 'Card is hidden. Toggle the switch above.', size: 'sm' } }
          ]
        },
        { type: 'heading', props: { text: 'Each loop', level: 4 } },
        {
          type: 'each',
          items: '{state.items}',
          item_as: 'item',
          index_as: 'i',
          children: [
            { type: 'text', props: { text: '{i}. {item}', size: 'sm' } }
          ]
        }
      ]
    }
  };

  // ── Research Widgets ────────────────────────────────────────

  const sourceCardSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '10px' },
      style: { 'overflow-x': 'auto', 'padding-bottom': '4px' },
      children: [
        { type: 'source-card', props: { source: 'reuters', title: 'Global markets rally as trade deal nears completion', color: '#0080ff' } },
        { type: 'source-card', props: { source: 'bloomberg', title: 'Central banks signal rate cuts amid cooling inflation', color: '#6366f1' } },
        { type: 'source-card', props: { source: 'ft.com', title: 'European energy prices stabilize after winter surge', color: '#f59e0b' } },
        { type: 'source-card', props: { source: 'techcrunch', title: 'AI startup raises $200M in Series C funding round', color: '#22c55e' } },
      ]
    }
  };

  const citationSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '6px', wrap: 'wrap', align: 'center' },
      children: [
        { type: 'text', props: { text: 'Inline citations:', size: 'sm' } },
        { type: 'citation', props: { source: 'reuters', color: '#0080ff', number: 1 } },
        { type: 'citation', props: { source: 'bloomberg', color: '#6366f1', number: 2 } },
        { type: 'citation', props: { source: 'nytimes', color: '#000000' } },
        { type: 'citation', props: { source: 'youtube', color: '#ff0000', number: 4 } },
      ]
    }
  };

  const sourcesBarSpec = {
    version: '1.0' as const,
    ui: {
      type: 'sources-bar',
      props: {
        sources: [
          { name: 'reuters', color: '#0080ff' },
          { name: 'bloomberg', color: '#6366f1' },
          { name: 'ft.com', color: '#f59e0b' },
          { name: 'nytimes', color: '#000000' },
          { name: 'bbc', color: '#bb1919' },
        ],
        label: 'sources'
      }
    }
  };

  const discoverSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '12px' },
      style: { 'overflow-x': 'auto', 'padding-bottom': '4px' },
      children: [
        { type: 'discover-card', props: { title: 'India and Russia Move to Restart LNG Trade', description: 'Both nations explore new energy corridors...', image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=300&q=70' } },
        { type: 'discover-card', props: { title: 'Global Chip Shortage Eases', description: 'Semiconductor supply chains stabilize after two-year disruption.', image: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=300&q=70' } },
        { type: 'discover-card', props: { title: 'Climate Report: Ocean Temperatures Hit Record', description: 'Scientists warn of cascading effects on marine ecosystems.', image: 'https://images.unsplash.com/photo-1484291470158-b8f8d608850d?w=300&q=70' } },
      ]
    }
  };

  const followUpSpec = {
    version: '1.0' as const,
    ui: {
      type: 'follow-up',
      props: { placeholder: 'Ask a follow-up question...' }
    }
  };

  // ── Interactive Flows ───────────────────────────────────────

  const counterFlow = {
    version: '1.0' as const,
    state: { count: 0 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'text', props: { text: 'Count: {state.count}', size: 'xl', weight: 'bold' } },
        {
          type: 'flex',
          props: { gap: '8px' },
          children: [
            { type: 'button', props: { label: '+1' }, on_click: { action: 'set', target: 'count', value: '{state.count + 1}' } },
            { type: 'button', props: { label: '-1', variant: 'outline' }, on_click: { action: 'set', target: 'count', value: '{state.count - 1}' } },
            { type: 'button', props: { label: 'Reset', variant: 'ghost' }, on_click: { action: 'set', target: 'count', value: 0 } },
          ]
        },
        { type: 'progress', props: { value: '{state.count}', max: 20 } },
      ]
    }
  };

  const formFlow = {
    version: '1.0' as const,
    state: { name: '', role: '', agreed: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'input', props: { label: 'Full Name', placeholder: 'Jane Doe' }, bind: 'name' },
        { type: 'select', props: { placeholder: 'Select role', options: ['Engineer', 'Designer', 'PM', 'Other'] }, bind: 'role' },
        { type: 'checkbox', props: { label: 'I accept the terms and conditions' }, bind: 'agreed' },
        {
          type: 'if',
          condition: '{state.name && state.role && state.agreed}',
          children: [
            { type: 'button', props: { label: 'Submit' }, on_click: { action: 'emit', target: 'form-submit' } }
          ],
          else_children: [
            { type: 'button', props: { label: 'Submit', disabled: true } }
          ]
        },
        { type: 'text', props: { text: 'Preview: {state.name} — {state.role}', size: 'xs' } },
      ]
    }
  };

  // Live Calculator — bind on number inputs, arithmetic in expressions
  const calculatorFlow = {
    version: '1.0' as const,
    state: { a: 5, b: 3, op: '+' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '10px' },
      children: [
        {
          type: 'flex',
          props: { gap: '8px', align: 'end' },
          children: [
            { type: 'input', props: { label: 'A', type: 'number' }, bind: 'a', class: 'flex-1' },
            {
              type: 'select',
              props: { options: ['+', '-', '*', '/'] },
              bind: 'op',
              class: 'w-20'
            },
            { type: 'input', props: { label: 'B', type: 'number' }, bind: 'b', class: 'flex-1' }
          ]
        },
        {
          type: 'if',
          condition: '{state.op == "+"}',
          children: [{ type: 'text', props: { text: '{state.a} + {state.b} = {state.a + state.b}', size: 'lg', weight: 'semibold' } }]
        },
        {
          type: 'if',
          condition: '{state.op == "-"}',
          children: [{ type: 'text', props: { text: '{state.a} − {state.b} = {state.a - state.b}', size: 'lg', weight: 'semibold' } }]
        },
        {
          type: 'if',
          condition: '{state.op == "*"}',
          children: [{ type: 'text', props: { text: '{state.a} × {state.b} = {state.a * state.b}', size: 'lg', weight: 'semibold' } }]
        },
        {
          type: 'if',
          condition: '{state.op == "/"}',
          children: [{ type: 'text', props: { text: '{state.a} ÷ {state.b} = {state.a / state.b}', size: 'lg', weight: 'semibold' } }]
        }
      ]
    }
  };

  // Stepper Wizard — current step drives which content + buttons appear
  const wizardFlow = {
    version: '1.0' as const,
    state: { step: 1, account: '', plan: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'text', props: { text: 'Step {state.step} of 3', size: 'xs' } },
        { type: 'progress', props: { max: 3 }, bind: 'step' },

        {
          type: 'if',
          condition: '{state.step == 1}',
          children: [
            { type: 'heading', props: { text: 'Create your account', level: 4 } },
            { type: 'input', props: { label: 'Email', placeholder: 'you@company.com' }, bind: 'account' }
          ]
        },
        {
          type: 'if',
          condition: '{state.step == 2}',
          children: [
            { type: 'heading', props: { text: 'Pick a plan', level: 4 } },
            {
              type: 'select',
              props: { placeholder: 'Choose…', options: ['Free', 'Pro', 'Enterprise'] },
              bind: 'plan'
            }
          ]
        },
        {
          type: 'if',
          condition: '{state.step == 3}',
          children: [
            { type: 'heading', props: { text: 'Confirm', level: 4 } },
            { type: 'text', props: { text: 'Account: {state.account}', size: 'sm' } },
            { type: 'text', props: { text: 'Plan: {state.plan}', size: 'sm' } }
          ]
        },

        {
          type: 'flex',
          props: { gap: '8px' },
          children: [
            {
              type: 'if',
              condition: '{state.step > 1}',
              children: [
                {
                  type: 'button',
                  props: { label: 'Back', variant: 'outline' },
                  on_click: { action: 'set', target: 'step', value: '{state.step - 1}' }
                }
              ]
            },
            {
              type: 'if',
              condition: '{state.step < 3}',
              children: [
                {
                  type: 'button',
                  props: { label: 'Next' },
                  on_click: { action: 'set', target: 'step', value: '{state.step + 1}' }
                }
              ]
            },
            {
              type: 'if',
              condition: '{state.step == 3}',
              children: [
                {
                  type: 'button',
                  props: { label: 'Submit' },
                  on_click: [
                    { action: 'toast', message: 'Account created for {state.account} on the {state.plan} plan!', variant: 'success' },
                    { action: 'set', target: 'step', value: 1 },
                    { action: 'set', target: 'account', value: '' },
                    { action: 'set', target: 'plan', value: '' }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  };

  // Dynamic todo list — push/remove array actions; clear input after add via flow
  const todoFlow = {
    version: '1.0' as const,
    state: { items: ['Buy milk', 'Read changelog'], draft: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'flex',
          props: { gap: '6px' },
          children: [
            {
              type: 'input',
              bind: 'draft',
              props: { placeholder: 'New item...', class: 'flex-1' }
            },
            {
              type: 'button',
              props: { label: 'Add' },
              on_click: {
                action: 'flow',
                steps: [
                  { action: 'validate', condition: '{state.draft.trim() != ""}', message: 'Type something first.' },
                  { action: 'push', target: 'items', value: '{state.draft.trim()}' },
                  { action: 'set', target: 'draft', value: '' }
                ]
              }
            }
          ]
        },
        {
          type: 'each',
          items: 'items',
          item_as: 'item',
          index_as: 'i',
          children: [
            {
              type: 'flex',
              props: { gap: '6px', align: 'center' },
              children: [
                { type: 'text', props: { text: '• {item}' }, class: 'flex-1' },
                {
                  type: 'button',
                  props: { label: '✕', variant: 'ghost', size: 'sm' },
                  on_click: { action: 'remove', target: 'items', value: '{item}' }
                }
              ]
            }
          ]
        },
        { type: 'text', props: { text: '{state.items.length} items', size: 'xs' } }
      ]
    }
  };

  // Side-by-side comparison — two cards in a grid driven by the same state
  const compareFlow = {
    version: '1.0' as const,
    state: { plan: 'pro' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'radio-group',
          props: {
            label: 'Choose your plan',
            options: [
              { value: 'free', label: 'Free' },
              { value: 'pro', label: 'Pro' },
              { value: 'enterprise', label: 'Enterprise' }
            ]
          },
          bind: 'plan'
        },
        {
          type: 'grid',
          props: { columns: 2, gap: '12px' },
          children: [
            {
              type: 'card',
              props: { title: 'Free', variant: '{state.plan == "free" ? "selected" : "default"}' },
              children: [
                { type: 'text', props: { text: '$0 / month', size: 'lg', weight: 'semibold' } },
                { type: 'text', props: { text: '• 1 user' } },
                { type: 'text', props: { text: '• Community support' } }
              ]
            },
            {
              type: 'card',
              props: { title: 'Pro', variant: '{state.plan == "pro" ? "selected" : "default"}' },
              children: [
                { type: 'text', props: { text: '$19 / month', size: 'lg', weight: 'semibold' } },
                { type: 'text', props: { text: '• Up to 10 users' } },
                { type: 'text', props: { text: '• Priority support' } }
              ]
            }
          ]
        }
      ]
    }
  };

  // Multi-select chips — toggle action adds/removes values from an array
  const multiSelectFlow = {
    version: '1.0' as const,
    state: {
      selected: ['svelte'],
      tags: ['svelte', 'react', 'vue', 'solid', 'qwik', 'angular']
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'text', props: { text: 'Pick your stack:', size: 'sm' } },
        {
          type: 'flex',
          props: { gap: '6px', wrap: 'wrap' },
          children: [
            {
              type: 'each',
              items: 'tags',
              item_as: 'tag',
              children: [
                {
                  type: 'button',
                  props: {
                    label: '{tag}',
                    variant: '{state.selected.includes(tag) ? "default" : "outline"}',
                    size: 'sm'
                  },
                  on_click: { action: 'toggle', target: 'selected', value: '{tag}' }
                }
              ]
            }
          ]
        },
        { type: 'text', props: { text: 'selected: {state.selected.join(", ")}', size: 'xs' } }
      ]
    }
  };

  // Live Filter — input + each + if condition with case-insensitive substring match
  const filterFlow = {
    version: '1.0' as const,
    state: {
      query: '',
      people: [
        { name: 'Alice Chen', role: 'Engineer' },
        { name: 'Bob Kumar', role: 'Designer' },
        { name: 'Carol Smith', role: 'PM' },
        { name: 'Dana Singh', role: 'Engineer' },
        { name: 'Eve Park', role: 'Researcher' }
      ]
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'input', props: { placeholder: 'Filter by name or role...' }, bind: 'query' },
        {
          type: 'each',
          items: 'people',
          item_as: 'p',
          children: [
            {
              type: 'if',
              condition: '{p.name.toLowerCase().includes(state.query.toLowerCase()) || p.role.toLowerCase().includes(state.query.toLowerCase())}',
              children: [
                {
                  type: 'flex',
                  props: { gap: '8px', align: 'center' },
                  children: [
                    { type: 'avatar', props: { name: '{p.name}', size: 'sm' } },
                    { type: 'text', props: { text: '{p.name}', weight: 'medium' } },
                    { type: 'badge', props: { text: '{p.role}', variant: 'secondary' } }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  };

  // Delete with Confirmation — confirm action → toast on confirm
  const confirmFlow = {
    version: '1.0' as const,
    state: { item: 'project-alpha' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '10px' },
      children: [
        { type: 'text', props: { text: 'Item: {state.item}', size: 'sm' } },
        {
          type: 'button',
          props: { label: 'Delete', variant: 'destructive' },
          on_click: {
            action: 'confirm',
            title: 'Delete {state.item}?',
            message: 'This cannot be undone. Type the name in your head and click Confirm.',
            confirm_label: 'Delete',
            cancel_label: 'Keep',
            on_confirm: [
              { action: 'set', target: 'item', value: '(deleted)' },
              { action: 'toast', message: 'Deleted.', variant: 'success' }
            ],
            on_cancel: [
              { action: 'toast', message: 'Cancelled — nothing was deleted.' }
            ]
          }
        }
      ]
    }
  };

  // Issue Tracker — comprehensive E2E flow where every interaction is wired
  const issueTrackerFlow = {
    version: '1.0' as const,
    state: {
      issues: [
        { id: 1, title: 'Login broken on Safari', body: 'Users on iOS 17 see a blank screen after submitting the form.', status: 'open', priority: 'high', assignee: 'Ada' },
        { id: 2, title: 'Search returns stale results', body: 'After deleting an item, it still appears in search until the index rebuilds.', status: 'in_progress', priority: 'medium', assignee: 'Bob' },
        { id: 3, title: 'Add Slack integration', body: 'Customers want notifications when a thread is updated.', status: 'open', priority: 'low', assignee: 'Carol' },
        { id: 4, title: 'p99 latency regression', body: 'Last deploy bumped p99 from 280ms to 410ms on the search endpoint.', status: 'in_progress', priority: 'high', assignee: 'Dana' },
        { id: 5, title: 'Update onboarding copy', body: 'Marketing requested fresh copy on the welcome step.', status: 'closed', priority: 'low', assignee: 'Eve' }
      ],
      query: '',
      statusFilter: 'all',
      selected: 1,
      draftTitle: '',
      nextId: 6
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        // Header
        {
          type: 'page-header',
          props: { eyebrow: 'PROJECT', title: 'Issues', subtitle: 'A complete spec where every button, dropdown, and filter is wired.' }
        },

        // Filter row
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            { type: 'input', props: { placeholder: 'Search title or assignee...', class: 'flex-1' }, bind: 'query' },
            {
              type: 'select',
              props: {
                placeholder: 'All statuses',
                options: [
                  { value: 'all', label: 'All' },
                  { value: 'open', label: 'Open' },
                  { value: 'in_progress', label: 'In progress' },
                  { value: 'closed', label: 'Closed' }
                ]
              },
              bind: 'statusFilter'
            }
          ]
        },

        // Two-pane: list + detail
        {
          type: 'grid',
          props: { columns: 2, gap: '12px' },
          style: { 'grid-template-columns': '1fr 1.4fr' },
          children: [
            // ── master list
            {
              type: 'flex',
              props: { direction: 'column', gap: '6px' },
              children: [
                {
                  type: 'each',
                  items: 'issues',
                  item_as: 'issue',
                  index_as: 'i',
                  children: [
                    {
                      type: 'if',
                      condition: '{(state.statusFilter == "all" || issue.status == state.statusFilter) && (state.query.trim() == "" || issue.title.toLowerCase().includes(state.query.toLowerCase()) || issue.assignee.toLowerCase().includes(state.query.toLowerCase()))}',
                      children: [
                        {
                          type: 'flex',
                          props: { gap: '8px', align: 'center' },
                          class: '{state.selected == issue.id ? "rounded-md bg-muted/60 border border-border p-2" : "rounded-md border border-transparent p-2 hover:bg-muted/30"}',
                          children: [
                            {
                              type: 'flex',
                              props: { direction: 'column', gap: '2px' },
                              class: 'flex-1 min-w-0 cursor-pointer',
                              children: [
                                {
                                  type: 'flex',
                                  props: { gap: '6px', align: 'center' },
                                  children: [
                                    { type: 'text', props: { text: '{issue.title}', size: 'sm', weight: 'medium' } },
                                    { type: 'badge', props: { text: '{issue.priority}', variant: '{issue.priority == "high" ? "destructive" : issue.priority == "medium" ? "default" : "secondary"}' } }
                                  ]
                                },
                                { type: 'text', props: { text: '@{issue.assignee} · {issue.status}', size: 'xs' } }
                              ],
                              on_click: { action: 'set', target: 'selected', value: '{issue.id}' }
                            },
                            {
                              type: 'dropdown-menu',
                              props: {
                                label: '⋯',
                                triggerVariant: 'ghost',
                                hideChevron: true,
                                align: 'end',
                                items: [
                                  { label: 'Mark in progress', icon: 'play', value: 'progress-{i}' },
                                  { label: 'Mark closed', icon: 'check', value: 'close-{i}' },
                                  { label: 'Reopen', icon: 'rotate-ccw', value: 'reopen-{i}' },
                                  { type: 'separator' },
                                  { label: 'Delete', icon: 'trash-2', value: 'delete-{issue.id}', variant: 'destructive' }
                                ]
                              },
                              on_change: {
                                action: 'flow',
                                steps: [
                                  // Stash the dropdown value into state so the branches can read it.
                                  { action: 'set', target: '_row_action' },
                                  {
                                    action: 'branch',
                                    if: '{state._row_action.startsWith("progress-")}',
                                    then: [
                                      { action: 'set', target: 'issues.{i}.status', value: 'in_progress' },
                                      { action: 'toast', message: 'Moved to in progress.' }
                                    ]
                                  },
                                  {
                                    action: 'branch',
                                    if: '{state._row_action.startsWith("close-")}',
                                    then: [
                                      { action: 'set', target: 'issues.{i}.status', value: 'closed' },
                                      { action: 'toast', message: 'Closed issue.', variant: 'success' }
                                    ]
                                  },
                                  {
                                    action: 'branch',
                                    if: '{state._row_action.startsWith("reopen-")}',
                                    then: [
                                      { action: 'set', target: 'issues.{i}.status', value: 'open' },
                                      { action: 'toast', message: 'Reopened.' }
                                    ]
                                  },
                                  {
                                    action: 'branch',
                                    if: '{state._row_action.startsWith("delete-")}',
                                    then: [
                                      {
                                        action: 'confirm',
                                        title: 'Delete this issue?',
                                        message: 'This cannot be undone.',
                                        confirm_label: 'Delete',
                                        on_confirm: [
                                          { action: 'remove', target: 'issues', value: '{issue}' },
                                          { action: 'toast', message: 'Deleted.', variant: 'success' }
                                        ]
                                      }
                                    ]
                                  }
                                ]
                              }
                            }
                          ]
                        }
                      ]
                    }
                  ]
                },

                // Empty state
                {
                  type: 'if',
                  condition: '{state.issues.length == 0}',
                  children: [
                    {
                      type: 'empty-state',
                      props: { icon: 'inbox', title: 'No issues yet', description: 'Add the first one below.' }
                    }
                  ]
                },

                // Add new
                {
                  type: 'flex',
                  props: { gap: '6px' },
                  children: [
                    { type: 'input', bind: 'draftTitle', props: { placeholder: 'New issue title...', class: 'flex-1' } },
                    {
                      type: 'button',
                      props: { label: 'Add' },
                      on_click: {
                        action: 'flow',
                        steps: [
                          { action: 'validate', condition: '{state.draftTitle.trim() != ""}', message: 'Type a title first.' },
                          { action: 'push', target: 'issues', value: { id: '{state.nextId}', title: '{state.draftTitle.trim()}', body: '', status: 'open', priority: 'medium', assignee: 'You' } },
                          { action: 'set', target: 'nextId', value: '{state.nextId + 1}' },
                          { action: 'set', target: 'selected', value: '{state.nextId - 1}' },
                          { action: 'set', target: 'draftTitle', value: '' },
                          { action: 'toast', message: 'Issue created.', variant: 'success' }
                        ]
                      }
                    }
                  ]
                }
              ]
            },

            // ── detail
            {
              type: 'card',
              props: { title: 'Detail' },
              children: [
                {
                  type: 'each',
                  items: 'issues',
                  item_as: 'issue',
                  index_as: 'i',
                  children: [
                    {
                      type: 'if',
                      condition: '{state.selected == issue.id}',
                      children: [
                        {
                          type: 'flex',
                          props: { direction: 'column', gap: '10px' },
                          children: [
                            { type: 'heading', props: { text: '{issue.title}', level: 4 } },
                            {
                              type: 'flex',
                              props: { gap: '8px', wrap: 'wrap' },
                              children: [
                                { type: 'badge', props: { text: '{issue.status}' } },
                                { type: 'badge', props: { text: '{issue.priority}', variant: '{issue.priority == "high" ? "destructive" : "secondary"}' } },
                                { type: 'badge', props: { text: '@{issue.assignee}', variant: 'outline' } }
                              ]
                            },
                            { type: 'text', props: { text: '{issue.body}', size: 'sm' } },
                            { type: 'separator' },
                            {
                              type: 'flex',
                              props: { direction: 'column', gap: '6px' },
                              children: [
                                { type: 'text', props: { text: 'Status', size: 'xs', weight: 'medium' } },
                                {
                                  type: 'select',
                                  props: {
                                    value: '{issue.status}',
                                    options: [
                                      { value: 'open', label: 'Open' },
                                      { value: 'in_progress', label: 'In progress' },
                                      { value: 'closed', label: 'Closed' }
                                    ]
                                  },
                                  on_change: { action: 'set', target: 'issues.{i}.status' }
                                }
                              ]
                            },
                            {
                              type: 'flex',
                              props: { direction: 'column', gap: '6px' },
                              children: [
                                { type: 'text', props: { text: 'Priority', size: 'xs', weight: 'medium' } },
                                {
                                  type: 'select',
                                  props: {
                                    value: '{issue.priority}',
                                    options: [
                                      { value: 'low', label: 'Low' },
                                      { value: 'medium', label: 'Medium' },
                                      { value: 'high', label: 'High' }
                                    ]
                                  },
                                  on_change: { action: 'set', target: 'issues.{i}.priority' }
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },

        // Stats footer
        {
          type: 'flex',
          props: { gap: '16px' },
          children: [
            { type: 'text', props: { text: 'Total: {state.issues.length}', size: 'xs' } },
            { type: 'text', props: { text: 'Selected: {state.selected}', size: 'xs' } }
          ]
        }
      ]
    }
  };

  const researchFlow = {
    version: '1.0' as const,
    state: {},
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '20px' },
      children: [
        { type: 'heading', props: { text: 'AI Regulation: Where Do We Stand in 2026?', level: 2 } },
        { type: 'text', props: {
          text: 'The global landscape for AI regulation has shifted dramatically over the past year, with the EU AI Act now fully enforced, and the US debating its own federal framework.',
          size: 'base'
        }},
        {
          type: 'flex',
          props: { gap: '10px' },
          style: { 'overflow-x': 'auto', 'padding-bottom': '4px' },
          children: [
            { type: 'source-card', props: { source: 'wired', title: 'EU AI Act enforcement begins with first penalties', color: '#000' } },
            { type: 'source-card', props: { source: 'techcrunch', title: 'US senators introduce bipartisan AI safety bill', color: '#22c55e' } },
            { type: 'source-card', props: { source: 'reuters', title: 'China updates AI governance rules for 2026', color: '#0080ff' } },
          ]
        },
        { type: 'heading', props: { text: 'Key Developments', level: 3 } },
        { type: 'text', props: {
          text: 'The EU has issued its first fines under the AI Act, targeting companies that failed to disclose AI-generated content. Meanwhile, the US Senate has introduced a bipartisan bill focused on AI safety testing requirements.',
          size: 'sm'
        }},
        {
          type: 'flex',
          props: { gap: '6px', wrap: 'wrap' },
          children: [
            { type: 'citation', props: { source: 'wired', color: '#000', number: 1 } },
            { type: 'citation', props: { source: 'techcrunch', color: '#22c55e', number: 2 } },
          ]
        },
        { type: 'sources-bar', props: {
          sources: [
            { name: 'wired', color: '#000' },
            { name: 'techcrunch', color: '#22c55e' },
            { name: 'reuters', color: '#0080ff' },
          ],
          label: 'sources'
        }},
        { type: 'heading', props: { text: 'Discover more', level: 4 } },
        {
          type: 'flex',
          props: { gap: '12px' },
          style: { 'overflow-x': 'auto', 'padding-bottom': '4px' },
          children: [
            { type: 'discover-card', props: { title: 'EU fines first AI companies under new act', description: 'Penalties target non-disclosure of AI content...', image: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=300&q=70' } },
            { type: 'discover-card', props: { title: 'US AI Safety Bill: What It Means', description: 'New requirements for testing and auditing AI systems...', image: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=300&q=70' } },
          ]
        },
        { type: 'follow-up', props: { placeholder: 'Ask follow-up about AI regulation...' } }
      ]
    }
  };

  // ── Section data ────────────────────────────────────────────

  const sections = [
    { id: 'layout', title: 'Layout', items: [
      { label: 'Container', spec: containerSpec },
      { label: 'Flex', spec: flexSpec },
      { label: 'Grid', spec: gridSpec },
      { label: 'Card', spec: cardSpec },
      { label: 'Tabs', spec: tabsSpec },
      { label: 'Accordion', spec: accordionSpec },
      { label: 'Separator', spec: separatorSpec },
      { label: 'Alert', spec: alertSpec },
      { label: 'Dropdown Menu', spec: dropdownMenuSpec },
      { label: 'Sheet / Drawer', spec: sheetSpec },
      { label: 'Page Header', spec: pageHeaderSpec },
      { label: 'Hero', spec: heroSpec },
      { label: 'Section', spec: sectionSpec },
      { label: 'Empty State', spec: emptyStateSpec },
      { label: 'Sidebar', spec: sidebarSpec },
      { label: 'App Shell', spec: appShellSpec },
      { label: 'Master / Detail', spec: masterDetailSpec },
    ]},
    { id: 'display', title: 'Display', items: [
      { label: 'Text', spec: textSpec },
      { label: 'Heading', spec: headingSpec },
      { label: 'Image', spec: imageSpec },
      { label: 'Badge', spec: badgeSpec },
      { label: 'Progress', spec: progressSpec },
      { label: 'Avatar', spec: avatarSpec },
      { label: 'Metric', spec: metricSpec },
      { label: 'Feed', spec: feedSpec },
      { label: 'Markdown', spec: markdownSpec },
      { label: 'Code Block', spec: codeBlockSpec },
      { label: 'Pros / Cons', spec: prosConsSpec },
      { label: 'Comparison Table', spec: comparisonTableSpec },
      { label: 'Steps', spec: stepsSpec },
      { label: 'Quote', spec: quoteSpec },
      { label: 'Highlight', spec: highlightSpec },
      { label: 'Definition List', spec: definitionListSpec },
      { label: 'Article Meta', spec: articleMetaSpec },
      { label: 'FAQ (accordion)', spec: faqSpec },
    ]},
    { id: 'input', title: 'Input', items: [
      { label: 'Button', spec: buttonSpec },
      { label: 'Input', spec: inputSpec },
      { label: 'Textarea', spec: textareaSpec },
      { label: 'Date Picker', spec: datePickerSpec },
      { label: 'Select', spec: selectSpec },
      { label: 'Slider', spec: sliderSpec },
      { label: 'Radio Group', spec: radioSpec },
      { label: 'Rating', spec: ratingSpec },
      { label: 'Checkbox & Switch', spec: togglesSpec },
    ]},
    { id: 'data', title: 'Data', items: [
      { label: 'Table', spec: tableSpec },
      { label: 'Chart', spec: chartSpec },
    ]},
    { id: 'control', title: 'Control Flow', items: [
      { label: 'If / Each', spec: controlSpec },
    ]},
    { id: 'research', title: 'Research', items: [
      { label: 'Source Card', spec: sourceCardSpec },
      { label: 'Citation', spec: citationSpec },
      { label: 'Sources Bar', spec: sourcesBarSpec },
      { label: 'Discover Card', spec: discoverSpec },
      { label: 'Follow-up', spec: followUpSpec },
    ]},
    { id: 'flows', title: 'Interactive Flows', items: [
      { label: 'Issue Tracker (full E2E)', spec: issueTrackerFlow },
      { label: 'Counter', spec: counterFlow },
      { label: 'Live Calculator', spec: calculatorFlow },
      { label: 'Live Filter', spec: filterFlow },
      { label: 'Multi-select Chips', spec: multiSelectFlow },
      { label: 'Dynamic Todo List', spec: todoFlow },
      { label: 'Plan Comparison', spec: compareFlow },
      { label: 'Stepper Wizard', spec: wizardFlow },
      { label: 'Delete with Confirmation', spec: confirmFlow },
      { label: 'Form with Validation', spec: formFlow },
      { label: 'Research Article', spec: researchFlow },
    ]},
  ];

  // ── Showcase navigation state ───────────────────────────────

  let activeId = $state('flows');

  function readHash() {
    if (typeof window === 'undefined') return;
    const id = window.location.hash.replace('#', '').trim();
    if (id && sections.some((s) => s.id === id)) activeId = id;
  }

  $effect(() => {
    readHash();
    const onHash = () => readHash();
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  });

  const active = $derived(sections.find((s) => s.id === activeId) ?? sections[0]);

  let filter = $state('');

  function pickCategory(id: string) {
    activeId = id;
    if (typeof window !== 'undefined') {
      history.replaceState(null, '', `#${id}`);
    }
    filter = '';
  }

  const visibleItems = $derived(
    filter.trim() === ''
      ? active.items
      : active.items.filter((i) => i.label.toLowerCase().includes(filter.toLowerCase()))
  );
</script>

<div class="showcase-layout">
  <aside class="showcase-aside">
    <div class="aside-head">
      <h1 class="aside-title">Ripple</h1>
      <p class="aside-sub">Showcase</p>
    </div>
    <nav class="aside-nav">
      {#each sections as s}
        <button
          class="nav-btn"
          class:active={s.id === activeId}
          onclick={() => pickCategory(s.id)}
        >
          <span class="nav-label">{s.title}</span>
          <span class="nav-count">{s.items.length}</span>
        </button>
      {/each}
    </nav>
    <div class="aside-foot">
      <code>@ripple-ui/svelte</code>
    </div>
  </aside>

  <main class="showcase-main">
    <header class="main-head">
      <div>
        <h2 class="main-title">{active.title}</h2>
        <p class="main-sub">{active.items.length} {active.items.length === 1 ? 'demo' : 'demos'} — every interaction is wired through the spec.</p>
      </div>
      <input
        class="filter"
        type="search"
        placeholder="Filter {active.title.toLowerCase()}..."
        bind:value={filter}
      />
    </header>

    <div class="showcase-grid">
      {#each visibleItems as item (item.label)}
        <div class="showcase-item">
          <h3 class="showcase-item-title">{item.label}</h3>
          <div class="showcase-item-demo">
            <Ripple spec={item.spec} onEvent={handleEvent} />
          </div>
        </div>
      {/each}
      {#if visibleItems.length === 0}
        <div class="empty">No demos match "{filter}".</div>
      {/if}
    </div>
  </main>
</div>

<style>
  .showcase-layout {
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
    min-height: calc(100vh - 60px);
    color: hsl(var(--foreground));
  }
  .showcase-aside {
    border-right: 1px solid hsl(var(--border));
    background: hsl(var(--card) / 0.4);
    display: flex;
    flex-direction: column;
    position: sticky;
    top: 60px;
    height: calc(100vh - 60px);
    overflow-y: auto;
  }
  .aside-head {
    padding: 1.25rem 1rem 0.75rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  .aside-title {
    font-size: 1.05rem;
    font-weight: 700;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .aside-sub {
    font-size: 0.75rem;
    color: hsl(var(--muted-foreground));
    margin: 0.1rem 0 0;
  }
  .aside-nav {
    flex: 1;
    padding: 0.5rem;
    display: flex;
    flex-direction: column;
    gap: 1px;
  }
  .nav-btn {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    border: none;
    border-radius: 6px;
    background: transparent;
    color: hsl(var(--muted-foreground));
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    text-align: left;
    transition: background 0.12s, color 0.12s;
  }
  .nav-btn:hover {
    background: hsl(var(--muted) / 0.6);
    color: hsl(var(--foreground));
  }
  .nav-btn.active {
    background: hsl(var(--muted));
    color: hsl(var(--foreground));
    font-weight: 600;
  }
  .nav-count {
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground));
    background: hsl(var(--background));
    border: 1px solid hsl(var(--border));
    border-radius: 999px;
    padding: 1px 7px;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
  .nav-btn.active .nav-count {
    border-color: hsl(var(--primary) / 0.4);
    color: hsl(var(--foreground));
  }
  .aside-foot {
    padding: 0.75rem 1rem;
    border-top: 1px solid hsl(var(--border));
    font-size: 0.7rem;
    color: hsl(var(--muted-foreground));
  }
  .aside-foot code {
    background: hsl(var(--muted) / 0.5);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.7rem;
  }
  .showcase-main {
    padding: 2rem 2rem 4rem;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
  }
  .main-head {
    display: flex;
    align-items: end;
    justify-content: space-between;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.25rem;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  .main-title {
    font-size: 1.5rem;
    font-weight: 700;
    margin: 0 0 0.15rem;
    letter-spacing: -0.01em;
  }
  .main-sub {
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
    margin: 0;
  }
  .filter {
    height: 32px;
    padding: 0 10px;
    width: 240px;
    max-width: 100%;
    border: 1px solid hsl(var(--border));
    border-radius: 7px;
    background: hsl(var(--background));
    color: hsl(var(--foreground));
    font-size: 0.85rem;
    outline: none;
    transition: border-color 0.15s;
  }
  .filter:focus {
    border-color: hsl(var(--ring));
    box-shadow: 0 0 0 3px hsl(var(--ring) / 0.2);
  }
  .showcase-grid {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }
  .showcase-item {
    border: 1px solid hsl(var(--border));
    border-radius: 10px;
    overflow: hidden;
  }
  .showcase-item-title {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 8px 14px;
    margin: 0;
    background: hsl(var(--muted) / 0.25);
    border-bottom: 1px solid hsl(var(--border));
    color: hsl(var(--muted-foreground));
    text-transform: uppercase;
    letter-spacing: 0.04em;
  }
  .showcase-item-demo {
    padding: 16px;
  }
  .empty {
    padding: 2rem;
    text-align: center;
    font-size: 0.85rem;
    color: hsl(var(--muted-foreground));
    border: 1px dashed hsl(var(--border));
    border-radius: 10px;
  }
  @media (max-width: 720px) {
    .showcase-layout {
      grid-template-columns: 1fr;
    }
    .showcase-aside {
      position: static;
      height: auto;
      border-right: none;
      border-bottom: 1px solid hsl(var(--border));
    }
    .aside-nav {
      flex-direction: row;
      flex-wrap: wrap;
    }
    .showcase-main {
      padding: 1.5rem 1rem 3rem;
    }
  }
</style>
