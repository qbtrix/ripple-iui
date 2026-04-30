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
      type: 'table',
      props: {
        columns: [
          { key: 'name', label: 'Name' },
          { key: 'role', label: 'Role' },
          { key: 'status', label: 'Status' },
        ],
        rows: [
          { name: 'Alice Chen', role: 'Engineer', status: 'Active' },
          { name: 'Bob Kumar', role: 'Designer', status: 'Away' },
          { name: 'Carol Smith', role: 'PM', status: 'Active' },
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
          type: 'flex',
          props: { gap: '16px' },
          children: [
            {
              type: 'card',
              props: { title: 'Bar Chart' },
              children: [{
                type: 'chart',
                props: {
                  type: 'bar',
                  data: [
                    { label: 'Mon', value: 35 },
                    { label: 'Tue', value: 52 },
                    { label: 'Wed', value: 41 },
                    { label: 'Thu', value: 68 },
                    { label: 'Fri', value: 59 },
                  ]
                }
              }]
            },
            {
              type: 'card',
              props: { title: 'Pie Chart' },
              children: [{
                type: 'chart',
                props: {
                  type: 'pie',
                  data: [
                    { label: 'Desktop', value: 62 },
                    { label: 'Mobile', value: 30 },
                    { label: 'Tablet', value: 8 },
                  ]
                }
              }]
            },
          ]
        },
        {
          type: 'card',
          props: { title: 'AAPL — Candlestick (5D)' },
          children: [{
            type: 'chart',
            props: {
              type: 'candlestick',
              height: 220,
              data: [
                { label: 'Mar 24', value: 0, open: 218.55, close: 220.73, high: 221.48, low: 217.10 },
                { label: 'Mar 25', value: 0, open: 220.73, close: 223.85, high: 224.20, low: 219.90 },
                { label: 'Mar 26', value: 0, open: 224.10, close: 221.53, high: 225.61, low: 220.80 },
                { label: 'Mar 27', value: 0, open: 221.30, close: 224.37, high: 225.15, low: 220.68 },
                { label: 'Mar 28', value: 0, open: 224.50, close: 226.90, high: 227.34, low: 223.75 },
              ]
            }
          }]
        },
        {
          type: 'flex',
          props: { gap: '16px' },
          children: [
            {
              type: 'card',
              props: { title: 'NIFTY 50 — Area' },
              children: [{
                type: 'chart',
                props: {
                  type: 'area',
                  height: 160,
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
                    { label: '15:30', value: 23695 },
                  ]
                }
              }]
            },
            {
              type: 'card',
              props: { title: 'Line — Weekly Trend' },
              children: [{
                type: 'chart',
                props: {
                  type: 'line',
                  height: 160,
                  data: [
                    { label: 'W1', value: 42 },
                    { label: 'W2', value: 38 },
                    { label: 'W3', value: 55 },
                    { label: 'W4', value: 48 },
                    { label: 'W5', value: 63 },
                    { label: 'W6', value: 71 },
                  ]
                }
              }]
            },
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
                props: { direction: 'column', gap: '4px' },
                children: [
                  { type: 'text', props: { text: 'AAPL', size: 'xs', weight: 'bold' } },
                  { type: 'chart', props: { type: 'sparkline', height: 40, data: [
                    { label: '1', value: 218 }, { label: '2', value: 220 }, { label: '3', value: 219 },
                    { label: '4', value: 222 }, { label: '5', value: 224 }, { label: '6', value: 226 },
                  ]}},
                  { type: 'text', props: { text: '$226.90 (+3.8%)', size: 'xs' } },
                ]
              },
              {
                type: 'flex',
                props: { direction: 'column', gap: '4px' },
                children: [
                  { type: 'text', props: { text: 'TSLA', size: 'xs', weight: 'bold' } },
                  { type: 'chart', props: { type: 'sparkline', height: 40, data: [
                    { label: '1', value: 280 }, { label: '2', value: 275 }, { label: '3', value: 272 },
                    { label: '4', value: 268 }, { label: '5', value: 270 }, { label: '6', value: 265 },
                  ]}},
                  { type: 'text', props: { text: '$265.10 (-5.4%)', size: 'xs' } },
                ]
              },
              {
                type: 'flex',
                props: { direction: 'column', gap: '4px' },
                children: [
                  { type: 'text', props: { text: 'NVDA', size: 'xs', weight: 'bold' } },
                  { type: 'chart', props: { type: 'sparkline', height: 40, data: [
                    { label: '1', value: 880 }, { label: '2', value: 895 }, { label: '3', value: 910 },
                    { label: '4', value: 905 }, { label: '5', value: 920 }, { label: '6', value: 935 },
                  ]}},
                  { type: 'text', props: { text: '$935.20 (+6.3%)', size: 'xs' } },
                ]
              },
            ]
          }]
        },
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
    ]},
    { id: 'input', title: 'Input', items: [
      { label: 'Button', spec: buttonSpec },
      { label: 'Input', spec: inputSpec },
      { label: 'Textarea', spec: textareaSpec },
      { label: 'Select', spec: selectSpec },
      { label: 'Slider', spec: sliderSpec },
      { label: 'Radio Group', spec: radioSpec },
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
      { label: 'Counter', spec: counterFlow },
      { label: 'Live Calculator', spec: calculatorFlow },
      { label: 'Live Filter', spec: filterFlow },
      { label: 'Multi-select Chips', spec: multiSelectFlow },
      { label: 'Stepper Wizard', spec: wizardFlow },
      { label: 'Delete with Confirmation', spec: confirmFlow },
      { label: 'Form with Validation', spec: formFlow },
      { label: 'Research Article', spec: researchFlow },
    ]},
  ];
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>Ripple Widget Showcase</h1>
    <p>All widgets, atoms, and interactive flows in <code>@ripple-ui/svelte</code></p>
    <nav class="showcase-nav">
      {#each sections as section}
        <a href="#{section.id}">{section.title}</a>
      {/each}
    </nav>
  </header>

  {#each sections as section}
    <section id={section.id} class="showcase-section">
      <h2 class="showcase-section-title">{section.title}</h2>
      <div class="showcase-grid">
        {#each section.items as item}
          <div class="showcase-item">
            <h3 class="showcase-item-title">{item.label}</h3>
            <div class="showcase-item-demo">
              <Ripple spec={item.spec} onEvent={handleEvent} />
            </div>
          </div>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .showcase {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    color: hsl(var(--foreground));
  }
  .showcase-header {
    margin-bottom: 2.5rem;
  }
  .showcase-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }
  .showcase-header p {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 1rem;
  }
  .showcase-header code {
    background: hsl(var(--muted) / 0.5);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  .showcase-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .showcase-nav a {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    background: hsl(var(--muted) / 0.4);
    color: hsl(var(--foreground));
    text-decoration: none;
    transition: background 0.15s;
  }
  .showcase-nav a:hover {
    background: hsl(var(--muted));
  }
  .showcase-section {
    margin-bottom: 2.5rem;
  }
  .showcase-section-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid hsl(var(--border));
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
</style>
