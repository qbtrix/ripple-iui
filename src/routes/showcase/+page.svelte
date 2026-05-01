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

  const breadcrumbSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'breadcrumb',
          props: {
            items: [
              { label: 'Home', href: '/', icon: 'home' },
              { label: 'Library', href: '/library' },
              { label: 'Books', href: '/library/books' },
              { label: 'The Pragmatic Programmer' }
            ]
          }
        },
        {
          type: 'breadcrumb',
          props: {
            separator: 'slash',
            items: [
              { label: 'Settings', href: '/settings' },
              { label: 'Billing', href: '/settings/billing' },
              { label: 'Invoices' }
            ]
          }
        },
        {
          type: 'breadcrumb',
          props: {
            separator: '·',
            items: [
              { label: 'Projects' },
              { label: 'Ripple' },
              { label: 'Wave 2' }
            ]
          }
        }
      ]
    }
  };

  const splitSpec = {
    version: '1.0' as const,
    state: { paneSize: 35 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'split',
          style: { height: '220px', border: '1px solid hsl(var(--border))', 'border-radius': '8px' },
          props: { direction: 'horizontal', defaultSize: 35, minSize: 15, maxSize: 70 },
          start: {
            type: 'flex',
            props: { direction: 'column', gap: '4px' },
            style: { padding: '12px' },
            children: [
              { type: 'heading', props: { text: 'Left pane', level: 4 } },
              { type: 'text', props: { text: 'Drag the divider →', size: 'sm', muted: true } }
            ]
          },
          end: {
            type: 'flex',
            props: { direction: 'column', gap: '4px' },
            style: { padding: '12px' },
            children: [
              { type: 'heading', props: { text: 'Right pane', level: 4 } },
              { type: 'text', props: { text: 'Pane content scrolls independently.', size: 'sm', muted: true } }
            ]
          },
          on_resize: { action: 'set', target: 'paneSize', value: '{event}' }
        },
        { type: 'text', props: { text: 'Pane size: {state.paneSize}%', size: 'xs' } }
      ]
    }
  };

  const masterDetailSpec = {
    version: '1.0' as const,
    state: {
      selected: 1,
      issues: [
        { id: 1, label: 'Login broken on Safari', description: 'Users on iOS 17 see a blank screen.', body: 'Users on iOS 17 see a blank screen after submitting the form.', badge: 'Open' },
        { id: 2, label: 'Search returns stale results', description: 'Deleted items linger in the index.', body: 'After deleting an item, it still appears in search until the index rebuilds.', badge: 'Triaged' },
        { id: 3, label: 'Add Slack integration', description: 'Notifications on thread updates.', body: 'Customers want notifications when a thread is updated.', badge: 'Open' }
      ]
    },
    ui: {
      type: 'master-detail',
      bind: 'selected',
      props: {
        items: '{state.issues}',
        width: '240px',
        emptyText: 'Pick an issue from the list',
        detail: {
          type: 'flex',
          props: { direction: 'column', gap: '8px' },
          children: [
            {
              type: 'flex',
              props: { align: 'center', gap: '8px' },
              children: [
                { type: 'heading', props: { text: '{item.label}', level: 3 } },
                { type: 'badge', props: { text: '{item.badge}', variant: 'secondary' } }
              ]
            },
            { type: 'text', props: { text: '{item.body}', size: 'sm' } }
          ]
        }
      }
    }
  };

  const tooltipSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '12px', wrap: 'wrap' },
      children: [
        {
          type: 'tooltip',
          props: { content: 'Saves your changes', side: 'top' },
          hasChildren: true,
          children: [
            { type: 'button', props: { label: 'Save', variant: 'outline' } }
          ]
        },
        {
          type: 'tooltip',
          props: { content: 'Discards everything', side: 'right' },
          hasChildren: true,
          children: [
            { type: 'button', props: { label: 'Reset', variant: 'ghost' } }
          ]
        }
      ]
    }
  };

  const popoverSpec = {
    version: '1.0' as const,
    state: { popName: '' },
    ui: {
      type: 'flex',
      props: { gap: '12px', align: 'start' },
      children: [
        {
          type: 'popover',
          props: {
            side: 'bottom',
            content: {
              type: 'flex',
              props: { direction: 'column', gap: '8px' },
              children: [
                { type: 'heading', props: { text: 'Quick edit', level: 5 } },
                { type: 'input', props: { label: 'Display name' }, bind: 'popName' },
                { type: 'text', props: { text: 'Hello, {state.popName || "stranger"}!', size: 'xs' } }
              ]
            }
          },
          hasChildren: true,
          children: [
            { type: 'button', props: { label: 'Open popover', variant: 'outline' } }
          ]
        }
      ]
    }
  };

  const hoverCardSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '12px' },
      children: [
        {
          type: 'hover-card',
          props: {
            side: 'bottom',
            content: {
              type: 'flex',
              props: { gap: '12px', align: 'center' },
              children: [
                { type: 'avatar-group', props: { users: [{ fallback: 'JD' }], size: 'lg' } },
                {
                  type: 'flex',
                  props: { direction: 'column', gap: '2px' },
                  children: [
                    { type: 'text', props: { text: 'Jane Doe', weight: 'semibold' } },
                    { type: 'text', props: { text: 'Software engineer', size: 'sm' }, class: 'text-muted-foreground' },
                    { type: 'text', props: { text: '@jdoe · Joined Mar 2024', size: 'xs' }, class: 'text-muted-foreground mt-1' }
                  ]
                }
              ]
            }
          },
          hasChildren: true,
          children: [
            { type: 'button', props: { label: '@jdoe', variant: 'link' } }
          ]
        }
      ]
    }
  };

  const toastSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'flex',
          props: { gap: '8px', wrap: 'wrap' },
          children: [
            { type: 'button', props: { label: 'Info' }, on_click: { action: 'toast', message: 'Just so you know.', variant: 'info' } },
            { type: 'button', props: { label: 'Success', variant: 'outline' }, on_click: { action: 'toast', message: 'All done!', variant: 'success' } },
            { type: 'button', props: { label: 'Warning', variant: 'outline' }, on_click: { action: 'toast', message: 'Heads up.', variant: 'warning' } },
            { type: 'button', props: { label: 'Error', variant: 'destructive' }, on_click: { action: 'toast', message: 'Something failed.', variant: 'error' } }
          ]
        },
        { type: 'text', props: { text: 'Toasts appear bottom-right and auto-dismiss after 4s.', size: 'xs' }, class: 'text-muted-foreground' },
        { type: 'toast', props: { position: 'bottom-right' } }
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

  const loadingSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '24px', align: 'center', wrap: 'wrap' },
      children: [
        { type: 'loading', props: { inline: true, showLabel: true, label: 'Loading…' } },
        { type: 'loading', props: { size: 24, inline: true } },
        { type: 'loading', props: { size: 32, inline: true } }
      ]
    }
  };

  const avatarGroupSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'avatar-group',
          props: {
            size: 'sm',
            users: [{ fallback: 'AB' }, { fallback: 'CD' }, { fallback: 'EF' }, { fallback: 'GH' }, { fallback: 'IJ' }]
          }
        },
        {
          type: 'avatar-group',
          props: {
            size: 'md',
            max: 3,
            users: [{ fallback: 'AB' }, { fallback: 'CD' }, { fallback: 'EF' }, { fallback: 'GH' }, { fallback: 'IJ' }]
          }
        },
        {
          type: 'avatar-group',
          props: {
            size: 'lg',
            users: [{ fallback: 'AB' }, { fallback: 'CD' }, { fallback: 'EF' }]
          }
        }
      ]
    }
  };

  const chipSpec = {
    version: '1.0' as const,
    state: { chips: ['svelte', 'tailwind', 'typescript'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'flex',
          props: { gap: '8px', wrap: 'wrap', align: 'center' },
          children: [
            { type: 'chip', props: { label: 'default' } },
            { type: 'chip', props: { label: 'primary', variant: 'primary' } },
            { type: 'chip', props: { label: 'success', variant: 'success' } },
            { type: 'chip', props: { label: 'warning', variant: 'warning' } },
            { type: 'chip', props: { label: 'destructive', variant: 'destructive' } }
          ]
        },
        {
          type: 'flex',
          props: { gap: '8px', wrap: 'wrap' },
          children: [
            {
              type: 'each',
              items: 'chips',
              item_as: 'tag',
              children: [
                {
                  type: 'chip',
                  props: { label: '{tag}', variant: 'primary', closable: true },
                  on_close: { action: 'remove', target: 'chips', value: '{tag}' }
                }
              ]
            }
          ]
        }
      ]
    }
  };

  const kbdSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            { type: 'text', props: { text: 'Open command palette', size: 'sm' } },
            { type: 'kbd', props: { keys: ['⌘', 'K'] } }
          ]
        },
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            { type: 'text', props: { text: 'Submit form', size: 'sm' } },
            { type: 'kbd', props: { keys: ['⌘', 'Enter'] } }
          ]
        },
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            { type: 'text', props: { text: 'Confirm', size: 'sm' } },
            { type: 'kbd', props: { keys: 'Enter' } }
          ]
        }
      ]
    }
  };

  const statusDotSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'status-dot', props: { variant: 'online', label: 'Online — pulsing', pulse: true } },
        { type: 'status-dot', props: { variant: 'busy', label: 'Busy' } },
        { type: 'status-dot', props: { variant: 'away', label: 'Away' } },
        { type: 'status-dot', props: { variant: 'offline', label: 'Offline' } },
        { type: 'status-dot', props: { variant: 'custom', color: '#a855f7', label: 'Custom (purple)' } }
      ]
    }
  };

  const trendSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '24px', wrap: 'wrap', align: 'center' },
      children: [
        { type: 'trend', props: { value: 12.4 } },
        { type: 'trend', props: { value: -3.2 } },
        { type: 'trend', props: { value: 0 } },
        { type: 'trend', props: { value: 1500, format: 'currency' } },
        { type: 'trend', props: { value: -250, format: 'currency' } },
        { type: 'trend', props: { value: 42, format: 'number', precision: 0 } }
      ]
    }
  };

  const iconSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '16px', wrap: 'wrap', align: 'center' },
      children: [
        { type: 'icon', props: { name: 'sparkles', size: 20 } },
        { type: 'icon', props: { name: 'zap', size: 20 } },
        { type: 'icon', props: { name: 'rocket', size: 20 } },
        { type: 'icon', props: { name: 'heart', size: 20, color: '#ef4444' } },
        { type: 'icon', props: { name: 'star', size: 20, color: '#f59e0b' } },
        { type: 'icon', props: { name: 'check-circle', size: 20, color: '#10b981' } }
      ]
    }
  };

  const copySpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px', align: 'start' },
      children: [
        { type: 'copy', props: { value: 'sk_test_abc123def456', label: 'API key' } },
        { type: 'copy', props: { value: 'a1b2c3d4-e5f6', size: 'sm' } }
      ]
    }
  };

  const inlineCodeSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'text',
          props: { text: 'Inline code is rendered with a subtle pill background.', size: 'sm' }
        },
        {
          type: 'flex',
          props: { gap: '6px', align: 'center', wrap: 'wrap' },
          children: [
            { type: 'text', props: { text: 'Try', size: 'sm' } },
            { type: 'code', props: { value: 'const sum = a + b' } },
            { type: 'text', props: { text: 'or just', size: 'sm' } },
            { type: 'code', props: { value: 'npm install' } }
          ]
        }
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

  const comboboxSpec = {
    version: '1.0' as const,
    state: { country: 'us' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'combobox',
          bind: 'country',
          props: {
            label: 'Country',
            placeholder: 'Pick a country',
            searchPlaceholder: 'Type to search…',
            options: [
              { value: 'us', label: 'United States', description: 'North America' },
              { value: 'ca', label: 'Canada', description: 'North America' },
              { value: 'mx', label: 'Mexico', description: 'North America' },
              { value: 'gb', label: 'United Kingdom', description: 'Europe' },
              { value: 'fr', label: 'France', description: 'Europe' },
              { value: 'de', label: 'Germany', description: 'Europe' },
              { value: 'jp', label: 'Japan', description: 'Asia' },
              { value: 'kr', label: 'South Korea', description: 'Asia' },
              { value: 'in', label: 'India', description: 'Asia' },
              { value: 'br', label: 'Brazil', description: 'South America' }
            ]
          }
        },
        { type: 'text', props: { text: 'Selected → {state.country}', size: 'xs' } }
      ]
    }
  };

  // ── Enterprise verticals (Wave 3b) ──────────────────────────

  const pricingTableSpec = {
    version: '1.0' as const,
    state: { plan: '' },
    ui: {
      type: 'pricing-table',
      on_select: { action: 'set', target: 'plan', value: '{event}' },
      props: {
        tiers: [
          {
            id: 'free',
            name: 'Free',
            price: 0,
            period: 'forever',
            description: 'Tinker with the platform — no card needed.',
            cta: 'Get started',
            features: ['100 API calls/day', 'Community support', { label: 'SLA', included: false }]
          },
          {
            id: 'pro',
            name: 'Pro',
            price: 19,
            period: 'mo',
            description: 'For serious builders.',
            popular: true,
            cta: 'Start trial',
            features: ['10K API calls/day', 'Email support', '99.9% SLA', 'Audit log']
          },
          {
            id: 'team',
            name: 'Team',
            price: 49,
            period: 'mo',
            description: 'Collaborative workspaces.',
            cta: 'Contact sales',
            features: ['Unlimited calls', 'Priority support', '99.99% SLA', 'SSO + RBAC']
          }
        ]
      }
    }
  };

  const settingsListSpec = {
    version: '1.0' as const,
    state: { darkMode: false, notify: true, twoFactor: false, lang: 'en' },
    ui: {
      type: 'settings-list',
      props: {
        items: [
          {
            group: 'Appearance',
            label: 'Dark mode',
            description: 'Use the dark theme across the app.',
            control: { type: 'switch', bind: 'darkMode' }
          },
          {
            group: 'Appearance',
            label: 'Language',
            description: 'Display language for the UI.',
            control: {
              type: 'select',
              props: { options: [{ value: 'en', label: 'English' }, { value: 'es', label: 'Español' }, { value: 'ja', label: '日本語' }] },
              bind: 'lang'
            }
          },
          {
            group: 'Account',
            label: 'Email notifications',
            description: 'Send weekly summaries to your inbox.',
            control: { type: 'switch', bind: 'notify' }
          },
          {
            group: 'Security',
            label: 'Two-factor authentication',
            description: 'Require an authenticator app on sign in.',
            control: { type: 'switch', bind: 'twoFactor' }
          }
        ]
      }
    }
  };

  const commentThreadSpec = {
    version: '1.0' as const,
    ui: {
      type: 'comment-thread',
      props: {
        comments: [
          {
            id: 1,
            author: 'Ada Lovelace',
            timestamp: '2 hours ago',
            body: "I left inline comments. Most are nits, but the auth flow needs another pass — refresh-token semantics aren't obvious from the docstring.",
            replies: [
              { id: 11, author: 'Bob Kumar', timestamp: '1 hour ago', body: "Good catch. I'll add a worked example to the README." },
              {
                id: 12, author: 'Carol Smith', timestamp: '40 minutes ago',
                body: "Same here — the renewal window confused me too.",
                replies: [
                  { id: 121, author: 'Ada Lovelace', timestamp: '20 minutes ago', body: 'Filed a follow-up issue.' }
                ]
              }
            ]
          },
          { id: 2, author: 'Dana Singh', timestamp: '15 minutes ago', body: 'p99 looks healthier today. Nice work all around.' }
        ]
      }
    }
  };

  const auditLogSpec = {
    version: '1.0' as const,
    ui: {
      type: 'audit-log',
      props: {
        entries: [
          { id: 1, actor: 'Ada Lovelace', actorIcon: 'user', action: 'created project', target: 'paw/ripple', timestamp: '2026-04-30 09:14', severity: 'success' },
          { id: 2, actor: 'Bob Kumar', actorIcon: 'user', action: 'invited', target: 'carol@example.com', timestamp: '2026-04-30 10:02', severity: 'info', details: { role: 'editor', expiresAt: '2026-05-30' } },
          { id: 3, actor: 'system', actorIcon: 'cog', action: 'rotated API key', target: 'pk_live_xxx', timestamp: '2026-04-30 12:00', severity: 'warning' },
          { id: 4, actor: 'Carol Smith', actorIcon: 'user', action: 'deleted', target: 'old-staging-bucket', timestamp: '2026-04-30 16:30', severity: 'destructive', details: { confirmed: true, byPolicy: 'retention/30d' } }
        ]
      }
    }
  };

  const apiKeySpec = {
    version: '1.0' as const,
    state: { rotated: 0 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'api-key',
          props: {
            label: 'Server API key',
            description: 'Used by your backend.',
            value: 'pk_live_4f3b9c72ad5e8f1c33ab998207'
          },
          on_rotate: { action: 'set', target: 'rotated', value: '{state.rotated + 1}' }
        },
        { type: 'text', props: { text: 'Rotate clicks: {state.rotated}', size: 'xs' } }
      ]
    }
  };

  const bulkActionBarSpec = {
    version: '1.0' as const,
    state: { selectedCount: 3 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            { type: 'text', props: { text: 'Select count:', size: 'sm' } },
            { type: 'button', props: { label: '0', variant: 'outline', size: 'sm' }, on_click: { action: 'set', target: 'selectedCount', value: 0 } },
            { type: 'button', props: { label: '1', variant: 'outline', size: 'sm' }, on_click: { action: 'set', target: 'selectedCount', value: 1 } },
            { type: 'button', props: { label: '3', variant: 'outline', size: 'sm' }, on_click: { action: 'set', target: 'selectedCount', value: 3 } },
            { type: 'button', props: { label: '12', variant: 'outline', size: 'sm' }, on_click: { action: 'set', target: 'selectedCount', value: 12 } }
          ]
        },
        {
          type: 'bulk-action-bar',
          props: {
            selectedCount: '{state.selectedCount}',
            noun: 'issue',
            actions: [
              { id: 'archive', label: 'Archive', icon: 'archive' },
              { id: 'tag', label: 'Tag', icon: 'tag' },
              { id: 'assign', label: 'Assign', icon: 'user-plus' },
              { id: 'delete', label: 'Delete', icon: 'trash-2', variant: 'destructive' }
            ]
          },
          on_clear: { action: 'set', target: 'selectedCount', value: 0 }
        }
      ]
    }
  };

  const savedViewsSpec = {
    version: '1.0' as const,
    state: { activeView: 'open' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'saved-views',
          bind: 'activeView',
          props: {
            canCreate: true,
            views: [
              { id: 'open', label: 'Open issues', count: 24, pinned: true },
              { id: 'mine', label: 'Assigned to me', count: 7 },
              { id: 'recent', label: 'Recently updated', count: 12 },
              { id: 'archived', label: 'Archived', count: 41 }
            ]
          }
        },
        { type: 'text', props: { text: 'Active view → {state.activeView}', size: 'xs' } }
      ]
    }
  };

  const peoplePickerSpec = {
    version: '1.0' as const,
    state: { reviewers: ['ada', 'carol'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'people-picker',
          bind: 'reviewers',
          props: {
            label: 'Reviewers',
            multiple: true,
            people: [
              { id: 'ada', name: 'Ada Lovelace', email: 'ada@example.com', role: 'Eng' },
              { id: 'bob', name: 'Bob Kumar', email: 'bob@example.com', role: 'Design' },
              { id: 'carol', name: 'Carol Smith', email: 'carol@example.com', role: 'PM' },
              { id: 'dana', name: 'Dana Singh', email: 'dana@example.com', role: 'Eng' },
              { id: 'eve', name: 'Eve Park', email: 'eve@example.com', role: 'Mkt' }
            ]
          }
        },
        { type: 'text', props: { text: 'Reviewers → {state.reviewers.length} selected', size: 'xs' } }
      ]
    }
  };

  const permissionMatrixSpec = {
    version: '1.0' as const,
    state: {
      acl: {
        admin__read: true, admin__write: true, admin__delete: true, admin__invite: true,
        editor__read: true, editor__write: true, editor__delete: false, editor__invite: false,
        viewer__read: true, viewer__write: false, viewer__delete: false, viewer__invite: false
      }
    },
    ui: {
      type: 'permission-matrix',
      bind: 'acl',
      props: {
        roles: [
          { id: 'admin', label: 'Admin', description: 'Full control' },
          { id: 'editor', label: 'Editor', description: 'Read + write' },
          { id: 'viewer', label: 'Viewer', description: 'Read-only' }
        ],
        permissions: [
          { id: 'read', label: 'Read', description: 'View resources' },
          { id: 'write', label: 'Write', description: 'Create / update' },
          { id: 'delete', label: 'Delete', description: 'Remove resources' },
          { id: 'invite', label: 'Invite', description: 'Add new members' }
        ]
      }
    }
  };

  const orgChartSpec = {
    version: '1.0' as const,
    state: { selectedEmployee: 'cto' },
    ui: {
      type: 'org-chart',
      bind: 'selectedEmployee',
      props: {
        root: {
          id: 'ceo',
          name: 'Ada Lovelace',
          title: 'CEO',
          children: [
            {
              id: 'cto',
              name: 'Bob Kumar',
              title: 'CTO',
              children: [
                { id: 'eng-lead', name: 'Carol Smith', title: 'Eng Lead' },
                { id: 'qa-lead', name: 'Dana Singh', title: 'QA Lead' }
              ]
            },
            {
              id: 'cfo',
              name: 'Eve Park',
              title: 'CFO',
              children: [
                { id: 'fin-lead', name: 'Frank Diaz', title: 'Finance Lead' }
              ]
            },
            { id: 'cmo', name: 'Grace Hu', title: 'CMO' }
          ]
        }
      }
    }
  };

  const invoiceLinesSpec = {
    version: '1.0' as const,
    ui: {
      type: 'invoice-lines',
      props: {
        currency: '$',
        lines: [
          { id: 1, description: 'Pro plan', note: 'Annual subscription', quantity: 1, unitPrice: 228 },
          { id: 2, description: 'Additional seats', quantity: 4, unitPrice: 12 },
          { id: 3, description: 'Implementation services', quantity: 6, unitPrice: 150 }
        ],
        summary: [
          { label: 'Discount (LAUNCH20)', value: 50, isNegative: true },
          { label: 'Tax (8.875%)', value: 105.45 }
        ]
      }
    }
  };

  // ── Wave 4 — final cleanup ───────────────────────────────────

  const searchSpec = {
    version: '1.0' as const,
    state: { q: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'search',
          bind: 'q',
          props: {
            placeholder: 'Find anything…',
            results: [
              { id: 'i1', label: 'Login broken on Safari', description: '#142 · open', icon: 'bug', group: 'Issues' },
              { id: 'i2', label: 'Add Slack integration', description: '#147 · open', icon: 'bug', group: 'Issues' },
              { id: 'p1', label: 'Ripple', description: 'UI library', icon: 'folder-git-2', group: 'Projects' },
              { id: 'p2', label: 'Pocketpaw', description: 'Agent server', icon: 'folder-git-2', group: 'Projects' },
              { id: 'u1', label: 'Ada Lovelace', description: 'ada@example.com', icon: 'user', group: 'People' }
            ]
          }
        },
        { type: 'text', props: { text: 'Query → "{state.q}"', size: 'xs' } }
      ]
    }
  };

  const treeTableSpec = {
    version: '1.0' as const,
    ui: {
      type: 'tree-table',
      props: {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'size', label: 'Size', align: 'right', width: '120px' },
          { key: 'modified', label: 'Modified', align: 'right', width: '160px' }
        ],
        rows: [
          {
            id: 'src', name: 'src/', size: '—', modified: '2026-04-30',
            children: [
              { id: 'src-lib', name: 'lib/', size: '—', modified: '2026-04-30',
                children: [
                  { id: 'src-lib-state', name: 'state.ts', size: '4.1 KB', modified: '2026-04-29' },
                  { id: 'src-lib-utils', name: 'utils.ts', size: '1.7 KB', modified: '2026-04-28' }
                ]
              },
              { id: 'src-index', name: 'index.ts', size: '0.8 KB', modified: '2026-04-30' }
            ]
          },
          { id: 'tests', name: 'tests/', size: '—', modified: '2026-04-27',
            children: [
              { id: 'tests-state', name: 'state.test.ts', size: '2.3 KB', modified: '2026-04-27' }
            ]
          },
          { id: 'readme', name: 'README.md', size: '5.6 KB', modified: '2026-04-25' }
        ],
        defaultExpanded: 'first-level'
      }
    }
  };

  const calendarSpec = {
    version: '1.0' as const,
    state: { calDay: '2026-05-15' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'calendar',
          bind: 'calDay',
          props: {
            view: 'month',
            events: [
              { id: 1, title: 'Demo dry run', start: '2026-05-12', color: '#3b82f6' },
              { id: 2, title: 'Sprint review', start: '2026-05-15', color: '#22c55e' },
              { id: 3, title: 'Customer interview', start: '2026-05-15', color: '#f59e0b' },
              { id: 4, title: 'Launch window', start: '2026-05-20', end: '2026-05-22', color: '#ec4899' },
              { id: 5, title: 'On-call rotation', start: '2026-05-26', end: '2026-05-30', color: '#a855f7' }
            ]
          }
        },
        { type: 'text', props: { text: 'Selected → {state.calDay}', size: 'xs' } }
      ]
    }
  };

  const contextMenuSpec = {
    version: '1.0' as const,
    state: { lastAction: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'context-menu',
          on_change: { action: 'set', target: 'lastAction', value: '{event}' },
          props: {
            trigger: 'Right-click anywhere here',
            items: [
              { label: 'Open', value: 'open', icon: 'arrow-up-right', shortcut: '⌘O' },
              { label: 'Rename', value: 'rename', icon: 'pencil', shortcut: 'F2' },
              { label: 'Duplicate', value: 'duplicate', icon: 'copy', shortcut: '⌘D' },
              { type: 'separator' },
              { label: 'Move to trash', value: 'delete', icon: 'trash-2', variant: 'destructive' }
            ]
          }
        },
        { type: 'text', props: { text: 'Last action → {state.lastAction || "(none)"}', size: 'xs' } }
      ]
    }
  };

  const notificationCenterSpec = {
    version: '1.0' as const,
    state: {
      notes: [
        { id: 1, title: 'Build failed on main', description: 'commit a3f8e2 · 2 minutes ago', timestamp: '2 min ago', severity: 'destructive', icon: 'alert-triangle' },
        { id: 2, title: 'Carol commented on your PR', description: '"LGTM, just one nit on the auth flow."', timestamp: '14 min ago', severity: 'info', icon: 'message-square', read: false },
        { id: 3, title: 'Deploy succeeded', description: 'Production · v2.4.1', timestamp: '1 hour ago', severity: 'success', icon: 'check', read: false },
        { id: 4, title: 'Your subscription renews soon', description: 'In 7 days · $19/mo', timestamp: 'yesterday', severity: 'warning', icon: 'credit-card', read: true }
      ]
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'flex',
          props: { gap: '12px', align: 'center' },
          children: [
            { type: 'text', props: { text: 'Bell trigger:', size: 'sm' } },
            { type: 'notification-center', bind: 'notes' }
          ]
        },
        { type: 'notification-center', bind: 'notes', props: { inline: true } }
      ]
    }
  };

  const errorStateSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'error-state',
          props: {
            title: "We couldn't load this dashboard",
            description: 'The metrics service returned an unexpected error. Try again in a moment, or contact support if it persists.',
            actionLabel: 'Retry',
            secondaryLabel: 'Contact support',
            detail: 'TimeoutError: upstream did not respond within 5000ms (req_id: 9a7e2c4f)'
          }
        }
      ]
    }
  };

  const mentionSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'text',
          props: { size: 'sm', text: 'Hover the names below.' }
        },
        {
          type: 'flex',
          props: { gap: '8px', wrap: 'wrap', align: 'center' },
          children: [
            {
              type: 'mention',
              props: {
                name: 'ada',
                displayName: 'Ada Lovelace',
                role: 'CEO',
                bio: 'Building tools that make AI generate UI you can trust.'
              }
            },
            {
              type: 'mention',
              props: {
                name: 'bob',
                displayName: 'Bob Kumar',
                role: 'CTO',
                bio: 'Distributed systems & language runtimes. Likes Erlang, regrets nothing.'
              }
            },
            {
              type: 'mention',
              props: { name: 'carol', plain: true }
            }
          ]
        }
      ]
    }
  };

  const linkPreviewSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'link-preview',
          props: {
            url: 'https://svelte.dev',
            title: 'Svelte • Cybernetically enhanced web apps',
            description: 'Svelte is a radical new approach to building user interfaces. Whereas traditional frameworks do the bulk of their work in the browser, Svelte shifts that work into a compile step.',
            domain: 'svelte.dev'
          }
        },
        {
          type: 'link-preview',
          props: {
            url: 'https://anthropic.com/claude',
            title: 'Claude — Anthropic',
            description: "Claude is a family of foundational AI models for any use case.",
            domain: 'anthropic.com',
            layout: 'horizontal'
          }
        }
      ]
    }
  };

  const activityFeedSpec = {
    version: '1.0' as const,
    ui: {
      type: 'activity-feed',
      props: {
        items: [
          { id: 1, actor: 'Ada', action: 'opened pull request', target: '#142', timestamp: '2 min ago' },
          { id: 2, actor: 'Bob', action: 'merged', target: '#138', timestamp: '14 min ago' },
          { id: 3, actor: 'Carol', action: 'commented on', target: '#142', timestamp: '20 min ago' }
        ]
      }
    }
  };

  const qrSpec = {
    version: '1.0' as const,
    state: { qrText: 'https://ripple-ui.dev' },
    ui: {
      type: 'flex',
      props: { gap: '24px', align: 'start', wrap: 'wrap' },
      children: [
        { type: 'qr', props: { value: '{state.qrText}', size: 160, caption: 'Scan me' } },
        {
          type: 'flex',
          props: { direction: 'column', gap: '8px' },
          style: { 'min-width': '240px' },
          children: [
            { type: 'input', props: { label: 'Encode', placeholder: 'URL or text' }, bind: 'qrText' },
            { type: 'text', props: { text: 'Live update — type above to regenerate.', size: 'xs', muted: true } }
          ]
        }
      ]
    }
  };

  const diffSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'diff',
          props: {
            title: 'src/utils.ts',
            mode: 'lines',
            layout: 'unified',
            before: 'export function add(a, b) {\n  return a + b;\n}\n\nexport function sub(a, b) {\n  return a - b;\n}\n',
            after: 'export function add(a: number, b: number): number {\n  return a + b;\n}\n\nexport function sub(a: number, b: number): number {\n  return a - b;\n}\n\nexport function mul(a: number, b: number): number {\n  return a * b;\n}\n'
          }
        },
        {
          type: 'diff',
          props: {
            title: 'inline word diff',
            mode: 'words',
            before: 'The quick brown fox jumps over the lazy dog.',
            after: 'The fast brown fox leaps over the sleeping dog.'
          }
        }
      ]
    }
  };

  const coachmarkSpec = {
    version: '1.0' as const,
    state: { tourActive: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            {
              type: 'button',
              id: 'tour-target-1',
              props: { label: 'Start tour', variant: 'default' },
              on_click: { action: 'set', target: 'tourActive', value: true }
            },
            {
              type: 'button',
              id: 'tour-target-2',
              props: { label: 'Some action', variant: 'outline' }
            },
            {
              type: 'badge',
              id: 'tour-target-3',
              props: { text: 'New', variant: 'default' }
            }
          ]
        },
        {
          type: 'coachmark',
          bind: 'tourActive',
          props: {
            steps: [
              { target: '#tour-target-1', title: 'Welcome', description: 'This is the start button — click it to launch the onboarding flow.' },
              { target: '#tour-target-2', title: 'Take action', description: 'From here you can perform the primary task. Try it after the tour.' },
              { target: '#tour-target-3', title: 'New stuff', description: 'Look out for these badges to discover features as we ship them.' }
            ]
          }
        }
      ]
    }
  };

  const richTextSpec = {
    version: '1.0' as const,
    state: { note: '<h2>Welcome</h2><p>Try <strong>bold</strong>, <em>italic</em>, lists, and more.</p>' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'rich-text', props: { label: 'Note', minHeight: '160px' }, bind: 'note' },
        { type: 'text', props: { text: 'Length: {state.note.length} chars', size: 'xs' } }
      ]
    }
  };

  const codeEditorSpec = {
    version: '1.0' as const,
    state: {
      code: '{\n  "version": "1.0",\n  "ui": {\n    "type": "container",\n    "children": []\n  }\n}'
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'code-editor', props: { label: 'Spec (JSON)', language: 'json', height: '220px' }, bind: 'code' },
        { type: 'text', props: { text: 'Lines: {state.code.split("\\n").length}', size: 'xs' } }
      ]
    }
  };

  const ganttSpec = {
    version: '1.0' as const,
    state: { ganttView: 'Day' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'segmented',
          bind: 'ganttView',
          props: {
            label: 'View',
            options: ['Quarter Day', 'Day', 'Week', 'Month']
          }
        },
        {
          type: 'gantt',
          props: {
            viewMode: '{state.ganttView}',
            height: '320px',
            tasks: [
              { id: 'design', name: 'Design system', start: '2026-05-01', end: '2026-05-10', progress: 100 },
              { id: 'api', name: 'API spec', start: '2026-05-05', end: '2026-05-18', progress: 70, dependencies: 'design' },
              { id: 'frontend', name: 'Frontend', start: '2026-05-15', end: '2026-06-05', progress: 30, dependencies: 'api' },
              { id: 'backend', name: 'Backend', start: '2026-05-12', end: '2026-06-02', progress: 45, dependencies: 'api' },
              { id: 'qa', name: 'QA', start: '2026-06-01', end: '2026-06-12', progress: 0, dependencies: 'frontend, backend' },
              { id: 'launch', name: 'Launch', start: '2026-06-13', end: '2026-06-15', progress: 0, dependencies: 'qa' }
            ]
          }
        }
      ]
    }
  };

  const sankeySpec = {
    version: '1.0' as const,
    ui: {
      type: 'sankey',
      props: {
        title: 'Acquisition flow',
        height: 320,
        nodes: [
          { name: 'Search' }, { name: 'Social' }, { name: 'Email' }, { name: 'Direct' },
          { name: 'Landing' }, { name: 'Pricing' }, { name: 'Sign-up' }, { name: 'Activated' }
        ],
        links: [
          { source: 'Search', target: 'Landing', value: 5400 },
          { source: 'Social', target: 'Landing', value: 2200 },
          { source: 'Email', target: 'Pricing', value: 1500 },
          { source: 'Direct', target: 'Landing', value: 1200 },
          { source: 'Direct', target: 'Pricing', value: 600 },
          { source: 'Landing', target: 'Pricing', value: 4800 },
          { source: 'Pricing', target: 'Sign-up', value: 3300 },
          { source: 'Sign-up', target: 'Activated', value: 2100 }
        ]
      }
    }
  };

  const treemapSpec = {
    version: '1.0' as const,
    ui: {
      type: 'treemap',
      props: {
        title: 'Spend by category',
        height: 320,
        data: [
          {
            name: 'Compute',
            children: [
              { name: 'API servers', value: 12000 },
              { name: 'Workers', value: 4200 },
              { name: 'Cron', value: 1100 }
            ]
          },
          {
            name: 'Storage',
            children: [
              { name: 'Postgres', value: 6800 },
              { name: 'S3', value: 3300 },
              { name: 'Redis', value: 1900 }
            ]
          },
          {
            name: 'Observability',
            children: [
              { name: 'Logs', value: 2400 },
              { name: 'Metrics', value: 1300 },
              { name: 'APM', value: 900 }
            ]
          },
          { name: 'Misc', value: 800 }
        ]
      }
    }
  };

  const sparklineSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'flex',
          props: { gap: '12px', wrap: 'wrap' },
          children: [
            {
              type: 'card',
              props: { title: 'Revenue (7d)' },
              children: [
                { type: 'sparkline', props: { values: [12, 14, 13, 18, 22, 19, 28], height: 36 } }
              ]
            },
            {
              type: 'card',
              props: { title: 'Errors (7d)' },
              children: [
                { type: 'sparkline', props: { values: [9, 7, 8, 6, 5, 4, 2], height: 36 } }
              ]
            },
            {
              type: 'card',
              props: { title: 'Latency p99' },
              children: [
                { type: 'sparkline', props: { values: [110, 130, 145, 200, 320, 410, 380], height: 36 } }
              ]
            }
          ]
        }
      ]
    }
  };

  const gaugeSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '16px', wrap: 'wrap' },
      children: [
        { type: 'gauge', props: { value: 72, label: 'CPU', height: 200 }, style: { width: '220px' } },
        { type: 'gauge', props: { value: 38, label: 'Memory', height: 200 }, style: { width: '220px' } },
        { type: 'gauge', props: { value: 91, label: 'Disk', height: 200 }, style: { width: '220px' } }
      ]
    }
  };

  const funnelSpec = {
    version: '1.0' as const,
    ui: {
      type: 'funnel',
      props: {
        title: 'Sign-up funnel',
        height: 280,
        data: [
          { label: 'Visited', value: 12000 },
          { label: 'Signed up', value: 4800 },
          { label: 'Verified', value: 3200 },
          { label: 'Activated', value: 2100 },
          { label: 'Subscribed', value: 740 }
        ]
      }
    }
  };

  const heatmapSpec = {
    version: '1.0' as const,
    ui: {
      type: 'heatmap',
      props: {
        title: 'Commits per weekday × hour',
        height: 280,
        cells: (() => {
          const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
          const hours = ['9', '10', '11', '12', '13', '14', '15', '16', '17'];
          const out: Array<{ x: string; y: string; value: number }> = [];
          for (const d of days) for (const h of hours) {
            out.push({ x: d, y: h, value: Math.floor(Math.random() * 12) });
          }
          return out;
        })(),
        xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
        yLabels: ['9', '10', '11', '12', '13', '14', '15', '16', '17']
      }
    }
  };

  const progressRingSpec = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { gap: '16px', align: 'center', wrap: 'wrap' },
      children: [
        { type: 'progress-ring', props: { value: 25, size: 56 } },
        { type: 'progress-ring', props: { value: 60, size: 72, thickness: 8 } },
        { type: 'progress-ring', props: { value: 88, size: 96, thickness: 10, label: 'Done' } },
        { type: 'progress-ring', props: { value: 3, max: 5, size: 64, label: '3/5' } }
      ]
    }
  };

  const numberInputSpec = {
    version: '1.0' as const,
    state: { qty: 1, price: 49 },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'number-input', props: { label: 'Quantity', min: 0, max: 99 }, bind: 'qty' },
        { type: 'number-input', props: { label: 'Price (USD)', min: 0, step: 1 }, bind: 'price' },
        { type: 'text', props: { text: 'Subtotal: ${state.qty * state.price}', size: 'sm' } }
      ]
    }
  };

  const otpInputSpec = {
    version: '1.0' as const,
    state: { code: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'otp-input', props: { label: 'Verification code', length: 6 }, bind: 'code' },
        { type: 'text', props: { text: 'Code → {state.code}', size: 'xs' } }
      ]
    }
  };

  const segmentedSpec = {
    version: '1.0' as const,
    state: { range: 'week', filters: ['active'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px', align: 'start' },
      children: [
        {
          type: 'segmented',
          bind: 'range',
          props: {
            label: 'Time range',
            options: ['day', 'week', 'month', 'year']
          }
        },
        {
          type: 'segmented',
          bind: 'filters',
          props: {
            label: 'Filters (multi)',
            multiple: true,
            options: [
              { value: 'active', label: 'Active' },
              { value: 'starred', label: 'Starred' },
              { value: 'shared', label: 'Shared' }
            ]
          }
        },
        { type: 'text', props: { text: 'range → {state.range}  ·  filters → {state.filters.length}', size: 'xs' } }
      ]
    }
  };

  const collapsibleSpec = {
    version: '1.0' as const,
    state: { detailsOpen: false },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'collapsible',
          bind: 'detailsOpen',
          props: { title: 'Show technical details' },
          children: [
            { type: 'text', props: { text: 'Rendered with Svelte 5 runes; 0 hydration cost; tree-shaken icons.', size: 'sm' } }
          ]
        }
      ]
    }
  };

  const colorPickerSpec = {
    version: '1.0' as const,
    state: { brand: '#6366f1' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px', align: 'start' },
      children: [
        { type: 'color-picker', props: { label: 'Brand color' }, bind: 'brand' },
        { type: 'text', props: { text: 'Brand → {state.brand}', size: 'xs' } }
      ]
    }
  };

  const dataGridSpec = {
    version: '1.0' as const,
    state: { selectedRow: null as number | null },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'data-grid',
          bind: 'selectedRow',
          props: {
            pageSize: 5,
            defaultSort: 'salary:desc',
            columns: [
              { key: 'name', label: 'Name', sortable: true, width: '160px' },
              { key: 'role', label: 'Role', sortable: true },
              {
                key: 'status', label: 'Status', sortable: true,
                formatter: {
                  type: 'badge',
                  props: { text: '{value}', variant: '{value == "active" ? "default" : "secondary"}' }
                }
              },
              { key: 'salary', label: 'Salary', sortable: true, align: 'right' }
            ],
            rows: [
              { id: 1, name: 'Ada Lovelace', role: 'Engineer', status: 'active', salary: 145000 },
              { id: 2, name: 'Bob Kumar', role: 'Designer', status: 'active', salary: 120000 },
              { id: 3, name: 'Carol Smith', role: 'PM', status: 'leave', salary: 130000 },
              { id: 4, name: 'Dana Singh', role: 'Engineer', status: 'active', salary: 155000 },
              { id: 5, name: 'Eve Park', role: 'Engineer', status: 'active', salary: 140000 },
              { id: 6, name: 'Frank Diaz', role: 'Designer', status: 'leave', salary: 115000 },
              { id: 7, name: 'Grace Hu', role: 'PM', status: 'active', salary: 135000 },
              { id: 8, name: 'Hank Liu', role: 'Engineer', status: 'active', salary: 150000 }
            ]
          }
        },
        { type: 'text', props: { text: 'Selected row id → {state.selectedRow ?? "(none)"}', size: 'xs' } }
      ]
    }
  };

  const kanbanSpec = {
    version: '1.0' as const,
    state: {
      cards: [
        { id: 1, title: 'Login broken on Safari', description: 'iOS 17 blank screen.', status: 'todo' },
        { id: 2, title: 'Search returns stale results', description: 'Index does not refresh.', status: 'todo' },
        { id: 3, title: 'p99 latency regression', description: '280ms → 410ms on /search', status: 'in_progress' },
        { id: 4, title: 'Add Slack integration', description: 'Notify on thread updates.', status: 'in_progress' },
        { id: 5, title: 'Update onboarding copy', description: 'Marketing copy refresh.', status: 'review' },
        { id: 6, title: 'Migration plan', description: 'Postgres 14 → 16 plan.', status: 'done' }
      ]
    },
    ui: {
      type: 'kanban',
      bind: 'cards',
      props: {
        columns: [
          { id: 'todo', title: 'To do', accentClass: 'bg-zinc-400' },
          { id: 'in_progress', title: 'In progress', accentClass: 'bg-amber-400' },
          { id: 'review', title: 'Review', accentClass: 'bg-sky-400' },
          { id: 'done', title: 'Done', accentClass: 'bg-emerald-400' }
        ]
      }
    }
  };

  const treeSpec = {
    version: '1.0' as const,
    state: { selectedNode: 'src/lib' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'tree',
          bind: 'selectedNode',
          props: {
            defaultExpanded: 'first-level',
            nodes: [
              {
                id: 'src', label: 'src', icon: 'folder',
                children: [
                  { id: 'src/index.ts', label: 'index.ts', icon: 'file-code' },
                  {
                    id: 'src/lib', label: 'lib', icon: 'folder',
                    children: [
                      { id: 'src/lib/state.ts', label: 'state.ts', icon: 'file-code' },
                      { id: 'src/lib/util.ts', label: 'util.ts', icon: 'file-code' }
                    ]
                  },
                  {
                    id: 'src/widgets', label: 'widgets', icon: 'folder',
                    children: [
                      { id: 'src/widgets/Tree.svelte', label: 'Tree.svelte', icon: 'file' },
                      { id: 'src/widgets/Kanban.svelte', label: 'Kanban.svelte', icon: 'file' }
                    ]
                  }
                ]
              },
              {
                id: 'tests', label: 'tests', icon: 'folder',
                children: [
                  { id: 'tests/tree.test.ts', label: 'tree.test.ts', icon: 'file-check' }
                ]
              },
              { id: 'README.md', label: 'README.md', icon: 'file-text', isLeaf: true }
            ]
          }
        },
        { type: 'text', props: { text: 'Selected → {state.selectedNode}', size: 'xs' } }
      ]
    }
  };

  const virtualListSpec = {
    version: '1.0' as const,
    state: {
      bigList: Array.from({ length: 5000 }, (_, i) => ({
        id: i,
        title: `Item #${i + 1}`,
        body: `Generated row ${i + 1} of 5,000 — only the visible window is in the DOM.`
      }))
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'text', props: { text: 'Rendering 5,000 rows efficiently — scroll to verify the DOM stays small.', size: 'xs' } },
        {
          type: 'virtual-list',
          props: {
            items: '{state.bigList}',
            itemHeight: 56,
            height: '320px',
            overscan: 4,
            item: {
              type: 'flex',
              props: { direction: 'column', gap: '2px' },
              style: { padding: '8px 12px', 'border-bottom': '1px solid hsl(var(--border) / 0.5)' },
              children: [
                { type: 'text', props: { text: '{item.title}', size: 'sm', weight: 'medium' } },
                { type: 'text', props: { text: '{item.body}', size: 'xs', muted: true } }
              ]
            }
          }
        }
      ]
    }
  };

  const formSpec = {
    version: '1.0' as const,
    state: { fullName: '', email: '', age: 0, agreed: false, errors: {}, valid: false, submitted: '' },
    ui: {
      type: 'form',
      on_submit: { action: 'set', target: 'submitted', value: 'Submitted: {state.fullName}' },
      props: {
        validateOn: 'change',
        fields: {
          fullName: { required: true, minLength: 2, label: 'Full name' },
          email: { required: true, pattern: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$', label: 'Email' },
          age: { min: 0, max: 130, label: 'Age' },
          agreed: { required: 'You must accept the terms', label: 'Terms' }
        }
      },
      children: [
        { type: 'input', props: { label: 'Full name', placeholder: 'Jane Doe' }, bind: 'fullName' },
        { type: 'if', condition: '{state.errors.fullName}', children: [
          { type: 'text', props: { text: '{state.errors.fullName}', size: 'xs', class: 'text-destructive' } }
        ]},
        { type: 'input', props: { label: 'Email', placeholder: 'jane@example.com', type: 'email' }, bind: 'email' },
        { type: 'if', condition: '{state.errors.email}', children: [
          { type: 'text', props: { text: '{state.errors.email}', size: 'xs', class: 'text-destructive' } }
        ]},
        { type: 'input', props: { label: 'Age', type: 'number' }, bind: 'age' },
        { type: 'if', condition: '{state.errors.age}', children: [
          { type: 'text', props: { text: '{state.errors.age}', size: 'xs', class: 'text-destructive' } }
        ]},
        { type: 'checkbox', props: { label: 'I accept the terms' }, bind: 'agreed' },
        { type: 'if', condition: '{state.errors.agreed}', children: [
          { type: 'text', props: { text: '{state.errors.agreed}', size: 'xs', class: 'text-destructive' } }
        ]},
        { type: 'button', props: { label: 'Submit', type: 'submit', disabled: '{!state.valid}' } },
        { type: 'if', condition: '{state.submitted}', children: [
          { type: 'alert', props: { variant: 'default', title: 'Done', description: '{state.submitted}' } }
        ]}
      ]
    }
  };

  const commandPaletteSpec = {
    version: '1.0' as const,
    state: { paletteOpen: false, lastCommand: '' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px', align: 'start' },
      children: [
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            {
              type: 'button',
              props: { label: 'Open palette', variant: 'outline' },
              on_click: { action: 'set', target: 'paletteOpen', value: true }
            },
            { type: 'kbd', props: { keys: ['⌘', 'K'] } }
          ]
        },
        { type: 'text', props: { text: 'Last command → {state.lastCommand || "(none)"}', size: 'xs' } },
        {
          type: 'command-palette',
          bind: 'paletteOpen',
          on_select: { action: 'set', target: 'lastCommand', value: '{event}' },
          props: {
            placeholder: 'Type a command…',
            commands: [
              { id: 'new-doc', label: 'New document', icon: 'file-plus', group: 'File', shortcut: '⌘N' },
              { id: 'open-file', label: 'Open file...', icon: 'folder-open', group: 'File', shortcut: '⌘O' },
              { id: 'save', label: 'Save', icon: 'save', group: 'File', shortcut: '⌘S' },
              { id: 'cut', label: 'Cut', icon: 'scissors', group: 'Edit', shortcut: '⌘X' },
              { id: 'copy', label: 'Copy', icon: 'copy', group: 'Edit', shortcut: '⌘C' },
              { id: 'paste', label: 'Paste', icon: 'clipboard', group: 'Edit', shortcut: '⌘V' },
              { id: 'settings', label: 'Open settings', icon: 'settings', group: 'App', keywords: ['preferences'] },
              { id: 'theme', label: 'Toggle theme', icon: 'sun', group: 'App' }
            ]
          }
        }
      ]
    }
  };

  const fileUploadSpec = {
    version: '1.0' as const,
    state: { uploads: [] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'file-upload',
          bind: 'uploads',
          props: {
            label: 'Attachments',
            multiple: true,
            accept: 'image/*,.pdf',
            maxSize: 5_000_000,
            helperText: 'PNG, JPG, or PDF — up to 5MB each'
          }
        },
        { type: 'text', props: { text: '{state.uploads.length} file(s) staged', size: 'xs' } }
      ]
    }
  };

  const timePickerSpec = {
    version: '1.0' as const,
    state: { meeting: '14:30', alarm: '06:00:00' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        { type: 'time-picker', props: { label: 'Meeting time' }, bind: 'meeting' },
        { type: 'time-picker', props: { label: 'Alarm', showSeconds: true, use12Hour: true }, bind: 'alarm' },
        { type: 'text', props: { text: 'meeting → {state.meeting}  ·  alarm → {state.alarm}', size: 'xs' } }
      ]
    }
  };

  const multiSelectSpec = {
    version: '1.0' as const,
    state: { stack: ['svelte', 'tailwind'] },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '8px' },
      children: [
        {
          type: 'multi-select',
          bind: 'stack',
          props: {
            label: 'Tech stack',
            placeholder: 'Pick technologies',
            creatable: true,
            options: [
              { value: 'svelte', label: 'Svelte' },
              { value: 'react', label: 'React' },
              { value: 'vue', label: 'Vue' },
              { value: 'solid', label: 'Solid' },
              { value: 'tailwind', label: 'Tailwind CSS' },
              { value: 'typescript', label: 'TypeScript' },
              { value: 'rust', label: 'Rust' }
            ]
          }
        },
        { type: 'text', props: { text: 'Selected → {state.stack.length} item(s)', size: 'xs' } }
      ]
    }
  };

  const filterBarSpec = {
    version: '1.0' as const,
    state: {
      filters: [
        { key: 'status', label: 'Status', value: 'open' },
        { key: 'priority', label: 'Priority', value: 'high' }
      ]
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        {
          type: 'filter-bar',
          bind: 'filters',
          props: {
            addLabel: 'Add filter',
            options: [
              { key: 'status', label: 'Status', default: 'open' },
              { key: 'priority', label: 'Priority', default: 'medium' },
              { key: 'owner', label: 'Owner' },
              { key: 'milestone', label: 'Milestone' },
              { key: 'label', label: 'Label' }
            ]
          }
        },
        { type: 'text', props: { text: 'Active filters: {state.filters.length}', size: 'xs' } }
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
        { type: 'date-picker', props: { label: 'Departure', placeholder: 'Pick a date' }, bind: 'departure' },
        { type: 'date-picker', props: { label: 'Return', placeholder: 'Pick a date', format: 'long' }, bind: 'returnDate' },
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

  // ── Settings Page — fat form with all input types + dirty tracking ───────
  const settingsFlow = {
    version: '1.0' as const,
    state: {
      saved: { name: 'Ada Lovelace', email: 'ada@example.com', role: 'engineer', bio: 'Founding engineer.', dark: true, emailDigests: true, dailySummary: false, language: 'en', fontSize: 14, notify: 'email', dob: '1990-12-10', rating: 4 },
      draft: { name: 'Ada Lovelace', email: 'ada@example.com', role: 'engineer', bio: 'Founding engineer.', dark: true, emailDigests: true, dailySummary: false, language: 'en', fontSize: 14, notify: 'email', dob: '1990-12-10', rating: 4 },
      _toast: ''
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        { type: 'page-header', props: { eyebrow: 'ACCOUNT', title: 'Settings', subtitle: 'Edit and save — every input is bound to draft state.' } },

        // Profile section
        {
          type: 'section',
          props: { title: 'Profile', description: 'Your public information.' },
          children: [
            {
              type: 'grid',
              props: { columns: 2, gap: '12px' },
              children: [
                { type: 'input', props: { label: 'Name' }, bind: 'draft.name' },
                { type: 'input', props: { label: 'Email', type: 'email' }, bind: 'draft.email' }
              ]
            },
            {
              type: 'select',
              props: {
                label: 'Role',
                options: [
                  { value: 'engineer', label: 'Engineer' },
                  { value: 'designer', label: 'Designer' },
                  { value: 'pm', label: 'Product Manager' },
                  { value: 'researcher', label: 'Researcher' }
                ]
              },
              bind: 'draft.role'
            },
            { type: 'textarea', props: { label: 'Bio', rows: 2 }, bind: 'draft.bio' },
            { type: 'input', props: { label: 'Date of birth', type: 'date' }, bind: 'draft.dob' }
          ]
        },

        { type: 'separator' },

        // Preferences section
        {
          type: 'section',
          props: { title: 'Preferences', description: 'How the app feels.' },
          children: [
            {
              type: 'flex',
              props: { direction: 'column', gap: '8px' },
              children: [
                { type: 'switch', props: { label: 'Dark mode' }, bind: 'draft.dark' },
                { type: 'checkbox', props: { label: 'Email me weekly digests' }, bind: 'draft.emailDigests' },
                { type: 'checkbox', props: { label: 'Daily summary at 9am' }, bind: 'draft.dailySummary' }
              ]
            },
            {
              type: 'select',
              props: {
                label: 'Language',
                options: [
                  { value: 'en', label: 'English' },
                  { value: 'es', label: 'Español' },
                  { value: 'fr', label: 'Français' },
                  { value: 'de', label: 'Deutsch' }
                ]
              },
              bind: 'draft.language'
            },
            { type: 'slider', props: { label: 'Font size', min: 12, max: 22, step: 1 }, bind: 'draft.fontSize' }
          ]
        },

        { type: 'separator' },

        // Notifications
        {
          type: 'section',
          props: { title: 'Notifications', description: 'Where to reach you.' },
          children: [
            {
              type: 'radio-group',
              props: {
                options: [
                  { value: 'email', label: 'Email only' },
                  { value: 'push', label: 'Push notifications' },
                  { value: 'sms', label: 'SMS' },
                  { value: 'none', label: 'None' }
                ]
              },
              bind: 'draft.notify'
            }
          ]
        },

        { type: 'separator' },

        // Feedback
        {
          type: 'section',
          props: { title: 'Feedback', description: 'How are we doing?' },
          children: [
            { type: 'rating', props: { label: 'Rate this product', max: 5, showValue: true }, bind: 'draft.rating' }
          ]
        },

        { type: 'separator' },

        // Save / Reset
        {
          type: 'flex',
          props: { gap: '8px', justify: 'end' },
          children: [
            {
              type: 'button',
              props: { label: 'Reset', variant: 'outline' },
              on_click: [
                { action: 'set', target: 'draft', value: '{state.saved}' },
                { action: 'toast', message: 'Reverted to last saved.' }
              ]
            },
            {
              type: 'button',
              props: { label: 'Save changes' },
              on_click: [
                { action: 'set', target: 'saved', value: '{state.draft}' },
                { action: 'toast', message: 'Settings saved.', variant: 'success' }
              ]
            }
          ]
        }
      ]
    }
  };

  // ── Mini Inbox — master/detail with multi-select + bulk actions ──────────
  const inboxFlow = {
    version: '1.0' as const,
    state: {
      messages: [
        { id: 1, from: 'Ada Lovelace', subject: 'Re: API design review', preview: "I've left comments inline. Most things are nits, but the auth flow needs another pass.", read: false, starred: true, body: "I've left comments inline. Most things are nits, but the auth flow needs another pass — the refresh token semantics aren't obvious from the docstring." },
        { id: 2, from: 'Bob Kumar', subject: 'Friday demo prep', preview: 'Slides outline attached. Can we slot 30m on Thursday?', read: false, starred: false, body: 'Slides outline attached. Can we slot 30m on Thursday for a dry run? Also — should we record? I think it would help the GTM team.' },
        { id: 3, from: 'Carol Smith', subject: 'New onboarding copy', preview: 'Marketing wants to land the new hero by EOM.', read: true, starred: false, body: 'Marketing wants to land the new hero by EOM. Pushed first draft to Figma, link inside. Want a quick read before they ship?' },
        { id: 4, from: 'Dana Singh', subject: 'p99 latency dashboard', preview: 'Spotted a regression after yesterday\'s deploy.', read: true, starred: true, body: 'Spotted a regression after yesterday\'s deploy. p99 from 280ms to 410ms on /search. Created an issue, but heads-up.' },
        { id: 5, from: 'Eve Park', subject: 'Welcome aboard 🎉', preview: 'Looking forward to meeting on Monday — here\'s your reading list.', read: true, starred: false, body: 'Looking forward to meeting on Monday — here\'s your reading list. The first three are required; the rest are useful when you find time.' }
      ],
      selectedIds: [],
      openId: 1
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        // Toolbar — appears differently when there's a selection
        {
          type: 'flex',
          props: { gap: '8px', align: 'center' },
          children: [
            { type: 'heading', props: { text: 'Inbox', level: 4 } },
            { type: 'badge', props: { text: '{state.selectedIds.length} selected', variant: 'secondary' }, show: '{state.selectedIds.length > 0}' },
            { type: 'text', props: { text: '{state.messages.length} total · {state.messages.length - state.selectedIds.length} unselected', size: 'xs' } },
            // Bulk actions when there's a selection
            {
              type: 'if',
              condition: '{state.selectedIds.length > 0}',
              children: [
                {
                  type: 'flex',
                  props: { gap: '6px' },
                  class: 'ml-auto',
                  children: [
                    {
                      type: 'button',
                      props: { label: 'Mark read', size: 'sm', variant: 'outline' },
                      on_click: [
                        // Iterate via each pattern is overkill; we just clear selection and rely on per-row toggle
                        { action: 'toast', message: 'Marked {state.selectedIds.length} as read (demo: per-row toggle below).' }
                      ]
                    },
                    {
                      type: 'button',
                      props: { label: 'Clear', size: 'sm', variant: 'ghost' },
                      on_click: { action: 'set', target: 'selectedIds', value: [] }
                    }
                  ]
                }
              ]
            }
          ]
        },

        {
          type: 'grid',
          props: { columns: 2, gap: '12px' },
          style: { 'grid-template-columns': '1fr 1.4fr' },
          children: [
            // List
            {
              type: 'flex',
              props: { direction: 'column', gap: '4px' },
              children: [
                {
                  type: 'each',
                  items: 'messages',
                  item_as: 'msg',
                  index_as: 'i',
                  children: [
                    {
                      type: 'flex',
                      props: { gap: '8px', align: 'start' },
                      class: '{state.openId == msg.id ? "rounded-md bg-muted/60 border border-border p-2" : "rounded-md border border-transparent p-2 hover:bg-muted/30"}',
                      children: [
                        {
                          type: 'checkbox',
                          props: { },
                          value: '{state.selectedIds.includes(msg.id)}',
                          on_change: { action: 'toggle', target: 'selectedIds', value: '{msg.id}' }
                        },
                        {
                          type: 'flex',
                          props: { direction: 'column', gap: '2px' },
                          class: 'flex-1 min-w-0 cursor-pointer',
                          children: [
                            {
                              type: 'flex',
                              props: { gap: '6px', align: 'center' },
                              children: [
                                { type: 'text', props: { text: '{msg.from}', size: 'sm', weight: '{msg.read ? "normal" : "semibold"}' } },
                                { type: 'badge', props: { text: 'Unread', variant: 'default' }, show: '{!msg.read}' },
                                { type: 'text', props: { text: '★', size: 'xs' }, show: '{msg.starred}' }
                              ]
                            },
                            { type: 'text', props: { text: '{msg.subject}', size: 'sm', weight: '{msg.read ? "normal" : "medium"}' } },
                            { type: 'text', props: { text: '{msg.preview}', size: 'xs', class: 'truncate' } }
                          ],
                          on_click: [
                            { action: 'set', target: 'openId', value: '{msg.id}' },
                            { action: 'set', target: 'messages.{i}.read', value: true }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            },

            // Detail
            {
              type: 'card',
              props: { title: 'Message' },
              children: [
                {
                  type: 'each',
                  items: 'messages',
                  item_as: 'msg',
                  index_as: 'i',
                  children: [
                    {
                      type: 'if',
                      condition: '{state.openId == msg.id}',
                      children: [
                        {
                          type: 'flex',
                          props: { direction: 'column', gap: '10px' },
                          children: [
                            { type: 'heading', props: { text: '{msg.subject}', level: 4 } },
                            {
                              type: 'flex',
                              props: { gap: '8px', align: 'center' },
                              children: [
                                { type: 'avatar', props: { name: '{msg.from}', size: 'sm' } },
                                { type: 'text', props: { text: '{msg.from}', weight: 'medium' } }
                              ]
                            },
                            { type: 'separator' },
                            { type: 'text', props: { text: '{msg.body}' } },
                            { type: 'separator' },
                            {
                              type: 'flex',
                              props: { gap: '6px' },
                              children: [
                                {
                                  type: 'button',
                                  props: { label: '{msg.starred ? "Unstar" : "Star"}', size: 'sm', variant: 'outline' },
                                  on_click: { action: 'set', target: 'messages.{i}.starred', value: '{!msg.starred}' }
                                },
                                {
                                  type: 'button',
                                  props: { label: '{msg.read ? "Mark unread" : "Mark read"}', size: 'sm', variant: 'ghost' },
                                  on_click: { action: 'set', target: 'messages.{i}.read', value: '{!msg.read}' }
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
        }
      ]
    }
  };

  // ── Invoice Builder — array CRUD with per-line totals + sum ──────────────
  const invoiceFlow = {
    version: '1.0' as const,
    state: {
      lines: [
        { description: 'Initial design pass', qty: 1, price: 1200, total: 1200 },
        { description: 'Frontend implementation', qty: 8, price: 150, total: 1200 },
        { description: 'QA + handoff', qty: 4, price: 90, total: 360 }
      ],
      taxRate: 8,
      discount: 100
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '12px' },
      children: [
        { type: 'page-header', props: { eyebrow: 'BILLING', title: 'New invoice', subtitle: 'Add line items; line totals and grand total update live.' } },

        // Line items
        {
          type: 'flex',
          props: { direction: 'column', gap: '6px' },
          children: [
            {
              type: 'each',
              items: 'lines',
              item_as: 'line',
              index_as: 'i',
              children: [
                {
                  type: 'flex',
                  props: { gap: '8px', align: 'end' },
                  children: [
                    {
                      type: 'input',
                      props: { label: '{i == 0 ? "Description" : ""}', class: 'flex-1' },
                      bind: 'lines.{i}.description'
                    },
                    {
                      type: 'input',
                      props: { label: '{i == 0 ? "Qty" : ""}', type: 'number', class: 'w-20' },
                      bind: 'lines.{i}.qty',
                      on_change: { action: 'set', target: 'lines.{i}.total', value: '{line.qty * line.price}' }
                    },
                    {
                      type: 'input',
                      props: { label: '{i == 0 ? "Unit price" : ""}', type: 'number', class: 'w-28' },
                      bind: 'lines.{i}.price',
                      on_change: { action: 'set', target: 'lines.{i}.total', value: '{line.qty * line.price}' }
                    },
                    { type: 'text', props: { text: '${line.total}', size: 'sm', class: 'w-20 text-right tabular-nums font-medium' } },
                    {
                      type: 'button',
                      props: { label: '✕', size: 'sm', variant: 'ghost' },
                      on_click: { action: 'remove', target: 'lines', value: '{line}' }
                    }
                  ]
                }
              ]
            },
            {
              type: 'button',
              props: { label: '+ Add line', variant: 'outline', size: 'sm' },
              on_click: { action: 'push', target: 'lines', value: { description: '', qty: 1, price: 0, total: 0 } }
            }
          ]
        },

        { type: 'separator' },

        // Tax + discount
        {
          type: 'grid',
          props: { columns: 2, gap: '12px' },
          children: [
            { type: 'slider', props: { label: 'Tax rate (%)', min: 0, max: 25, step: 0.5 }, bind: 'taxRate' },
            { type: 'input', props: { label: 'Discount ($)', type: 'number' }, bind: 'discount' }
          ]
        },

        { type: 'separator' },

        // Totals
        {
          type: 'flex',
          props: { direction: 'column', gap: '4px', align: 'end' },
          children: [
            {
              type: 'definition-list',
              props: {
                items: [
                  { term: 'Subtotal', definition: '${state.lines.sum("total")}' },
                  { term: 'Tax', definition: '{state.taxRate}%' },
                  { term: 'Discount', definition: '-${state.discount}' }
                ]
              }
            }
          ]
        },

        // Issue button with confirm
        {
          type: 'flex',
          props: { gap: '8px', justify: 'end' },
          children: [
            {
              type: 'button',
              props: { label: 'Issue invoice' },
              on_click: {
                action: 'confirm',
                title: 'Issue this invoice?',
                message: 'Issuing locks the line items and emails the recipient.',
                confirm_label: 'Issue',
                on_confirm: [
                  { action: 'toast', message: 'Invoice issued.', variant: 'success' }
                ]
              }
            }
          ]
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

  // ── C4 diagram ──────────────────────────────────────────────

  const c4Spec = {
    version: '1.0' as const,
    ui: {
      type: 'c4',
      props: {
        diagram: {
          level: 'container',
          title: 'Internet Banking — Containers',
          description: 'How the customer-facing system is composed.',
          elements: [
            { id: 'customer', name: 'Personal Banking Customer', description: 'A retail customer of the bank.', external: true },
            {
              id: 'banking-system',
              name: 'Internet Banking System',
              description: 'Allows customers to view account info and make payments.',
              containers: [
                { id: 'web-app', name: 'Web Application', technology: 'Java + Spring MVC', type: 'webapp', description: 'Delivers static content and the SPA.' },
                { id: 'spa', name: 'Single-Page App', technology: 'JavaScript + Angular', type: 'webapp', description: 'Banking features via the browser.' },
                { id: 'mobile-app', name: 'Mobile App', technology: 'Xamarin', type: 'mobile', description: 'Banking features for mobile.' },
                { id: 'api', name: 'API Application', technology: 'Java + Spring MVC', type: 'api', description: 'Provides banking functionality via JSON/HTTPS.' },
                { id: 'db', name: 'Database', technology: 'Oracle', type: 'database', description: 'Stores user, account and audit data.' },
              ],
            },
            { id: 'mainframe', name: 'Mainframe Banking System', description: 'Stores all core banking information.', external: true },
            { id: 'email', name: 'E-mail System', description: 'Microsoft Exchange.', external: true },
          ],
          relationships: [
            { from: 'customer', to: 'web-app', label: 'Visits bigbank.com', technology: 'HTTPS' },
            { from: 'customer', to: 'spa', label: 'Uses' },
            { from: 'customer', to: 'mobile-app', label: 'Uses' },
            { from: 'web-app', to: 'spa', label: 'Delivers to browser' },
            { from: 'spa', to: 'api', label: 'Calls', technology: 'JSON/HTTPS' },
            { from: 'mobile-app', to: 'api', label: 'Calls', technology: 'JSON/HTTPS' },
            { from: 'api', to: 'db', label: 'Reads/writes', technology: 'JDBC' },
            { from: 'api', to: 'mainframe', label: 'Calls', technology: 'XML/HTTPS' },
            { from: 'api', to: 'email', label: 'Sends e-mail', style: 'async' },
          ],
        }
      }
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
      { label: 'Breadcrumb', spec: breadcrumbSpec },
      { label: 'Split / Resizable', spec: splitSpec },
      { label: 'Master / Detail', spec: masterDetailSpec },
      { label: 'Collapsible', spec: collapsibleSpec },
      { label: 'Tooltip', spec: tooltipSpec },
      { label: 'Popover', spec: popoverSpec },
      { label: 'Hover Card', spec: hoverCardSpec },
      { label: 'Toast', spec: toastSpec },
      { label: 'Context Menu', spec: contextMenuSpec },
      { label: 'Notification Center', spec: notificationCenterSpec },
      { label: 'Error State', spec: errorStateSpec },
      { label: 'Coachmark / Tour', spec: coachmarkSpec },
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
      { label: 'Loading', spec: loadingSpec },
      { label: 'Avatar Group', spec: avatarGroupSpec },
      { label: 'Chip / Tag', spec: chipSpec },
      { label: 'Kbd', spec: kbdSpec },
      { label: 'Status Dot', spec: statusDotSpec },
      { label: 'Trend / Delta', spec: trendSpec },
      { label: 'Icon', spec: iconSpec },
      { label: 'Copy', spec: copySpec },
      { label: 'Inline Code', spec: inlineCodeSpec },
      { label: 'Progress Ring', spec: progressRingSpec },
      { label: 'Mention', spec: mentionSpec },
      { label: 'Link Preview', spec: linkPreviewSpec },
      { label: 'QR', spec: qrSpec },
      { label: 'Diff', spec: diffSpec },
    ]},
    { id: 'input', title: 'Input', items: [
      { label: 'Button', spec: buttonSpec },
      { label: 'Input', spec: inputSpec },
      { label: 'Textarea', spec: textareaSpec },
      { label: 'Date Picker', spec: datePickerSpec },
      { label: 'Time Picker', spec: timePickerSpec },
      { label: 'File Upload', spec: fileUploadSpec },
      { label: 'Command Palette', spec: commandPaletteSpec },
      { label: 'Form (with validation)', spec: formSpec },
      { label: 'Number Input', spec: numberInputSpec },
      { label: 'OTP Input', spec: otpInputSpec },
      { label: 'Segmented / Toggle Group', spec: segmentedSpec },
      { label: 'Color Picker', spec: colorPickerSpec },
      { label: 'Rich Text', spec: richTextSpec },
      { label: 'Code Editor', spec: codeEditorSpec },
      { label: 'Search', spec: searchSpec },
      { label: 'Combobox', spec: comboboxSpec },
      { label: 'Multi-select', spec: multiSelectSpec },
      { label: 'Filter Bar', spec: filterBarSpec },
      { label: 'Select', spec: selectSpec },
      { label: 'Slider', spec: sliderSpec },
      { label: 'Radio Group', spec: radioSpec },
      { label: 'Rating', spec: ratingSpec },
      { label: 'Checkbox & Switch', spec: togglesSpec },
    ]},
    { id: 'data', title: 'Data', items: [
      { label: 'Table', spec: tableSpec },
      { label: 'Data Grid', spec: dataGridSpec },
      { label: 'Chart', spec: chartSpec },
      { label: 'Sparkline', spec: sparklineSpec },
      { label: 'Gauge', spec: gaugeSpec },
      { label: 'Funnel', spec: funnelSpec },
      { label: 'Heatmap', spec: heatmapSpec },
      { label: 'Sankey', spec: sankeySpec },
      { label: 'Treemap', spec: treemapSpec },
      { label: 'Gantt', spec: ganttSpec },
      { label: 'Tree Table', spec: treeTableSpec },
      { label: 'Calendar', spec: calendarSpec },
      { label: 'Virtual List', spec: virtualListSpec },
      { label: 'Tree', spec: treeSpec },
      { label: 'Kanban', spec: kanbanSpec },
      { label: 'C4 Diagram', spec: c4Spec },
    ]},
    { id: 'control', title: 'Control Flow', items: [
      { label: 'If / Each', spec: controlSpec },
    ]},
    { id: 'vertical', title: 'Verticals', items: [
      { label: 'Pricing Table', spec: pricingTableSpec },
      { label: 'Settings List', spec: settingsListSpec },
      { label: 'Comment Thread', spec: commentThreadSpec },
      { label: 'Audit Log', spec: auditLogSpec },
      { label: 'API Key', spec: apiKeySpec },
      { label: 'Bulk Action Bar', spec: bulkActionBarSpec },
      { label: 'Saved Views', spec: savedViewsSpec },
      { label: 'People Picker', spec: peoplePickerSpec },
      { label: 'Permission Matrix', spec: permissionMatrixSpec },
      { label: 'Org Chart', spec: orgChartSpec },
      { label: 'Invoice Lines', spec: invoiceLinesSpec },
      { label: 'Activity Feed', spec: activityFeedSpec },
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
      { label: 'Settings Page', spec: settingsFlow },
      { label: 'Mini Inbox', spec: inboxFlow },
      { label: 'Invoice Builder', spec: invoiceFlow },
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

  // ── Showcase as a Ripple spec — eat our own dog food ──────────────────────
  // The shell (sidebar, filter, item grid) is rendered by Ripple itself.
  // Each demo card uses the new `ripple-frame` widget to mount an isolated
  // <Ripple> instance with its own state, so demos don't share their state.

  // Flatten all items so a single each-loop drives the visible grid.
  const allItems = sections.flatMap((s) =>
    s.items.map((it) => ({ section: s.id, label: it.label, spec: it.spec }))
  );

  const sidebarItems = sections.map((s) => ({
    label: s.title,
    value: s.id,
    badge: String(s.items.length)
  }));

  const showcaseSpec = {
    version: '1.0' as const,
    state: {
      activeId: 'flows',
      filter: '',
      items: allItems
    },
    ui: {
      type: 'flex',
      props: { gap: '0' },
      class: 'showcase-shell',
      children: [
        // ── Sidebar
        {
          type: 'sidebar',
          class: 'showcase-aside',
          props: {
            title: 'Ripple Showcase',
            items: sidebarItems
          },
          bind: 'activeId'
        },

        // ── Main pane
        {
          type: 'flex',
          props: { direction: 'column', gap: '16px' },
          class: 'showcase-main',
          children: [
            {
              type: 'flex',
              props: { gap: '12px', align: 'end', justify: 'between', wrap: 'wrap' },
              children: [
                {
                  type: 'page-header',
                  props: {
                    eyebrow: '@ripple-ui/svelte',
                    title: 'Showcase',
                    subtitle: 'Every panel below is a Ripple spec rendered inside this page — which is also a spec.'
                  },
                  class: 'flex-1 min-w-0'
                },
                {
                  type: 'input',
                  props: { placeholder: 'Filter demos...', type: 'search' },
                  class: 'w-60',
                  bind: 'filter'
                }
              ]
            },

            // ── Item grid
            {
              type: 'flex',
              props: { direction: 'column', gap: '16px' },
              children: [
                {
                  type: 'each',
                  items: 'items',
                  item_as: 'item',
                  children: [
                    {
                      type: 'if',
                      condition: '{item.section == state.activeId && (state.filter == "" || item.label.toLowerCase().includes(state.filter.toLowerCase()))}',
                      children: [
                        {
                          type: 'card',
                          props: { title: '{item.label}' },
                          children: [
                            { type: 'ripple-frame', props: { spec: '{item.spec}' } }
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
    }
  };

  // Sync activeId with URL hash so deep links land on the right category.
  let initialOverride = $state<{ activeId?: string }>({});
  if (typeof window !== 'undefined') {
    const id = window.location.hash.replace('#', '').trim();
    if (id && sections.some((s) => s.id === id)) initialOverride = { activeId: id };
  }
  // Listen for state changes to push the active id back to the URL.
  function onStateChange(path: string, value: unknown) {
    if (path === 'activeId' && typeof value === 'string' && typeof window !== 'undefined') {
      history.replaceState(null, '', `#${value}`);
    }
  }
</script>

<Ripple spec={showcaseSpec} state={initialOverride} {onStateChange} onEvent={handleEvent} />

<style>
  /* Layout-only glue. Widget visuals come from their own components. */
  :global(.showcase-shell) {
    min-height: calc(100vh - 60px);
  }
  :global(.showcase-aside) {
    position: sticky;
    top: 60px;
    height: calc(100vh - 60px);
    overflow-y: auto;
  }
  :global(.showcase-main) {
    flex: 1;
    min-width: 0;
    padding: 2rem 2rem 4rem;
    max-width: 1100px;
    width: 100%;
    margin: 0 auto;
  }
  @media (max-width: 720px) {
    :global(.showcase-aside) {
      position: static;
      height: auto;
      width: 100%;
    }
    :global(.showcase-main) {
      padding: 1.5rem 1rem 3rem;
    }
  }
</style>

