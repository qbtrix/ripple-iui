<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '@ripple-ui/core';

  function handleEvent(event: RippleEvent) {
    console.log('RippleEvent:', event);
  }

  // ── Pocket: Research Article ──────────────────────────────────

  const researchPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '20px' },
      children: [
        { type: 'heading', props: { text: "Varan's emergency fuel shipment arrives in Coralis amid Gulf crisis", level: 3 } },
        { type: 'text', props: {
          text: 'A shipment of 38,000 metric tonnes of fuel from Varan is set to arrive in Coralis on Saturday, marking Varan\'s most concrete response yet to the energy crisis gripping the region.',
          size: 'sm'
        }},
        {
          type: 'flex',
          props: { gap: '10px' },
          style: { 'overflow-x': 'auto', 'padding-bottom': '4px' },
          children: [
            { type: 'source-card', props: { favicon: '/icons/source.svg', source: 'marketline', title: "Varan's neighbours seek fuel supplies from Varan...", color: '#22c55e' } },
            { type: 'source-card', props: { favicon: '/icons/source.svg', source: 'energy.ledger', title: 'Varani fuel shipment to arrive in Coralis on Saturday...', color: '#ef4444' } },
            { type: 'source-card', props: { favicon: '/icons/source.svg', source: 'northpost', title: 'Varan seeks security assurances for urgent fuel...', color: '#3b82f6' } },
            { type: 'source-card', props: { favicon: '/icons/source.svg', source: 'worldwire', title: 'Varan, Europe feel fuel crunch as Gulf gas supplie...', color: '#f97316' } },
          ]
        },
        { type: 'image', props: {
          src: 'https://images.unsplash.com/photo-1562420833-3e5e4d460494?w=700&q=80',
          alt: 'Oil tanker ship', width: '100%', height: '240px', fit: 'cover', rounded: 'lg'
        }},
        { type: 'heading', props: { text: 'A Region in Crisis', level: 4 } },
        { type: 'text', props: {
          text: 'The energy emergency across the region stems from the effective closure of the Kessel Strait. The narrow waterway, through which roughly a fifth of the world\'s oil passes, has been largely shut to commercial traffic, severing supply lines for import-dependent nations.',
          size: 'sm'
        }},
        {
          type: 'flex', props: { gap: '6px', wrap: 'wrap' },
          children: [
            { type: 'citation', props: { favicon: '/icons/source.svg', source: 'northpost', color: '#3b82f6', number: 1 } },
            { type: 'citation', props: { favicon: '/icons/source.svg', source: 'forumline', color: '#ff4500', number: 2 } },
          ]
        },
        { type: 'sources-bar', props: {
          sources: [
            { favicon: '/icons/source.svg', name: 'northpost', color: '#3b82f6' },
            { favicon: '/icons/source.svg', name: 'marketline', color: '#22c55e' },
            { favicon: '/icons/source.svg', name: 'worldwire', color: '#f97316' },
            { favicon: '/icons/source.svg', name: 'energy.ledger', color: '#ef4444' },
          ],
        }},
        { type: 'heading', props: { text: 'Discover more', level: 4 } },
        {
          type: 'flex', props: { gap: '12px' },
          style: { 'overflow-x': 'auto', 'padding-bottom': '4px' },
          children: [
            { type: 'discover-card', props: { title: 'Varan and Nordmark Move to Restart LNG Trade...', description: 'Varan and Nordmark are preparing to restart direct...', image: 'https://images.unsplash.com/photo-1581093588401-fbb62a02f120?w=300&q=70' } },
            { type: 'discover-card', props: { title: 'Varan, Kestria race to secure Gulf food...', description: 'Both nations\' food security efforts are intertwined...', image: 'https://images.unsplash.com/photo-1504711434969-e33886168d6c?w=300&q=70' } },
            { type: 'discover-card', props: { title: 'Isla Marena declares energy emergency...', description: 'The crisis traces back to joint a regional naval blockade...', image: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?w=300&q=70' } },
          ]
        },
        { type: 'follow-up', props: { placeholder: 'Ask follow-up' } }
      ]
    }
  };

  // ── Pocket: Market Watch ──────────────────────────────────────

  const marketPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        {
          type: 'flex', props: { justify: 'between', align: 'center' },
          children: [
            { type: 'heading', props: { text: 'Market Watch', level: 3 } },
            { type: 'badge', props: { text: 'Live', variant: 'success' } },
          ]
        },
        {
          type: 'grid', props: { columns: 3, gap: '12px' },
          children: [
            {
              type: 'flex', props: { direction: 'column', gap: '4px' },
              children: [
                { type: 'text', props: { text: 'MX 50', size: 'xs' } },
                { type: 'text', props: { text: '23,710.45', size: 'lg', weight: 'bold' } },
                { type: 'chart', props: { type: 'sparkline', height: 36, data: [
                  { label: '1', value: 23420 }, { label: '2', value: 23485 }, { label: '3', value: 23510 },
                  { label: '4', value: 23465 }, { label: '5', value: 23575 }, { label: '6', value: 23610 },
                  { label: '7', value: 23590 }, { label: '8', value: 23640 }, { label: '9', value: 23710 },
                ]}},
                { type: 'badge', props: { text: '+1.24%', variant: 'success' } },
              ]
            },
            {
              type: 'flex', props: { direction: 'column', gap: '4px' },
              children: [
                { type: 'text', props: { text: 'MX BROAD', size: 'xs' } },
                { type: 'text', props: { text: '78,053.52', size: 'lg', weight: 'bold' } },
                { type: 'chart', props: { type: 'sparkline', height: 36, data: [
                  { label: '1', value: 77200 }, { label: '2', value: 77450 }, { label: '3', value: 77380 },
                  { label: '4', value: 77600 }, { label: '5', value: 77850 }, { label: '6', value: 77790 },
                  { label: '7', value: 77950 }, { label: '8', value: 78053 },
                ]}},
                { type: 'badge', props: { text: '+1.10%', variant: 'success' } },
              ]
            },
            {
              type: 'flex', props: { direction: 'column', gap: '4px' },
              children: [
                { type: 'text', props: { text: 'MX BANK', size: 'xs' } },
                { type: 'text', props: { text: '51,280.10', size: 'lg', weight: 'bold' } },
                { type: 'chart', props: { type: 'sparkline', height: 36, data: [
                  { label: '1', value: 51600 }, { label: '2', value: 51500 }, { label: '3', value: 51420 },
                  { label: '4', value: 51350 }, { label: '5', value: 51300 }, { label: '6', value: 51280 },
                ]}},
                { type: 'badge', props: { text: '-0.62%', variant: 'destructive' } },
              ]
            },
          ]
        },
        { type: 'chart', props: {
          type: 'candlestick', height: 200, title: 'MERIDIAN — 5 Day',
          data: [
            { label: 'Mar 24', value: 0, open: 2830, close: 2862, high: 2875, low: 2815 },
            { label: 'Mar 25', value: 0, open: 2862, close: 2845, high: 2880, low: 2835 },
            { label: 'Mar 26', value: 0, open: 2845, close: 2890, high: 2905, low: 2840 },
            { label: 'Mar 27', value: 0, open: 2890, close: 2875, high: 2910, low: 2860 },
            { label: 'Mar 28', value: 0, open: 2880, close: 2920, high: 2935, low: 2870 },
          ]
        }},
        {
          type: 'table', props: {
            variant: 'compact',
            columns: [
              { key: 'symbol', label: 'Symbol' },
              { key: 'price', label: 'Price' },
              { key: 'change', label: 'Change' },
              { key: 'volume', label: 'Volume' },
            ],
            rows: [
              { symbol: 'KSTL', price: '3,842.50', change: '+1.8%', volume: '2.1M' },
              { symbol: 'NVTX', price: '1,587.25', change: '+2.3%', volume: '4.5M' },
              { symbol: 'Harbor Bank', price: '1,692.40', change: '-0.4%', volume: '3.8M' },
              { symbol: 'Wavelet', price: '465.70', change: '+0.9%', volume: '1.9M' },
            ]
          }
        },
        { type: 'sources-bar', props: {
          sources: [
            { favicon: '/icons/source.svg', name: 'MX Exchange', color: '#0080ff' },
            { favicon: '/icons/source.svg', name: 'marketline', color: '#22c55e' },
            { favicon: '/icons/source.svg', name: 'MX', color: '#ef4444' },
          ]
        }},
        { type: 'follow-up', props: { placeholder: 'Ask about any stock or index...' } }
      ]
    }
  };

  // ── Pocket: Weather ───────────────────────────────────────────

  const weatherPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        {
          type: 'flex', props: { justify: 'between', align: 'start' },
          children: [
            {
              type: 'flex', props: { direction: 'column', gap: '2px' },
              children: [
                { type: 'heading', props: { text: 'New Delhi', level: 3 } },
                { type: 'text', props: { text: 'Fri, 28 Mar 2026 — Partly Cloudy', size: 'xs' } },
              ]
            },
            { type: 'text', props: { text: '34\u00b0C', size: '2xl', weight: 'bold' } },
          ]
        },
        {
          type: 'grid', props: { columns: 4, gap: '8px' },
          children: [
            { type: 'metric', props: { label: 'Humidity', value: '42%', variant: 'compact' } },
            { type: 'metric', props: { label: 'Wind', value: '12 km/h', variant: 'compact' } },
            { type: 'metric', props: { label: 'UV Index', value: '8', variant: 'compact' } },
            { type: 'metric', props: { label: 'AQI', value: '156', variant: 'compact' } },
          ]
        },
        { type: 'chart', props: {
          type: 'area', height: 120, colors: ['#f59e0b'],
          data: [
            { label: '6AM', value: 24 }, { label: '9AM', value: 28 }, { label: '12PM', value: 33 },
            { label: '3PM', value: 35 }, { label: '6PM', value: 32 }, { label: '9PM', value: 28 },
            { label: '12AM', value: 25 },
          ]
        }},
        {
          type: 'grid', props: { columns: 5, gap: '8px' },
          children: [
            { type: 'flex', props: { direction: 'column', align: 'center', gap: '2px' },
              children: [
                { type: 'text', props: { text: 'Sat', size: 'xs', weight: 'bold' } },
                { type: 'text', props: { text: '36\u00b0', size: 'sm' } },
                { type: 'text', props: { text: '24\u00b0', size: 'xs' } },
              ]
            },
            { type: 'flex', props: { direction: 'column', align: 'center', gap: '2px' },
              children: [
                { type: 'text', props: { text: 'Sun', size: 'xs', weight: 'bold' } },
                { type: 'text', props: { text: '38\u00b0', size: 'sm' } },
                { type: 'text', props: { text: '25\u00b0', size: 'xs' } },
              ]
            },
            { type: 'flex', props: { direction: 'column', align: 'center', gap: '2px' },
              children: [
                { type: 'text', props: { text: 'Mon', size: 'xs', weight: 'bold' } },
                { type: 'text', props: { text: '35\u00b0', size: 'sm' } },
                { type: 'text', props: { text: '26\u00b0', size: 'xs' } },
              ]
            },
            { type: 'flex', props: { direction: 'column', align: 'center', gap: '2px' },
              children: [
                { type: 'text', props: { text: 'Tue', size: 'xs', weight: 'bold' } },
                { type: 'text', props: { text: '33\u00b0', size: 'sm' } },
                { type: 'text', props: { text: '24\u00b0', size: 'xs' } },
              ]
            },
            { type: 'flex', props: { direction: 'column', align: 'center', gap: '2px' },
              children: [
                { type: 'text', props: { text: 'Wed', size: 'xs', weight: 'bold' } },
                { type: 'text', props: { text: '31\u00b0', size: 'sm' } },
                { type: 'text', props: { text: '23\u00b0', size: 'xs' } },
              ]
            },
          ]
        },
        { type: 'sources-bar', props: {
          sources: [
            { favicon: '/icons/source.svg', name: 'OpenWeather', color: '#f59e0b' },
            { favicon: '/icons/source.svg', name: 'IMD', color: '#0080ff' },
          ]
        }},
      ]
    }
  };

  // ── Pocket: Analytics Dashboard ───────────────────────────────

  const analyticsPocket = {
    version: '1.0' as const,
    state: { period: 'week' },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        {
          type: 'flex', props: { justify: 'between', align: 'center' },
          children: [
            { type: 'heading', props: { text: 'Analytics Overview', level: 3 } },
            { type: 'tabs', props: { tabs: ['Week', 'Month', 'Year'] } },
          ]
        },
        {
          type: 'grid', props: { columns: 4, gap: '12px' },
          children: [
            { type: 'metric', props: { label: 'Revenue', value: '$42,580', trend: '+12.5%' } },
            { type: 'metric', props: { label: 'Users', value: '8,420', trend: '+5.2%' } },
            { type: 'metric', props: { label: 'Conversion', value: '3.24%', trend: '+0.8%' } },
            { type: 'metric', props: { label: 'Bounce Rate', value: '42.1%', trend: '-2.1%' } },
          ]
        },
        {
          type: 'flex', props: { gap: '16px' },
          children: [
            {
              type: 'card', props: { title: 'Revenue Trend' },
              children: [{ type: 'chart', props: {
                type: 'area', height: 160, colors: ['#3b82f6'],
                data: [
                  { label: 'Mon', value: 4200 }, { label: 'Tue', value: 5100 }, { label: 'Wed', value: 4800 },
                  { label: 'Thu', value: 6200 }, { label: 'Fri', value: 7100 }, { label: 'Sat', value: 8500 },
                  { label: 'Sun', value: 6680 },
                ]
              }}]
            },
            {
              type: 'card', props: { title: 'Traffic Sources' },
              children: [{ type: 'chart', props: {
                type: 'donut', height: 160,
                data: [
                  { label: 'Organic', value: 45 },
                  { label: 'Direct', value: 25 },
                  { label: 'Referral', value: 18 },
                  { label: 'Social', value: 12 },
                ]
              }}]
            },
          ]
        },
        {
          type: 'table', props: {
            variant: 'compact',
            columns: [
              { key: 'page', label: 'Top Pages' },
              { key: 'views', label: 'Views' },
              { key: 'bounce', label: 'Bounce' },
              { key: 'time', label: 'Avg. Time' },
            ],
            rows: [
              { page: '/home', views: '12,450', bounce: '38%', time: '2m 14s' },
              { page: '/pricing', views: '8,230', bounce: '45%', time: '1m 52s' },
              { page: '/docs/getting-started', views: '6,102', bounce: '22%', time: '4m 08s' },
              { page: '/blog/launch', views: '4,890', bounce: '51%', time: '1m 30s' },
            ]
          }
        },
      ]
    }
  };

  // ── Pocket: Comparison ────────────────────────────────────────

  const comparisonPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        { type: 'heading', props: { text: 'Halo 7 Pro vs Nimbus S9 Ultra', level: 3 } },
        { type: 'text', props: { text: 'Here\'s a side-by-side comparison of the two flagship phones based on key specs and features.', size: 'sm' } },
        {
          type: 'table', props: {
            columns: [
              { key: 'spec', label: 'Spec' },
              { key: 'halo', label: 'Halo 7 Pro' },
              { key: 'nimbus', label: 'Nimbus S9 Ultra' },
            ],
            rows: [
              { spec: 'Display', halo: '6.3" OLED 120Hz', nimbus: '6.9" AMOLED 120Hz' },
              { spec: 'Processor', halo: 'H7 chip', nimbus: 'Vertex 9' },
              { spec: 'RAM', halo: '8 GB', nimbus: '12 GB' },
              { spec: 'Camera', halo: '48MP + 48MP + 12MP', nimbus: '200MP + 50MP + 10MP + 50MP' },
              { spec: 'Battery', halo: '3,582 mAh', nimbus: '5,000 mAh' },
              { spec: 'Starting Price', halo: '$999', nimbus: '$1,299' },
            ]
          }
        },
        { type: 'text', props: { text: 'The Halo 7 Pro excels in software optimization and ecosystem integration, while the Nimbus S9 Ultra leads in raw hardware specs, especially display size and battery capacity.', size: 'sm' } },
        {
          type: 'flex', props: { gap: '6px', wrap: 'wrap' },
          children: [
            { type: 'citation', props: { favicon: '/icons/source.svg', source: 'specsheet', color: '#ef4444', number: 1 } },
            { type: 'citation', props: { favicon: '/icons/source.svg', source: 'techbench', color: '#3b82f6', number: 2 } },
            { type: 'citation', props: { favicon: '/icons/source.svg', source: 'gadgetline', color: '#8b5cf6', number: 3 } },
          ]
        },
        { type: 'sources-bar', props: {
          sources: [
            { favicon: '/icons/source.svg', name: 'specsheet', color: '#ef4444' },
            { favicon: '/icons/source.svg', name: 'techbench', color: '#3b82f6' },
            { favicon: '/icons/source.svg', name: 'gadgetline', color: '#8b5cf6' },
          ]
        }},
        { type: 'follow-up', props: { placeholder: 'Ask about cameras, performance...' } }
      ]
    }
  };

  // ── Pocket: Code Explanation ──────────────────────────────────

  const codePocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        { type: 'heading', props: { text: 'Debounce in JavaScript', level: 3 } },
        { type: 'text', props: {
          text: 'A debounce function delays execution until a pause in calls. Useful for search inputs, window resize handlers, and form validation.',
          size: 'sm'
        }},
        { type: 'terminal', props: {
          lines: [
            { text: 'function debounce(fn, delay = 300) {', type: 'output' },
            { text: '  let timer;', type: 'output' },
            { text: '  return (...args) => {', type: 'output' },
            { text: '    clearTimeout(timer);', type: 'output' },
            { text: '    timer = setTimeout(() => fn(...args), delay);', type: 'output' },
            { text: '  };', type: 'output' },
            { text: '}', type: 'output' },
            { text: '', type: 'output' },
            { text: '// Usage', type: 'output' },
            { text: 'const search = debounce((q) => fetch(`/api?q=${q}`), 500);', type: 'output' },
            { text: 'input.addEventListener("input", (e) => search(e.target.value));', type: 'output' },
          ]
        }},
        { type: 'heading', props: { text: 'How it works', level: 4 } },
        {
          type: 'timeline', props: {
            density: 'compact',
            events: [
              { date: '1.', title: 'Each call clears the previous timer via clearTimeout', type: 'info' },
              { date: '2.', title: 'A new timer is set with the specified delay', type: 'info' },
              { date: '3.', title: 'The function only fires after the caller stops for delay ms', type: 'success' },
              { date: '4.', title: 'Closures preserve the timer reference between calls', type: 'default' },
            ]
          }
        },
        {
          type: 'flex', props: { gap: '6px', wrap: 'wrap' },
          children: [
            { type: 'citation', props: { favicon: '/icons/source.svg', source: 'MDN', color: '#000', number: 1 } },
            { type: 'citation', props: { favicon: '/icons/source.svg', source: 'javascript.info', color: '#f59e0b', number: 2 } },
          ]
        },
        { type: 'follow-up', props: { placeholder: 'Ask about throttle, requestAnimationFrame...' } }
      ]
    }
  };

  // ── Pocket: Travel Guide ──────────────────────────────────────

  const travelPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        { type: 'heading', props: { text: 'Kyoto — 3-Day Itinerary', level: 3 } },
        { type: 'image', props: {
          src: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=700&q=80',
          alt: 'Kyoto temple', width: '100%', height: '200px', fit: 'cover', rounded: 'lg'
        }},
        { type: 'text', props: {
          text: 'Kyoto is Japan\'s cultural heart — home to 17 UNESCO World Heritage sites, 2,000 temples, and some of the best food in the country. Here\'s how to spend three days.',
          size: 'sm'
        }},
        {
          type: 'tabs', props: { tabs: ['Day 1', 'Day 2', 'Day 3'] },
          children: [
            {
              type: 'timeline', props: {
                density: 'compact',
                events: [
                  { date: '7:00', title: 'Fushimi Inari — walk the thousand torii gates (early morning)', type: 'success' },
                  { date: '11:00', title: 'Nishiki Market — street food and local ingredients', type: 'info' },
                  { date: '14:00', title: 'Kiyomizu-dera — panoramic views of the city', type: 'success' },
                  { date: '18:00', title: 'Gion district — evening walk, spot maiko', type: 'default' },
                ]
              }
            },
            {
              type: 'timeline', props: {
                density: 'compact',
                events: [
                  { date: '7:30', title: 'Arashiyama Bamboo Grove — arrive before crowds', type: 'success' },
                  { date: '10:00', title: 'Tenryu-ji temple and garden', type: 'info' },
                  { date: '13:00', title: 'Monkey Park Iwatayama — hilltop views', type: 'default' },
                  { date: '17:00', title: 'Togetsukyo Bridge — sunset photos', type: 'success' },
                ]
              }
            },
            {
              type: 'timeline', props: {
                density: 'compact',
                events: [
                  { date: '8:30', title: 'Kinkaku-ji (Golden Pavilion)', type: 'success' },
                  { date: '10:30', title: 'Ryoan-ji — famous rock garden', type: 'info' },
                  { date: '13:00', title: 'Philosopher\'s Path — peaceful canal walk', type: 'default' },
                  { date: '18:30', title: 'Pontocho alley — farewell dinner', type: 'success' },
                ]
              }
            },
          ]
        },
        {
          type: 'grid', props: { columns: 3, gap: '8px' },
          children: [
            { type: 'metric', props: { label: 'Best Season', value: 'Apr / Nov', variant: 'compact' } },
            { type: 'metric', props: { label: 'Budget/Day', value: '~$120', variant: 'compact' } },
            { type: 'metric', props: { label: 'JR Pass', value: 'Recommended', variant: 'compact' } },
          ]
        },
        { type: 'sources-bar', props: {
          sources: [
            { favicon: '/icons/source.svg', name: 'travel-notes.example', color: '#ef4444' },
            { favicon: '/icons/source.svg', name: 'roamnotes', color: '#0080ff' },
            { favicon: '/icons/source.svg', name: 'staybook', color: '#22c55e' },
          ]
        }},
        { type: 'follow-up', props: { placeholder: 'Ask about accommodation, transport...' } }
      ]
    }
  };

  // ── Company Snapshot — broken into individual cards ─────────
  // In paw-enterprise each of these renders as a separate card
  // in a dashboard grid, not as one monolithic block.

  const cards: { id: string; span: 'full' | 'half'; spec: any }[] = [
    // ── Header (full width) ──
    { id: 'header', span: 'full', spec: {
      version: '1.0' as const,
      ui: { type: 'company-header', props: {
        name: 'Meridian Industries', ticker: 'MERIDIAN', exchange: 'MX',
        description: 'India\'s largest private sector company — energy, petrochemicals, retail, and digital services',
        tags: ['Conglomerate', 'Energy', 'Retail', 'Telecom'],
        price: '\u20B92,920.45', change: '+40.05', changePercent: '+1.39%', marketCap: '\u20B919.76L Cr',
      }}
    }},

    // ── Ticker strip (full width) ──
    { id: 'ticker', span: 'full', spec: {
      version: '1.0' as const,
      ui: { type: 'ticker', props: { items: [
        { symbol: 'MERIDIAN', price: '2,920.45', change: '+40.05', changePercent: '+1.39%' },
        { symbol: 'MX 50', price: '23,710.45', change: '+290.30', changePercent: '+1.24%' },
        { symbol: 'MX BROAD', price: '78,053.52', change: '+848.20', changePercent: '+1.10%' },
      ]}}
    }},

    // ── 52-Week Range ──
    { id: '52w', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'range-bar', props: {
        label: '52-Week Range', min: 2220.3, max: 2956.2, current: 2920.45,
        minLabel: '\u20B92,220', maxLabel: '\u20B92,956', currentLabel: '\u20B92,920', color: '#3b82f6',
      }}
    }},

    // ── Price Target ──
    { id: 'target', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'range-bar', props: {
        label: 'Price Target Range', min: 2400, max: 3400, current: 3050,
        minLabel: '\u20B92,400', maxLabel: '\u20B93,400', currentLabel: '\u20B93,050 median', color: '#22c55e',
      }}
    }},

    // ── Analyst Ratings ──
    { id: 'analyst', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'analyst-bar', props: { buy: 28, hold: 5, sell: 2, consensus: 'Overweight', target: '\u20B93,050' }}
    }},

    // ── Key Insight ──
    { id: 'insight', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'callout', props: {
        variant: 'insight', title: 'Near 52-Week High',
        text: 'Trading at 98.8% of 52-week high, driven by Volt ARPU growth (+15% YoY) and new energy vertical ramp to 10GW.',
      }}
    }},

    // ── Financial Highlights ──
    { id: 'kpis', span: 'full', spec: {
      version: '1.0' as const,
      ui: { type: 'grid', props: { columns: 4, gap: '12px' }, children: [
        { type: 'metric', props: { label: 'Revenue', value: '\u20B99.75L Cr', trend: '+8.2%' } },
        { type: 'metric', props: { label: 'EBITDA', value: '\u20B91.78L Cr', trend: '+12.4%' } },
        { type: 'metric', props: { label: 'Net Profit', value: '\u20B979,020 Cr', trend: '+11.8%' } },
        { type: 'metric', props: { label: 'ROIC', value: '12.6%', trend: '+0.4%' } },
      ]}
    }},

    // ── Company Overview ──
    { id: 'overview', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'kv-table', props: { columns: 1, rows: [
        { key: 'Founded', value: '1966' },
        { key: 'Headquarters', value: 'Mumbai, India' },
        { key: 'Chairman & MD', value: 'Arun Mehra' },
        { key: 'Employees', value: '3,47,000' },
        { key: 'P/E Ratio', value: '25.3x' },
        { key: 'EV/EBITDA', value: '14.8x' },
        { key: 'Div Yield', value: '0.31%' },
        { key: 'Beta', value: '0.82' },
      ]}}
    }},

    // ── Shareholding ──
    { id: 'holding', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [
        { type: 'heading', props: { text: 'Shareholding Pattern', level: 4 } },
        { type: 'chart', props: { type: 'donut', height: 150, data: [
          { label: 'Promoter', value: 50.3 },
          { label: 'FII', value: 23.1 },
          { label: 'DII', value: 14.2 },
          { label: 'Retail & Others', value: 12.4 },
        ]}},
      ]}
    }},

    // ── Price Chart (full width) ──
    { id: 'price', span: 'full', spec: {
      version: '1.0' as const,
      ui: { type: 'chart', props: {
        type: 'area', height: 180, colors: ['#3b82f6'], title: 'MERIDIAN — 6 Month',
        data: [
          { label: 'Oct', value: 2680 }, { label: 'Nov', value: 2720 },
          { label: 'Dec', value: 2650 }, { label: 'Jan', value: 2750 },
          { label: 'Feb', value: 2810 }, { label: 'Mar', value: 2920 },
        ]
      }}
    }},

    // ── Revenue by Segment ──
    { id: 'segments', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [
        { type: 'heading', props: { text: 'Revenue by Segment', level: 4 } },
        { type: 'chart', props: { type: 'donut', height: 155, data: [
          { label: 'O2C (Energy)', value: 55 },
          { label: 'Retail', value: 22 },
          { label: 'Digital (Volt)', value: 18 },
          { label: 'Others', value: 5 },
        ]}},
      ]}
    }},

    // ── Quarterly EPS ──
    { id: 'eps', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [
        { type: 'heading', props: { text: 'Quarterly EPS (\u20B9)', level: 4 } },
        { type: 'chart', props: { type: 'bar', height: 155, data: [
          { label: 'Q1 FY25', value: 17.8 },
          { label: 'Q2 FY25', value: 18.5 },
          { label: 'Q3 FY25', value: 19.2 },
          { label: 'Q4 FY25', value: 20.1 },
        ]}},
      ]}
    }},

    // ── Earnings Surprise ──
    { id: 'earnings', span: 'full', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [
        { type: 'heading', props: { text: 'Earnings Surprise', level: 4 } },
        { type: 'table', props: {
          variant: 'compact',
          columns: [
            { key: 'quarter', label: 'Quarter' },
            { key: 'epsEst', label: 'EPS Est.' },
            { key: 'epsActual', label: 'EPS Actual' },
            { key: 'surprise', label: 'Surprise' },
            { key: 'result', label: '' },
          ],
          rows: [
            { quarter: 'Q4 FY25', epsEst: '\u20B919.5', epsActual: '\u20B920.1', surprise: '+3.1%', result: 'Beat' },
            { quarter: 'Q3 FY25', epsEst: '\u20B918.8', epsActual: '\u20B919.2', surprise: '+2.1%', result: 'Beat' },
            { quarter: 'Q2 FY25', epsEst: '\u20B918.9', epsActual: '\u20B918.5', surprise: '-2.1%', result: 'Miss' },
            { quarter: 'Q1 FY25', epsEst: '\u20B917.2', epsActual: '\u20B917.8', surprise: '+3.5%', result: 'Beat' },
          ]
        }},
      ]}
    }},

    // ── Key Management ──
    { id: 'mgmt', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [
        { type: 'heading', props: { text: 'Key Management', level: 4 } },
        { type: 'table', props: {
          variant: 'compact',
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Role' },
            { key: 'since', label: 'Since' },
          ],
          rows: [
            { name: 'Arun Mehra', role: 'Chairman & MD', since: '2002' },
            { name: 'V. Srikanth', role: 'Joint CFO', since: '2023' },
            { name: 'Nisha Mehra', role: 'ED, Retail', since: '2024' },
            { name: 'Kabir Mehra', role: 'Chair, Volt', since: '2022' },
          ]
        }},
      ]}
    }},

    // ── Key Risks ──
    { id: 'risks', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [
        { type: 'heading', props: { text: 'Key Risks', level: 4 } },
        { type: 'callout', props: { variant: 'warning', title: 'Oil Price Volatility', text: 'O2C segment (55% of revenue) directly exposed to crude and refining margins.' }},
        { type: 'callout', props: { variant: 'warning', title: 'Telecom ARPU', text: 'Volt faces pricing competition from Kestrel; TRB floor pricing an overhang.' }},
        { type: 'callout', props: { variant: 'info', title: 'Succession', text: 'Next-gen leadership transition underway — closely watched by institutions.' }},
      ]}
    }},

    // ── News (full width) ──
    { id: 'news', span: 'full', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '0' }, children: [
        { type: 'news-card', props: { headline: 'Volt Mobile adds 8.3M subscribers in February, ARPU rises to \u20B9203.5', source: 'marketline', time: '2h ago', sentiment: 'bullish' }},
        { type: 'news-card', props: { headline: 'Meridian Retail partners with Loomhaus for India comeback launch', source: 'energy.ledger', time: '5h ago', sentiment: 'bullish' }},
        { type: 'news-card', props: { headline: 'RIL new energy arm targets 20GW solar capacity by 2026', source: 'metro24', time: '1d ago', sentiment: 'neutral' }},
        { type: 'news-card', props: { headline: 'Petral deal valuation under review amid oil price volatility', source: 'tickerwire', time: '2d ago', sentiment: 'bearish' }},
      ]}
    }},

    // ── Key Events ──
    { id: 'events', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [
        { type: 'heading', props: { text: 'Key Events', level: 4 } },
        { type: 'timeline', props: { maxItems: 4, events: [
          { date: 'Mar 2026', title: 'Volt Financial Services IPO filing', type: 'info' },
          { date: 'Jan 2026', title: 'Retail acquires Northway Wholesale', type: 'success' },
          { date: 'Nov 2025', title: '10GW solar factory begins production', type: 'success' },
          { date: 'Sep 2025', title: 'Q2 FY26 results beat estimates', type: 'success' },
          { date: 'Jul 2025', title: 'Petral stake sale talks restart', type: 'warning' },
        ]}},
      ]}
    }},

    // ── Peer Comparison ──
    { id: 'peers', span: 'half', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '8px' }, children: [
        { type: 'heading', props: { text: 'Peer Comparison', level: 4 } },
        { type: 'table', props: {
          variant: 'compact',
          columns: [
            { key: 'co', label: 'Company' },
            { key: 'pe', label: 'P/E' },
            { key: 'npm', label: 'NPM' },
            { key: 'roe', label: 'ROE' },
          ],
          rows: [
            { co: 'Meridian', pe: '25.3x', npm: '8.1%', roe: '9.4%' },
            { co: 'Orion Ent.', pe: '72.1x', npm: '2.4%', roe: '6.8%' },
            { co: 'KSTL', pe: '31.2x', npm: '18.5%', roe: '48.5%' },
            { co: 'Harbor Bank', pe: '18.7x', npm: '22.3%', roe: '16.4%' },
          ]
        }},
      ]}
    }},

    // ── Sources + Follow-up (full width) ──
    { id: 'sources', span: 'full', spec: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '12px' }, children: [
        { type: 'sources-bar', props: { sources: [
          { favicon: '/icons/source.svg', name: 'marketline' }, { favicon: '/icons/source.svg', name: 'MX Exchange' }, { favicon: '/icons/source.svg', name: 'tickerwire' },
          { favicon: '/icons/source.svg', name: 'wirefeed' }, { favicon: '/icons/source.svg', name: 'metro24' }, { favicon: '/icons/source.svg', name: 'energy.ledger' },
        ]}},
        { type: 'follow-up', props: { placeholder: 'Ask about financials, segments, Volt, risks, management...' } },
      ]}
    }},
  ];

  // Keep other pockets as single-card accordion items
  const companySnapshotPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '20px' },
      children: [
        // ── Header ──
        { type: 'company-header', props: {
          name: 'Meridian Industries',
          ticker: 'MERIDIAN',
          exchange: 'MX',
          description: 'India\'s largest private sector company — energy, petrochemicals, retail, and digital services',
          tags: ['Conglomerate', 'Energy', 'Retail', 'Telecom'],
          price: '\u20B92,920.45',
          change: '+40.05',
          changePercent: '+1.39%',
          marketCap: '\u20B919.76L Cr',
        }},

        // ── Ticker context ──
        { type: 'ticker', props: {
          items: [
            { symbol: 'MERIDIAN', price: '2,920.45', change: '+40.05', changePercent: '+1.39%' },
            { symbol: 'MX 50', price: '23,710.45', change: '+290.30', changePercent: '+1.24%' },
            { symbol: 'MX BROAD', price: '78,053.52', change: '+848.20', changePercent: '+1.10%' },
          ]
        }},

        // ── 52-Week Range + Price Target ──
        {
          type: 'grid', props: { columns: 2, gap: '16px' },
          children: [
            { type: 'range-bar', props: {
              label: '52-Week Range', min: 2220.3, max: 2956.2, current: 2920.45,
              minLabel: '\u20B92,220', maxLabel: '\u20B92,956', currentLabel: '\u20B92,920',
              color: '#3b82f6',
            }},
            { type: 'range-bar', props: {
              label: 'Price Target Range', min: 2400, max: 3400, current: 3050,
              minLabel: '\u20B92,400', maxLabel: '\u20B93,400', currentLabel: '\u20B93,050 median',
              color: '#22c55e',
            }},
          ]
        },

        // ── Analyst Ratings ──
        { type: 'analyst-bar', props: {
          buy: 28, hold: 5, sell: 2,
          consensus: 'Overweight',
          target: '\u20B93,050',
        }},

        // ── Key insight ──
        { type: 'callout', props: {
          variant: 'insight',
          title: 'Near 52-Week High',
          text: 'Meridian is trading at 98.8% of its 52-week high, driven by Volt\'s ARPU growth (+15% YoY) and the new energy vertical ramping to 10GW capacity.',
        }},

        // ── Company Facts ──
        { type: 'heading', props: { text: 'Company Overview', level: 4 } },
        { type: 'kv-table', props: {
          columns: 2,
          rows: [
            { key: 'Founded', value: '1966' },
            { key: 'Headquarters', value: 'Mumbai, India' },
            { key: 'Chairman & MD', value: 'Arun Mehra' },
            { key: 'Employees', value: '3,47,000' },
            { key: 'Revenue (FY25)', value: '\u20B99,74,864 Cr' },
            { key: 'Net Profit (FY25)', value: '\u20B979,020 Cr' },
            { key: 'P/E Ratio', value: '25.3x' },
            { key: 'EV/EBITDA', value: '14.8x' },
            { key: 'Div Yield', value: '0.31%' },
            { key: 'Beta', value: '0.82' },
            { key: 'Book Value', value: '\u20B91,108' },
            { key: 'Debt/Equity', value: '0.38' },
          ]
        }},

        // ── Financials KPIs ──
        { type: 'heading', props: { text: 'Financial Highlights', level: 4 } },
        {
          type: 'grid', props: { columns: 4, gap: '12px' },
          children: [
            { type: 'metric', props: { label: 'Revenue', value: '\u20B99.75L Cr', trend: '+8.2%' } },
            { type: 'metric', props: { label: 'EBITDA', value: '\u20B91.78L Cr', trend: '+12.4%' } },
            { type: 'metric', props: { label: 'Net Profit', value: '\u20B979,020 Cr', trend: '+11.8%' } },
            { type: 'metric', props: { label: 'ROIC', value: '12.6%', trend: '+0.4%' } },
          ]
        },

        // ── Price chart ──
        { type: 'chart', props: {
          type: 'area', height: 180, colors: ['#3b82f6'], title: 'MERIDIAN — 6 Month',
          data: [
            { label: 'Oct', value: 2680 }, { label: 'Nov', value: 2720 },
            { label: 'Dec', value: 2650 }, { label: 'Jan', value: 2750 },
            { label: 'Feb', value: 2810 }, { label: 'Mar', value: 2920 },
          ]
        }},

        // ── Revenue by Segment + Quarterly EPS ──
        {
          type: 'grid', props: { columns: 2, gap: '16px' },
          children: [
            {
              type: 'card', props: { title: 'Revenue by Segment' },
              children: [{ type: 'chart', props: {
                type: 'donut', height: 160,
                data: [
                  { label: 'O2C (Energy)', value: 55 },
                  { label: 'Retail', value: 22 },
                  { label: 'Digital (Volt)', value: 18 },
                  { label: 'Others', value: 5 },
                ]
              }}]
            },
            {
              type: 'card', props: { title: 'Quarterly EPS (\u20B9)' },
              children: [{ type: 'chart', props: {
                type: 'bar', height: 160,
                data: [
                  { label: 'Q1 FY25', value: 17.8 },
                  { label: 'Q2 FY25', value: 18.5 },
                  { label: 'Q3 FY25', value: 19.2 },
                  { label: 'Q4 FY25', value: 20.1 },
                ]
              }}]
            },
          ]
        },

        // ── Quarterly Financials Trend ──
        { type: 'heading', props: { text: 'Quarterly Revenue & Profit Trend', level: 4 } },
        { type: 'chart', props: {
          type: 'line', height: 160, title: 'Revenue (L Cr) — Last 8 Quarters',
          data: [
            { label: 'Q1 24', value: 2.15 }, { label: 'Q2 24', value: 2.22 },
            { label: 'Q3 24', value: 2.30 }, { label: 'Q4 24', value: 2.38 },
            { label: 'Q1 25', value: 2.35 }, { label: 'Q2 25', value: 2.48 },
            { label: 'Q3 25', value: 2.44 }, { label: 'Q4 25', value: 2.52 },
          ]
        }},

        // ── Earnings Surprise ──
        { type: 'heading', props: { text: 'Earnings Surprise (Last 4 Quarters)', level: 4 } },
        { type: 'table', props: {
          variant: 'compact',
          columns: [
            { key: 'quarter', label: 'Quarter' },
            { key: 'epsEst', label: 'EPS Est.' },
            { key: 'epsActual', label: 'EPS Actual' },
            { key: 'surprise', label: 'Surprise' },
            { key: 'result', label: '' },
          ],
          rows: [
            { quarter: 'Q4 FY25', epsEst: '\u20B919.5', epsActual: '\u20B920.1', surprise: '+3.1%', result: 'Beat' },
            { quarter: 'Q3 FY25', epsEst: '\u20B918.8', epsActual: '\u20B919.2', surprise: '+2.1%', result: 'Beat' },
            { quarter: 'Q2 FY25', epsEst: '\u20B918.9', epsActual: '\u20B918.5', surprise: '-2.1%', result: 'Miss' },
            { quarter: 'Q1 FY25', epsEst: '\u20B917.2', epsActual: '\u20B917.8', surprise: '+3.5%', result: 'Beat' },
          ]
        }},

        // ── Shareholding Pattern ──
        { type: 'heading', props: { text: 'Shareholding Pattern', level: 4 } },
        {
          type: 'grid', props: { columns: 2, gap: '16px' },
          children: [
            { type: 'chart', props: {
              type: 'donut', height: 160,
              data: [
                { label: 'Promoter', value: 50.3 },
                { label: 'FII', value: 23.1 },
                { label: 'DII', value: 14.2 },
                { label: 'Retail & Others', value: 12.4 },
              ]
            }},
            { type: 'kv-table', props: {
              rows: [
                { key: 'Promoter', value: '50.30%' },
                { key: 'FII / FPI', value: '23.10%' },
                { key: 'DII (MF + Insurance)', value: '14.20%' },
                { key: 'Retail & Others', value: '12.40%' },
                { key: 'Promoter Pledge', value: '0.00%' },
                { key: 'QoQ FII Change', value: '+0.8%' },
              ]
            }},
          ]
        },

        // ── Management Team ──
        { type: 'heading', props: { text: 'Key Management', level: 4 } },
        { type: 'table', props: {
          variant: 'compact',
          columns: [
            { key: 'name', label: 'Name' },
            { key: 'role', label: 'Designation' },
            { key: 'since', label: 'Since' },
          ],
          rows: [
            { name: 'Mukesh D. Mehra', role: 'Chairman & Managing Director', since: '2002' },
            { name: 'V. Srikanth', role: 'Joint CFO', since: '2023' },
            { name: 'K.V. Chowdary', role: 'Lead Independent Director', since: '2020' },
            { name: 'Isha M. Mehra', role: 'Executive Director, Retail', since: '2024' },
            { name: 'Akash M. Mehra', role: 'Chairman, Volt Platforms', since: '2022' },
          ]
        }},

        // ── Key Risks ──
        { type: 'heading', props: { text: 'Key Risks', level: 4 } },
        { type: 'callout', props: {
          variant: 'warning',
          title: 'Oil Price Volatility',
          text: 'O2C segment (55% of revenue) is directly exposed to global crude and refining margins. Kessel Strait disruption could cut feedstock supply.',
        }},
        { type: 'callout', props: {
          variant: 'warning',
          title: 'Telecom ARPU Pressure',
          text: 'Volt faces pricing competition from Kestrel. TRB regulatory changes on interconnect and floor pricing remain an overhang.',
        }},
        { type: 'callout', props: {
          variant: 'info',
          title: 'Succession Planning',
          text: 'Transition of key roles to next-gen leadership (Isha, Kabir Mehra) is underway. Execution continuity is being closely watched by institutional investors.',
        }},

        // ── Recent News ──
        { type: 'heading', props: { text: 'Recent News', level: 4 } },
        {
          type: 'flex', props: { direction: 'column', gap: '0' },
          children: [
            { type: 'news-card', props: {
              headline: 'Volt Mobile adds 8.3M subscribers in February, ARPU rises to \u20B9203.5',
              source: 'marketline', time: '2h ago', sentiment: 'bullish',
            }},
            { type: 'news-card', props: {
              headline: 'Meridian Retail partners with Loomhaus for India comeback launch',
              source: 'energy.ledger', time: '5h ago', sentiment: 'bullish',
            }},
            { type: 'news-card', props: {
              headline: 'RIL new energy arm targets 20GW solar capacity by 2026',
              source: 'metro24', time: '1d ago', sentiment: 'neutral',
            }},
            { type: 'news-card', props: {
              headline: 'Petral deal valuation under review amid oil price volatility',
              source: 'tickerwire', time: '2d ago', sentiment: 'bearish',
            }},
            { type: 'news-card', props: {
              headline: 'SRB approves Volt Financial Services IPO; listing expected Q2 2026',
              source: 'wirefeed', time: '3d ago', sentiment: 'bullish',
            }},
          ]
        },

        // ── Key Events ──
        { type: 'heading', props: { text: 'Key Events & M&A', level: 4 } },
        { type: 'timeline', props: {
          events: [
            { date: 'Mar 2026', title: 'Volt Financial Services IPO filing', detail: 'DRHP filed with SRB for a \u20B91,800 Cr IPO of the fintech arm', type: 'info' },
            { date: 'Jan 2026', title: 'Meridian Retail acquires Northway Wholesale', detail: 'Completed \u20B92,850 Cr acquisition of Metro\'s wholesale business', type: 'success' },
            { date: 'Nov 2025', title: 'New energy arm operationalized', detail: '10GW solar cell factory in Jamnagar begins commercial production', type: 'success' },
            { date: 'Sep 2025', title: 'Q2 FY26 results beat estimates', detail: 'Revenue \u20B92.48L Cr (+9.1%), PAT \u20B920,100 Cr (+14.3%)', type: 'success' },
            { date: 'Jul 2025', title: 'Petral stake sale negotiations restart', detail: 'O2C business carve-out valued at $75B; Petral may take 20% stake', type: 'warning' },
            { date: 'Apr 2025', title: 'Meridian acquires Silverline Studios content library', detail: '\u20B91,200 Cr deal for Silverline+ streaming catalog', type: 'info' },
          ],
          maxItems: 5,
        }},

        // ── Peer Comparison ──
        { type: 'heading', props: { text: 'Peer Comparison', level: 4 } },
        { type: 'table', props: {
          variant: 'striped',
          columns: [
            { key: 'company', label: 'Company' },
            { key: 'mcap', label: 'Mkt Cap' },
            { key: 'pe', label: 'P/E' },
            { key: 'revenue', label: 'Revenue' },
            { key: 'profit', label: 'Net Profit' },
            { key: 'margin', label: 'NPM' },
            { key: 'roe', label: 'ROE' },
          ],
          rows: [
            { company: 'Meridian Industries', mcap: '\u20B919.76L Cr', pe: '25.3x', revenue: '\u20B99.75L Cr', profit: '\u20B979,020 Cr', margin: '8.1%', roe: '9.4%' },
            { company: 'Orion Enterprises', mcap: '\u20B93.82L Cr', pe: '72.1x', revenue: '\u20B91.18L Cr', profit: '\u20B92,840 Cr', margin: '2.4%', roe: '6.8%' },
            { company: 'KSTL', mcap: '\u20B915.20L Cr', pe: '31.2x', revenue: '\u20B92.41L Cr', profit: '\u20B944,600 Cr', margin: '18.5%', roe: '48.5%' },
            { company: 'Harbor Bank', mcap: '\u20B913.10L Cr', pe: '18.7x', revenue: '\u20B93.15L Cr', profit: '\u20B970,200 Cr', margin: '22.3%', roe: '16.4%' },
            { company: 'Kaveri', mcap: '\u20B95.92L Cr', pe: '27.4x', revenue: '\u20B970,820 Cr', profit: '\u20B920,510 Cr', margin: '29.0%', roe: '28.7%' },
          ]
        }},

        // ── Sources ──
        { type: 'sources-bar', props: {
          sources: [
            { favicon: '/icons/source.svg', name: 'marketline' },
            { favicon: '/icons/source.svg', name: 'MX Exchange' },
            { favicon: '/icons/source.svg', name: 'tickerwire' },
            { favicon: '/icons/source.svg', name: 'wirefeed' },
            { favicon: '/icons/source.svg', name: 'metro24' },
            { favicon: '/icons/source.svg', name: 'energy.ledger' },
          ]
        }},

        // ── Follow-up ──
        { type: 'follow-up', props: { placeholder: 'Ask about financials, segments, Volt, risks, management...' } },
      ]
    }
  };

  // ── Pocket: CI/CD Pipeline (Workflow) ────────────────────────

  const cicdWorkflowPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        { type: 'heading', props: { text: 'CI/CD Pipeline', level: 3 } },
        { type: 'text', props: { text: 'Automated build, test, and deploy pipeline with approval gate for production releases.', size: 'sm' } },
        { type: 'workflow', props: {
          title: 'deploy/main',
          minimap: true,
          nodes: [
            { id: 'push', type: 'trigger', label: 'Git Push', status: 'success' },
            { id: 'lint', type: 'action', label: 'Lint & Format', status: 'success' },
            { id: 'test', type: 'action', label: 'Run Tests', status: 'success' },
            { id: 'build', type: 'action', label: 'Build Image', status: 'running' },
            { id: 'scan', type: 'action', label: 'Security Scan', status: 'idle' },
            { id: 'gate', type: 'condition', label: 'Tests Pass?', status: 'idle' },
            { id: 'approve', type: 'approval', label: 'Prod Approval', status: 'idle' },
            { id: 'staging', type: 'action', label: 'Deploy Staging', status: 'idle' },
            { id: 'prod', type: 'output', label: 'Deploy Prod', status: 'idle' },
            { id: 'notify-fail', type: 'output', label: 'Notify Failure', status: 'idle' },
          ],
          edges: [
            { from: 'push', to: 'lint', animated: true },
            { from: 'lint', to: 'test', animated: true },
            { from: 'test', to: 'build', animated: true },
            { from: 'build', to: 'scan' },
            { from: 'scan', to: 'gate' },
            { from: 'gate', to: 'staging', label: 'Yes' },
            { from: 'gate', to: 'notify-fail', label: 'No' },
            { from: 'staging', to: 'approve' },
            { from: 'approve', to: 'prod' },
          ],
        }},
        { type: 'flex', props: { gap: '8px', wrap: 'wrap' }, children: [
          { type: 'badge', props: { text: 'main', variant: 'default' } },
          { type: 'badge', props: { text: 'commit abc1234', variant: 'secondary' } },
          { type: 'badge', props: { text: '3/10 steps done', variant: 'success' } },
        ]},
      ]
    }
  };

  // ── Pocket: Customer Onboarding (Workflow) ─────────────────

  const onboardingWorkflowPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        { type: 'heading', props: { text: 'Customer Onboarding', level: 3 } },
        { type: 'text', props: { text: 'Automated onboarding flow with KYC verification, risk assessment, and welcome sequence.', size: 'sm' } },
        { type: 'workflow', props: {
          title: 'New Signup → Active Customer',
          nodes: [
            { id: 'signup', type: 'trigger', label: 'User Signs Up', status: 'success' },
            { id: 'verify-email', type: 'action', label: 'Verify Email', status: 'success' },
            { id: 'kyc', type: 'action', label: 'KYC Check', status: 'success' },
            { id: 'kyc-ok', type: 'condition', label: 'KYC Passed?', status: 'success' },
            { id: 'risk', type: 'action', label: 'Risk Score', status: 'running' },
            { id: 'manual-review', type: 'approval', label: 'Manual Review', status: 'idle' },
            { id: 'risk-check', type: 'condition', label: 'Low Risk?', status: 'idle' },
            { id: 'provision', type: 'action', label: 'Provision Account', status: 'idle' },
            { id: 'welcome', type: 'connector', label: 'Welcome Sequence', status: 'idle' },
            { id: 'active', type: 'output', label: 'Active Customer', status: 'idle' },
            { id: 'rejected', type: 'output', label: 'Application Declined', status: 'idle' },
          ],
          edges: [
            { from: 'signup', to: 'verify-email', animated: true },
            { from: 'verify-email', to: 'kyc', animated: true },
            { from: 'kyc', to: 'kyc-ok', animated: true },
            { from: 'kyc-ok', to: 'risk', label: 'Yes' },
            { from: 'kyc-ok', to: 'manual-review', label: 'No' },
            { from: 'manual-review', to: 'risk' },
            { from: 'risk', to: 'risk-check' },
            { from: 'risk-check', to: 'provision', label: 'Yes' },
            { from: 'risk-check', to: 'rejected', label: 'No' },
            { from: 'provision', to: 'welcome' },
            { from: 'welcome', to: 'active' },
          ],
        }},
        { type: 'grid', props: { columns: 3, gap: '8px' }, children: [
          { type: 'metric', props: { label: 'Avg. Time', value: '4.2 min', variant: 'compact' } },
          { type: 'metric', props: { label: 'Pass Rate', value: '94.3%', variant: 'compact' } },
          { type: 'metric', props: { label: 'Today', value: '1,284', variant: 'compact' } },
        ]},
      ]
    }
  };

  // ── Pocket: Content Publishing (Workflow) ──────────────────

  const contentWorkflowPocket = {
    version: '1.0' as const,
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '16px' },
      children: [
        { type: 'heading', props: { text: 'Content Publishing Pipeline', level: 3 } },
        { type: 'text', props: { text: 'AI-assisted content creation workflow from draft to multi-channel distribution.', size: 'sm' } },
        { type: 'workflow', props: {
          title: 'Draft → Publish',
          nodes: [
            { id: 'draft', type: 'trigger', label: 'New Draft', status: 'success' },
            { id: 'ai-review', type: 'action', label: 'AI Review', status: 'success' },
            { id: 'seo', type: 'action', label: 'SEO Optimization', status: 'success' },
            { id: 'quality', type: 'condition', label: 'Quality Score > 80?', status: 'success' },
            { id: 'editor', type: 'approval', label: 'Editor Approval', status: 'waiting' },
            { id: 'revise', type: 'action', label: 'Revise Draft', status: 'idle' },
            { id: 'schedule', type: 'action', label: 'Schedule Publish', status: 'idle' },
            { id: 'blog', type: 'output', label: 'Blog', status: 'idle' },
            { id: 'social', type: 'output', label: 'Social Media', status: 'idle' },
            { id: 'newsletter', type: 'output', label: 'Newsletter', status: 'idle' },
          ],
          edges: [
            { from: 'draft', to: 'ai-review', animated: true },
            { from: 'ai-review', to: 'seo', animated: true },
            { from: 'seo', to: 'quality', animated: true },
            { from: 'quality', to: 'editor', label: 'Yes' },
            { from: 'quality', to: 'revise', label: 'No' },
            { from: 'revise', to: 'ai-review' },
            { from: 'editor', to: 'schedule' },
            { from: 'schedule', to: 'blog' },
            { from: 'schedule', to: 'social' },
            { from: 'schedule', to: 'newsletter' },
          ],
        }},
        { type: 'flex', props: { gap: '8px', wrap: 'wrap' }, children: [
          { type: 'badge', props: { text: 'AI-assisted', variant: 'default' } },
          { type: 'badge', props: { text: 'Multi-channel', variant: 'secondary' } },
          { type: 'badge', props: { text: 'Awaiting editor', variant: 'warning' } },
        ]},
      ]
    }
  };

  // ── Pocket definitions for the gallery ────────────────────────

  const pockets = [
    { id: 'research', label: 'Research Article', tag: 'Cited answer', spec: researchPocket },
    { id: 'market', label: 'Market Watch', tag: 'Finance', spec: marketPocket },
    { id: 'cicd', label: 'CI/CD Pipeline', tag: 'Workflow', spec: cicdWorkflowPocket },
    { id: 'onboarding', label: 'Customer Onboarding', tag: 'Workflow', spec: onboardingWorkflowPocket },
    { id: 'content', label: 'Content Publishing', tag: 'Workflow', spec: contentWorkflowPocket },
    { id: 'weather', label: 'Weather', tag: 'Utility', spec: weatherPocket },
    { id: 'analytics', label: 'Analytics', tag: 'Dashboard', spec: analyticsPocket },
    { id: 'comparison', label: 'Comparison', tag: 'Research', spec: comparisonPocket },
    { id: 'code', label: 'Code Explanation', tag: 'Developer', spec: codePocket },
    { id: 'travel', label: 'Travel Guide', tag: 'Lifestyle', spec: travelPocket },
  ];

  // ── Detail specs: what opens when you click a card ──────────
  // Maps card id → expanded pocket spec

  const details: Record<string, any> = {
    news: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '20px' }, children: [
        { type: 'heading', props: { text: 'Volt Mobile adds 8.3M subscribers in February, ARPU rises to \u20B9203.5', level: 3 } },
        { type: 'text', props: { text: 'Volt Platforms reported 8.3 million net subscriber additions in February 2026, pushing its total subscriber base past 490 million. Average Revenue Per User (ARPU) rose to \u20B9203.5, up 15.1% year-on-year, driven by the July 2025 tariff hike and growing adoption of 5G-bundled plans.', size: 'sm' } },
        { type: 'flex', props: { gap: '10px' }, style: { 'overflow-x': 'auto', 'padding-bottom': '4px' }, children: [
          { type: 'source-card', props: { favicon: '/icons/source.svg', source: 'marketline', title: 'Volt adds 8.3M subs in Feb, ARPU crosses \u20B9200 for first time', color: '#22c55e' } },
          { type: 'source-card', props: { favicon: '/icons/source.svg', source: 'energy.ledger', title: 'Telecom subscriber data Feb 2026: Volt leads, Kestrel steady', color: '#ef4444' } },
          { type: 'source-card', props: { favicon: '/icons/source.svg', source: 'metro24', title: 'Volt 5G adoption crosses 200M users milestone', color: '#3b82f6' } },
        ]},
        { type: 'heading', props: { text: 'ARPU Trend', level: 4 } },
        { type: 'chart', props: { type: 'line', height: 160, colors: ['#22c55e'], data: [
          { label: 'Sep 24', value: 172 }, { label: 'Dec 24', value: 176 },
          { label: 'Mar 25', value: 182 }, { label: 'Jun 25', value: 189 },
          { label: 'Sep 25', value: 195 }, { label: 'Dec 25', value: 199 },
          { label: 'Feb 26', value: 203.5 },
        ]}},
        { type: 'text', props: { text: 'Analysts view the ARPU expansion as sustainable. The July 2025 tariff hike added \u20B915–20 to blended ARPU, and 5G-bundled plans carry a further \u20B910–15 premium over 4G equivalents.', size: 'sm' } },
        { type: 'flex', props: { gap: '6px', wrap: 'wrap' }, children: [
          { type: 'citation', props: { favicon: '/icons/source.svg', source: 'marketline', number: 1 } },
          { type: 'citation', props: { favicon: '/icons/source.svg', source: 'metro24', number: 2 } },
        ]},
        { type: 'callout', props: { variant: 'success', title: 'Bullish Signal', text: 'Volt\'s ARPU has grown for 7 consecutive quarters — the longest streak since its 2016 launch. At \u20B9203.5, it is now within 5% of management\'s FY26 target of \u20B9210.' } },
        { type: 'heading', props: { text: 'Subscriber Market Share', level: 4 } },
        { type: 'chart', props: { type: 'donut', height: 150, data: [
          { label: 'Volt', value: 39.2 },
          { label: 'Kestrel', value: 33.8 },
          { label: 'Vi', value: 18.5 },
          { label: 'Statelink', value: 8.5 },
        ]}},
        { type: 'sources-bar', props: { sources: [
          { favicon: '/icons/source.svg', name: 'marketline' }, { favicon: '/icons/source.svg', name: 'metro24' }, { favicon: '/icons/source.svg', name: 'energy.ledger' }, { favicon: '/icons/source.svg', name: 'TRB' },
        ]}},
        { type: 'heading', props: { text: 'Discover more', level: 4 } },
        { type: 'flex', props: { gap: '12px' }, style: { 'overflow-x': 'auto', 'padding-bottom': '4px' }, children: [
          { type: 'discover-card', props: { title: 'Kestrel vs Volt: Q3 Subscriber Battle', description: 'Kestrel reports steady growth but Volt widens the gap...', image: 'https://images.unsplash.com/photo-1556740758-90de374c12ad?w=300&q=70' } },
          { type: 'discover-card', props: { title: 'India 5G Coverage Reaches 85% of Urban Areas', description: 'Both Volt and Kestrel now cover major metros...', image: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=300&q=70' } },
        ]},
        { type: 'follow-up', props: { placeholder: 'Ask about Volt financials, 5G rollout, Kestrel comparison...' } },
      ]}
    },

    earnings: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '20px' }, children: [
        { type: 'heading', props: { text: 'Meridian Industries — Earnings Deep Dive', level: 3 } },
        { type: 'callout', props: { variant: 'success', title: 'Q4 FY25: Beat on Both Lines', text: 'Revenue \u20B92.52L Cr (+5.9% QoQ) vs estimate \u20B92.47L Cr. EPS \u20B920.1 vs estimate \u20B919.5, a +3.1% surprise.' } },
        { type: 'grid', props: { columns: 4, gap: '12px' }, children: [
          { type: 'metric', props: { label: 'Revenue', value: '\u20B92.52L Cr', trend: '+5.9%' } },
          { type: 'metric', props: { label: 'EBITDA', value: '\u20B946,200 Cr', trend: '+8.2%' } },
          { type: 'metric', props: { label: 'PAT', value: '\u20B920,680 Cr', trend: '+7.4%' } },
          { type: 'metric', props: { label: 'EPS', value: '\u20B920.1', trend: '+4.7%' } },
        ]},
        { type: 'heading', props: { text: 'EPS: Estimate vs Actual (Last 8 Quarters)', level: 4 } },
        { type: 'chart', props: { type: 'bar', height: 180, data: [
          { label: 'Q1 24', value: 15.2 }, { label: 'Q2 24', value: 16.1 },
          { label: 'Q3 24', value: 16.8 }, { label: 'Q4 24', value: 17.3 },
          { label: 'Q1 25', value: 17.8 }, { label: 'Q2 25', value: 18.5 },
          { label: 'Q3 25', value: 19.2 }, { label: 'Q4 25', value: 20.1 },
        ]}},
        { type: 'heading', props: { text: 'Segment Performance (Q4 FY25)', level: 4 } },
        { type: 'table', props: { variant: 'striped', columns: [
          { key: 'seg', label: 'Segment' }, { key: 'rev', label: 'Revenue' },
          { key: 'ebitda', label: 'EBITDA' }, { key: 'margin', label: 'Margin' }, { key: 'yoy', label: 'YoY' },
        ], rows: [
          { seg: 'O2C', rev: '\u20B91.38L Cr', ebitda: '\u20B915,200 Cr', margin: '11.0%', yoy: '+4.2%' },
          { seg: 'Retail', rev: '\u20B975,600 Cr', ebitda: '\u20B95,800 Cr', margin: '7.7%', yoy: '+18.5%' },
          { seg: 'Digital (Volt)', rev: '\u20B934,200 Cr', ebitda: '\u20B918,100 Cr', margin: '52.9%', yoy: '+15.1%' },
          { seg: 'Others', rev: '\u20B94,200 Cr', ebitda: '\u20B9850 Cr', margin: '20.2%', yoy: '-2.4%' },
        ]}},
        { type: 'flex', props: { gap: '6px', wrap: 'wrap' }, children: [
          { type: 'citation', props: { favicon: '/icons/source.svg', source: 'marketline', number: 1 } },
          { type: 'citation', props: { favicon: '/icons/source.svg', source: 'tickerwire', number: 2 } },
          { type: 'citation', props: { favicon: '/icons/source.svg', source: 'MX Exchange', number: 3 } },
        ]},
        { type: 'sources-bar', props: { sources: [
          { favicon: '/icons/source.svg', name: 'marketline' }, { favicon: '/icons/source.svg', name: 'tickerwire' }, { favicon: '/icons/source.svg', name: 'MX Exchange' }, { favicon: '/icons/source.svg', name: 'wirefeed' },
        ]}},
        { type: 'follow-up', props: { placeholder: 'Ask about segment margins, guidance, next quarter...' } },
      ]}
    },

    holding: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '20px' }, children: [
        { type: 'heading', props: { text: 'Shareholding Pattern — Meridian Industries', level: 3 } },
        { type: 'chart', props: { type: 'donut', height: 180, data: [
          { label: 'Promoter (Mehra Family)', value: 50.3 },
          { label: 'FII / FPI', value: 23.1 },
          { label: 'DII (MF + Insurance)', value: 14.2 },
          { label: 'Retail & HNI', value: 12.4 },
        ]}},
        { type: 'heading', props: { text: 'Quarterly Change (Last 4 Quarters)', level: 4 } },
        { type: 'table', props: { variant: 'striped', columns: [
          { key: 'cat', label: 'Category' }, { key: 'q1', label: 'Jun 25' },
          { key: 'q2', label: 'Sep 25' }, { key: 'q3', label: 'Dec 25' }, { key: 'q4', label: 'Mar 26' },
        ], rows: [
          { cat: 'Promoter', q1: '50.30%', q2: '50.30%', q3: '50.30%', q4: '50.30%' },
          { cat: 'FII / FPI', q1: '22.10%', q2: '22.50%', q3: '22.80%', q4: '23.10%' },
          { cat: 'DII', q1: '14.90%', q2: '14.60%', q3: '14.40%', q4: '14.20%' },
          { cat: 'Retail & Others', q1: '12.70%', q2: '12.60%', q3: '12.50%', q4: '12.40%' },
        ]}},
        { type: 'callout', props: { variant: 'insight', title: 'FII Accumulation', text: 'Foreign institutional investors have increased their stake by 1.0% over the last 4 quarters — the largest FII build-up since 2021. This coincides with Volt\'s ARPU inflection and new energy capex clarity.' } },
        { type: 'heading', props: { text: 'Top Institutional Holders', level: 4 } },
        { type: 'table', props: { variant: 'compact', columns: [
          { key: 'name', label: 'Institution' }, { key: 'stake', label: 'Stake' }, { key: 'change', label: 'QoQ' },
        ], rows: [
          { name: 'National Assurance Corp.', stake: '6.12%', change: '-0.08%' },
          { name: 'Lodestar Group', stake: '2.84%', change: '+0.12%' },
          { name: 'Ironleaf Capital', stake: '2.21%', change: '+0.15%' },
          { name: 'SBI Mutual Fund', stake: '1.95%', change: '+0.04%' },
          { name: 'GIC Singapore', stake: '1.42%', change: '+0.22%' },
        ]}},
        { type: 'sources-bar', props: { sources: [
          { favicon: '/icons/source.svg', name: 'MX Exchange' }, { favicon: '/icons/source.svg', name: 'marketline' }, { favicon: '/icons/source.svg', name: 'stocktrend' },
        ]}},
        { type: 'follow-up', props: { placeholder: 'Ask about promoter pledge, FII trends, specific funds...' } },
      ]}
    },

    risks: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '16px' }, children: [
        { type: 'heading', props: { text: 'Risk Assessment — Meridian Industries', level: 3 } },
        { type: 'callout', props: { variant: 'warning', title: 'Oil & Gas Price Risk (High)', text: 'O2C contributes 55% of revenue. Kessel Strait disruption has already reduced GRM to $8.2/bbl from $11.5/bbl. Prolonged closure could cut EBITDA by \u20B912,000–15,000 Cr annually.' } },
        { type: 'callout', props: { variant: 'warning', title: 'Telecom Competition (Medium)', text: 'Kestrel\'s aggressive 5G pricing and Statelink\'s 4G launch could pressure Volt\'s market share. TRB floor pricing regulation remains an uncertainty for the sector.' } },
        { type: 'callout', props: { variant: 'info', title: 'Succession & Governance (Medium)', text: 'Transition of operational control to Nisha and Kabir Mehra is progressing. While institutional investors view this favorably, execution continuity is key during the handover period.' } },
        { type: 'callout', props: { variant: 'warning', title: 'Capex Intensity (Medium)', text: 'New energy vertical requires \u20B975,000 Cr capex through FY28. Funding via internal accruals + debt. Debt/Equity ratio could rise from 0.38 to 0.55 if retail and digital FCF underperforms.' } },
        { type: 'callout', props: { variant: 'info', title: 'Regulatory Exposure (Low-Medium)', text: 'Multi-sector exposure means regulatory changes in telecom, retail FDI, refining, or renewables could individually impact business units. No single regulatory event poses existential risk.' } },
        { type: 'sources-bar', props: { sources: [
          { favicon: '/icons/source.svg', name: 'tickerwire' }, { favicon: '/icons/source.svg', name: 'wirefeed' }, { favicon: '/icons/source.svg', name: 'marketline' },
        ]}},
        { type: 'follow-up', props: { placeholder: 'Ask about specific risk factors, mitigation...' } },
      ]}
    },

    events: {
      version: '1.0' as const,
      ui: { type: 'flex', props: { direction: 'column', gap: '16px' }, children: [
        { type: 'heading', props: { text: 'Key Events & M&A — Meridian Industries', level: 3 } },
        { type: 'timeline', props: { events: [
          { date: 'Mar 2026', title: 'Volt Financial Services IPO filing', detail: 'DRHP filed with SRB for a \u20B91,800 Cr IPO of the fintech arm. Listing expected Q2 2026.', type: 'info' },
          { date: 'Jan 2026', title: 'Meridian Retail acquires Northway Wholesale', detail: 'Completed \u20B92,850 Cr acquisition of Metro\'s wholesale business across 31 stores.', type: 'success' },
          { date: 'Nov 2025', title: 'New energy arm operationalized', detail: '10GW solar cell factory in Jamnagar begins commercial production. Additional 5GW battery line under construction.', type: 'success' },
          { date: 'Sep 2025', title: 'Q2 FY26 results beat estimates', detail: 'Revenue \u20B92.48L Cr (+9.1%), PAT \u20B920,100 Cr (+14.3%). Volt ARPU crossed \u20B9195.', type: 'success' },
          { date: 'Jul 2025', title: 'Petral O2C stake sale restart', detail: 'O2C business carve-out valued at $75B; Petral may take 20% stake. Deal expected to close H1 2026.', type: 'warning' },
          { date: 'Apr 2025', title: 'Silverline Studios content library acquired', detail: '\u20B91,200 Cr deal for Silverline+ streaming catalog, merged into VoltCinema.', type: 'info' },
          { date: 'Feb 2025', title: 'Retail crosses 18,000 stores', detail: 'Meridian Retail network reaches 18,446 stores across 7,000+ cities.', type: 'success' },
          { date: 'Oct 2024', title: 'Volt tariff hike', detail: 'Across-the-board 12–25% tariff increase. ARPU expected to reach \u20B9200+ by Q4 FY25.', type: 'info' },
        ]}},
        { type: 'sources-bar', props: { sources: [
          { favicon: '/icons/source.svg', name: 'marketline' }, { favicon: '/icons/source.svg', name: 'tickerwire' }, { favicon: '/icons/source.svg', name: 'wirefeed' }, { favicon: '/icons/source.svg', name: 'metro24' },
        ]}},
        { type: 'follow-up', props: { placeholder: 'Ask about specific deals, upcoming events...' } },
      ]}
    },
  };

  // ── Spec-driven page shell ───────────────────────────────────────────────
  // The dashboard, detail expansion, and pocket gallery are all rendered by
  // a single Ripple spec. Each card / pocket body uses the `ripple-frame`
  // widget to mount its inner spec with isolated state.

  // Flatten cards + pockets into one items array we can drive with each.
  const dashItems = cards.map((c) => ({
    id: c.id,
    span: c.span,
    spec: c.spec,
    clickable: !!details[c.id]
  }));

  const galleryItems = pockets.map((p) => ({
    id: p.id,
    label: p.label,
    tag: p.tag,
    spec: p.spec
  }));

  const pageSpec = {
    version: '1.0' as const,
    state: {
      activeCard: null as string | null,
      activePocket: null as string | null,
      dashItems,
      galleryItems,
      details
    },
    ui: {
      type: 'flex',
      props: { direction: 'column', gap: '24px' },
      class: 'pockets-page',
      children: [
        // ── Snapshot header
        {
          type: 'page-header',
          props: {
            eyebrow: 'POCKETS',
            title: 'Company Snapshot',
            subtitle: 'Each section is its own card — exactly how paw-enterprise renders pockets in a dashboard grid.'
          }
        },

        // ── Expanded detail view
        {
          type: 'if',
          condition: '{state.activeCard != null}',
          children: [
            {
              type: 'flex',
              props: { direction: 'column', gap: '16px' },
              children: [
                {
                  type: 'button',
                  props: { label: '← Back to snapshot', variant: 'ghost', size: 'sm' },
                  on_click: { action: 'set', target: 'activeCard', value: null }
                },
                {
                  type: 'card',
                  children: [
                    {
                      type: 'each',
                      items: 'dashItems',
                      item_as: 'card',
                      children: [
                        {
                          type: 'if',
                          condition: '{state.activeCard == card.id}',
                          children: [
                            { type: 'ripple-frame', props: { spec: '{state.details[card.id]}' } }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ],
          else_children: [
            // ── Dashboard grid
            {
              type: 'grid',
              class: 'classic-dash',
              props: { columns: 2, gap: '12px' },
              children: [
                {
                  type: 'each',
                  items: 'dashItems',
                  item_as: 'card',
                  children: [
                    {
                      type: 'card',
                      props: { interactive: '{card.clickable}', density: 'comfortable' },
                      class: '{card.span == "full" ? "col-span-2" : ""}',
                      on_click: {
                        action: 'branch',
                        if: '{card.clickable}',
                        then: [{ action: 'set', target: 'activeCard', value: '{card.id}' }]
                      },
                      children: [
                        { type: 'ripple-frame', props: { spec: '{card.spec}' } }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        },

        // ── Other pocket types — accordion gallery
        {
          type: 'flex',
          props: { direction: 'column', gap: '8px' },
          style: { 'margin-top': '32px' },
          children: [
            {
              type: 'page-header',
              props: { eyebrow: 'GALLERY', title: 'Other Pockets', subtitle: 'Single-spec pockets for different use cases — click to expand.' }
            },
            {
              type: 'flex',
              props: { direction: 'column', gap: '10px' },
              children: [
                {
                  type: 'each',
                  items: 'galleryItems',
                  item_as: 'pocket',
                  children: [
                    {
                      type: 'card',
                      class: '{state.activePocket == pocket.id ? "ring-1 ring-primary/20" : ""}',
                      children: [
                        {
                          type: 'flex',
                          props: { justify: 'between', align: 'center' },
                          on_click: {
                            action: 'set',
                            target: 'activePocket',
                            value: '{state.activePocket == pocket.id ? null : pocket.id}'
                          },
                          class: 'cursor-pointer',
                          children: [
                            {
                              type: 'flex',
                              props: { gap: '10px', align: 'center' },
                              children: [
                                { type: 'text', props: { text: '{pocket.label}', weight: 'semibold' } },
                                { type: 'badge', props: { text: '{pocket.tag}', variant: 'secondary' } }
                              ]
                            },
                            { type: 'text', props: { text: '{state.activePocket == pocket.id ? "▲" : "▼"}', size: 'xs' } }
                          ]
                        },
                        {
                          type: 'if',
                          condition: '{state.activePocket == pocket.id}',
                          children: [
                            {
                              type: 'flex',
                              props: { direction: 'column' },
                              style: { 'border-top': '1px solid var(--border)', 'padding-top': '12px', 'margin-top': '12px' },
                              children: [
                                { type: 'ripple-frame', props: { spec: '{pocket.spec}' } }
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
</script>

<div class="page">
  <Ripple spec={pageSpec} onEvent={handleEvent} />
</div>

<style>
  .page {
    max-width: 900px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
  }
  /* Phones: one column. The grid widget writes its columns inline, so only
     !important beats it; at two columns each pocket card is wider than its
     track and pushes the page sideways. */
  @media (max-width: 720px) {
    .page {
      padding-inline: 1rem;
    }
    :global(.classic-dash) {
      grid-template-columns: minmax(0, 1fr) !important;
    }
    :global(.classic-dash > .col-span-2) {
      grid-column: auto;
    }
    /* The pockets' own 3-5 column stat grids wrap instead of overflowing. */
    :global(.classic-dash .rgrid) {
      grid-template-columns: repeat(auto-fit, minmax(min(100%, 8rem), 1fr)) !important;
    }
  }
</style>
