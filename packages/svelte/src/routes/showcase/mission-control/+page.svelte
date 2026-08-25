<!--
  Created 2026-06-13 (feat/console-telemetry-widgets): Nerve Mission Control —
  a nullframe-style instrument-panel bento rendered from ONE rippleSpec with the
  console theme. Exercises the new console telemetry widgets (led-clock,
  seismograph, glyph-grid, fill-grid, streak-bars) alongside reskinned existing
  widgets (progress-ring, stat, status-dot, calendar-heatmap, audit-log). The
  theme.colors block sets a near-black instrument palette with Nerve tri-color
  semantics (green = healthy, blue = live, amber = your gate); the theme-applier
  emits these as CSS vars onto the ripple-root so token-driven widgets flip with
  zero per-widget CSS. Dev-only — NOT part of the published package.
-->
<script lang="ts">
  import { Ripple } from '$lib/index.js';
  import type { RippleEvent } from '@ripple-ui/core';

  function handleEvent(event: RippleEvent) {
    console.log('RippleEvent:', event);
  }

  // ── Console theme — near-black instrument palette, Nerve tri-color ──────
  // GREEN  #2FB970 = healthy / running / approved
  // BLUE   #2E6BFF = live / nerve / activity / traces
  // AMBER  #E8852B = pending your gate (the one "look at me" color)
  const consoleTheme = {
    colors: {
      background: '#0B0A09',
      foreground: '#EDEAE3',
      card: '#141210',
      'card-foreground': '#EDEAE3',
      popover: '#141210',
      'popover-foreground': '#EDEAE3',
      // primary = the live blue (drives the throughput ring + token widgets)
      primary: '#2E6BFF',
      'primary-foreground': '#0B0A09',
      // secondary = healthy green
      secondary: '#2FB970',
      'secondary-foreground': '#0B0A09',
      muted: '#1C1A17',
      'muted-foreground': '#8E877C',
      // accent = the amber gate color
      accent: '#E8852B',
      'accent-foreground': '#0B0A09',
      destructive: '#E8503B',
      'destructive-foreground': '#0B0A09',
      border: 'rgba(242,239,233,0.08)',
      input: 'rgba(242,239,233,0.08)',
      ring: '#2E6BFF',
      // telemetry chart palette
      'chart-1': '#2E6BFF',
      'chart-2': '#2FB970',
      'chart-3': '#E8852B',
      'chart-4': '#0F8A4F',
      'chart-5': '#8E877C',
    },
    radius: '0.5rem',
  };

  // Colors referenced inline on per-instance overrides.
  const GREEN = '#2FB970';
  const GREEN_DEEP = '#0F8A4F';
  const BLUE = '#2E6BFF';
  const AMBER = '#E8852B';
  const FG = '#EDEAE3';

  // ── A panel wrapper: a console "cell" with hairline bezel + tiny header ──
  // Returns a card node. We compose the bento with a CSS grid container and
  // place panels into named grid-areas via class.
  function panel(area: string, header: string, body: unknown, opts: { headerRight?: unknown; pad?: string } = {}) {
    return {
      type: 'container',
      class: `mc-cell ${area}`,
      children: [
        {
          type: 'flex',
          props: { justify: 'between', align: 'center' },
          class: 'mc-cell-head',
          children: [
            { type: 'text', props: { text: header }, class: 'mc-label' },
            ...(opts.headerRight ? [opts.headerRight] : []),
          ],
        },
        {
          type: 'container',
          class: `mc-cell-body ${opts.pad ?? ''}`,
          children: Array.isArray(body) ? body : [body],
        },
      ],
    };
  }

  // ── Contribution heatmap pattern (GREEN intensity, 7 days × 30 weeks) ───
  // Rendered via the glyph-grid widget as a brightness matrix (0..3) so it
  // reads as a crisp GitHub-style contribution grid in the console palette —
  // the echarts heatmap carries axis chrome + a visualMap slider that breaks
  // the nullframe calm, so we use the pure-CSS console primitive instead.
  function buildActionPattern() {
    const weeks = 52;
    const rows: number[][] = [];
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let d = 0; d < 7; d++) {
      const row: number[] = [];
      for (let w = 0; w < weeks; w++) {
        const r = rand();
        // 0 = no actions (faint ghost), 1..3 = intensity buckets.
        row.push(r < 0.22 ? 0 : r < 0.5 ? 1 : r < 0.8 ? 2 : 3);
      }
      rows.push(row);
    }
    return { rows, weeks };
  }
  const action = buildActionPattern();

  // Seed array for the bars seismograph (events/min histogram).
  const barSeed = Array.from({ length: 60 }, (_, i) =>
    Math.round(40 + 30 * Math.sin(i / 5) + 18 * Math.sin(i / 1.7) + (i % 4) * 4)
  );

  const missionSpec = {
    version: '1.0' as const,
    theme: consoleTheme,
    ui: {
      type: 'container',
      class: 'mc-root',
      children: [
        {
          type: 'container',
          class: 'mc-bento',
          children: [
            // ── 1 · HERO ───────────────────────────────────────────────
            {
              type: 'container',
              class: 'mc-cell mc-hero',
              children: [
                {
                  type: 'flex',
                  props: { justify: 'between', align: 'start' },
                  class: 'mc-cell-head',
                  children: [
                    { type: 'text', props: { text: 'LOCAL TIME · NEW YORK' }, class: 'mc-label' },
                    {
                      type: 'flex',
                      props: { direction: 'column', align: 'end', gap: '2px' },
                      children: [
                        { type: 'text', props: { text: 'NERVE · SYS.V4' }, class: 'mc-label' },
                        { type: 'text', props: { text: 'UPTIME 41:12:08' }, class: 'mc-mono-dim' },
                      ],
                    },
                  ],
                },
                {
                  type: 'flex',
                  props: { align: 'center', gap: '18px' },
                  class: 'mc-hero-clock',
                  children: [
                    { type: 'status-dot', props: { variant: 'custom', color: AMBER, size: 7 }, class: 'mc-hero-bullet' },
                    {
                      type: 'led-clock',
                      props: { time: true, subTick: true, sub: '08', accent: FG, dot: 9 },
                    },
                  ],
                },
                {
                  type: 'flex',
                  props: { justify: 'between', align: 'end' },
                  class: 'mc-hero-foot',
                  children: [
                    {
                      type: 'flex',
                      props: { direction: 'column', gap: '4px' },
                      children: [
                        {
                          type: 'flex',
                          props: { align: 'center', gap: '8px' },
                          children: [
                            { type: 'status-dot', props: { variant: 'custom', color: GREEN, pulse: true, size: 9 } },
                            { type: 'text', props: { text: 'THE LINE IS RUNNING' }, class: 'mc-running' },
                          ],
                        },
                        { type: 'text', props: { text: 'SATURDAY · 13 JUN 2026 · WEEK 24' }, class: 'mc-mono-dim' },
                      ],
                    },
                    {
                      type: 'flex',
                      props: { direction: 'column', align: 'end', gap: '4px' },
                      children: [
                        { type: 'text', props: { text: 'main ✓ clean' }, class: 'mc-branch' },
                        { type: 'text', props: { text: 'ALL CHANNELS GREEN' }, class: 'mc-mono-dim' },
                      ],
                    },
                  ],
                },
              ],
            },

            // ── 2 · THROUGHPUT (ring, blue) ────────────────────────────
            panel(
              'mc-throughput',
              'GATE THROUGHPUT',
              {
                type: 'flex',
                props: { direction: 'column', align: 'center', justify: 'center', gap: '10px' },
                class: 'mc-ring-wrap',
                children: [
                  {
                    type: 'progress-ring',
                    props: { value: 92, max: 100, size: 132, thickness: 9, color: BLUE, trackColor: 'rgba(46,107,255,0.14)', label: '92%' },
                  },
                  { type: 'text', props: { text: 'APPROVED / REVIEWED' }, class: 'mc-mono-dim' },
                ],
              },
              { headerRight: { type: 'text', props: { text: '24H' }, class: 'mc-label' } }
            ),

            // ── 3 · PENDING AT GATE (amber, the scarce metric) ─────────
            {
              type: 'container',
              class: 'mc-cell mc-pending',
              children: [
                {
                  type: 'flex',
                  props: { justify: 'between', align: 'center' },
                  class: 'mc-cell-head',
                  children: [
                    { type: 'text', props: { text: 'PENDING YOUR GATE' }, class: 'mc-label-amber' },
                    { type: 'status-dot', props: { variant: 'custom', color: AMBER, pulse: true, size: 9 } },
                  ],
                },
                {
                  type: 'container',
                  class: 'mc-cell-body',
                  children: [
                    { type: 'stat', props: { value: 3, size: 'lg' }, class: 'mc-pending-num' },
                    { type: 'text', props: { text: 'PROPOSALS AWAITING APPROVAL' }, class: 'mc-mono-dim mc-mt' },
                    {
                      type: 'flex',
                      props: { direction: 'column', gap: '6px' },
                      class: 'mc-mt2',
                      children: [
                        { type: 'text', props: { text: '› Draft follow-up to the Hendersons' }, class: 'mc-proposal' },
                        { type: 'text', props: { text: '› Flag duplicate invoice #2231' }, class: 'mc-proposal' },
                        { type: 'text', props: { text: '› Vet 2 member applications' }, class: 'mc-proposal' },
                      ],
                    },
                  ],
                },
              ],
            },

            // ── 4 · FOCUS (glyph-grid) ─────────────────────────────────
            panel(
              'mc-focus',
              'FOCUS · POCKET',
              {
                type: 'flex',
                props: { direction: 'column', align: 'center', justify: 'center', gap: '12px' },
                class: 'mc-glyph-wrap',
                children: [
                  { type: 'glyph-grid', props: { glyph: 'n1', color: BLUE, cell: 13 } },
                  { type: 'text', props: { text: 'NERVE · N1' }, class: 'mc-mono-dim' },
                ],
              },
              { headerRight: { type: 'text', props: { text: 'SYNC' }, class: 'mc-label-blue' } }
            ),

            // ── 5 · CREWS ──────────────────────────────────────────────
            panel(
              'mc-crews',
              'CREWS',
              {
                type: 'flex',
                props: { direction: 'column', gap: '12px' },
                children: [
                  { type: 'stat', props: { value: '4 ACTIVE', size: 'md' }, class: 'mc-crew-num' },
                  {
                    type: 'flex',
                    props: { gap: '6px', align: 'center' },
                    children: [
                      { type: 'status-dot', props: { variant: 'custom', color: GREEN, size: 8 } },
                      { type: 'status-dot', props: { variant: 'custom', color: GREEN, size: 8 } },
                      { type: 'status-dot', props: { variant: 'custom', color: GREEN, size: 8 } },
                      { type: 'status-dot', props: { variant: 'custom', color: AMBER, size: 8 } },
                    ],
                  },
                  { type: 'text', props: { text: 'LOAD 0.62 · 3 RUNNING · 1 GATED' }, class: 'mc-mono-dim' },
                ],
              },
              { headerRight: { type: 'status-dot', props: { variant: 'custom', color: GREEN, pulse: true, size: 8 } } }
            ),

            // ── 6 · ACTIONS / DAY (contribution heatmap, green) ────────
            panel(
              'mc-actions',
              'ACTIONS · @NERVE',
              [
                {
                  type: 'glyph-grid',
                  props: { pattern: action.rows, color: GREEN, cell: 14, pulse: false },
                  class: 'mc-heatmap',
                },
                {
                  type: 'flex',
                  props: { justify: 'between' },
                  class: 'mc-mt',
                  children: [
                    { type: 'text', props: { text: '52 WEEKS' }, class: 'mc-mono-dim' },
                    { type: 'text', props: { text: 'BEST 23 / DAY' }, class: 'mc-mono-dim' },
                  ],
                },
              ],
              { headerRight: { type: 'text', props: { text: '2,689 / YR' }, class: 'mc-label' } }
            ),

            // ── 7 · CLEAN RUN (streak-bars, amber) ─────────────────────
            panel(
              'mc-streak',
              'CLEAN RUN',
              {
                type: 'flex',
                props: { direction: 'column', gap: '14px' },
                children: [
                  {
                    type: 'flex',
                    props: { align: 'baseline', gap: '8px' },
                    children: [
                      { type: 'led-clock', props: { value: '41', accent: AMBER, dot: 5 } },
                      { type: 'text', props: { text: 'DAYS' }, class: 'mc-mono-dim' },
                    ],
                  },
                  { type: 'streak-bars', props: { count: 14, filled: 14, color: AMBER, height: 16 } },
                  { type: 'text', props: { text: 'SINCE 02 MAY · BEST 63' }, class: 'mc-mono-dim' },
                ],
              }
            ),

            // ── 8 · GATE EVENTS (seismograph line, blue) ───────────────
            panel(
              'mc-seismo',
              'GATE EVENTS · CH 01',
              {
                type: 'seismograph',
                props: { variant: 'line', live: true, color: BLUE, readout: '12 evt/min', indicatorLabel: 'LIVE', height: 130 },
              }
            ),

            // ── 9 · THROUGHPUT TRACE (seismograph bars) ────────────────
            panel(
              'mc-trace',
              'EVENTS / MIN',
              {
                type: 'seismograph',
                props: { variant: 'bars', live: true, color: GREEN, seed: barSeed, readout: '~58 / min', indicatorLabel: 'REC', height: 130 },
              }
            ),

            // ── 10 · AUDIT TRAIL (audit-log, streaming) ────────────────
            panel(
              'mc-audit',
              'AUDIT · APPROVED BY YOU',
              {
                type: 'audit-log',
                props: {
                  showDetails: false,
                  entries: [
                    { id: '1', actor: 'You', action: 'Approved', target: 'Follow-up · Lopez', timestamp: '11:38', severity: 'success' },
                    { id: '2', actor: 'You', action: 'Held', target: 'Invoice #2231', timestamp: '11:37', severity: 'warning' },
                    { id: '3', actor: 'You', action: 'Approved', target: 'Renewal · Okafor', timestamp: '11:34', severity: 'success' },
                    { id: '4', actor: 'Crew 2', action: 'Drafted', target: 'Member welcome · Vance', timestamp: '11:31', severity: 'info' },
                    { id: '5', actor: 'You', action: 'Approved', target: 'Refund · Singh', timestamp: '11:29', severity: 'success' },
                    { id: '6', actor: 'You', action: 'Held', target: 'Vendor change · Atlas', timestamp: '11:26', severity: 'warning' },
                  ],
                },
                class: 'mc-audit-log',
              },
              { headerRight: { type: 'text', props: { text: 'LIVE' }, class: 'mc-label-blue' } }
            ),
          ],
        },
      ],
    },
  };
</script>

<div class="mc-page">
  <Ripple spec={missionSpec} onEvent={handleEvent} />
</div>

<style>
  /* The page hosts a full-bleed console. The ripple-root carries the theme
     vars; we paint the page background from the same near-black for an
     edge-to-edge instrument feel. */
  :global(body) {
    background: #0b0a09;
  }
  .mc-page {
    min-height: 100vh;
    background: #0b0a09;
    padding: 20px;
  }

  /* ── Bento grid (nullframe proportions) ─────────────────────────────── */
  :global(.mc-root) {
    width: 100%;
    max-width: 1400px;
    margin: 0 auto;
  }
  :global(.mc-bento) {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-auto-rows: minmax(140px, auto);
    gap: 12px;
    grid-template-areas:
      'hero        hero        throughput  pending'
      'hero        hero        focus       crews'
      'actions     actions     actions     streak'
      'seismo      seismo      trace       trace'
      'audit       audit       audit       audit';
  }
  :global(.mc-hero)        { grid-area: hero; }
  :global(.mc-throughput)  { grid-area: throughput; }
  :global(.mc-pending)     { grid-area: pending; }
  :global(.mc-focus)       { grid-area: focus; }
  :global(.mc-crews)       { grid-area: crews; }
  :global(.mc-actions)     { grid-area: actions; }
  :global(.mc-streak)      { grid-area: streak; }
  :global(.mc-seismo)      { grid-area: seismo; }
  :global(.mc-trace)       { grid-area: trace; }
  :global(.mc-audit)       { grid-area: audit; }

  /* ── Cell bezel ─────────────────────────────────────────────────────── */
  :global(.mc-cell) {
    display: flex;
    flex-direction: column;
    gap: 14px;
    background: #141210;
    border: 1px solid rgba(242, 239, 233, 0.08);
    border-radius: 8px;
    padding: 18px 18px;
    overflow: hidden;
    min-width: 0;
  }
  :global(.mc-cell-head) {
    width: 100%;
  }
  :global(.mc-cell-body) {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
  }

  /* ── Typographic console primitives ─────────────────────────────────── */
  :global(.mc-label) {
    font-family: ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #8e877c;
  }
  :global(.mc-label-amber) {
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #e8852b;
  }
  :global(.mc-label-blue) {
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: #2e6bff;
  }
  :global(.mc-mono-dim) {
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 11px;
    letter-spacing: 0.06em;
    color: #6f6960;
  }
  :global(.mc-running) {
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 13px;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #2fb970;
    font-weight: 600;
  }
  :global(.mc-branch) {
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 12px;
    color: #2fb970;
  }

  /* ── Hero ──────────────────────────────────────────────────────────── */
  :global(.mc-hero) {
    justify-content: space-between;
  }
  :global(.mc-hero-clock) {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 12px 0 18px;
  }
  :global(.mc-hero-foot) {
    width: 100%;
  }

  /* ── Pending ───────────────────────────────────────────────────────── */
  :global(.mc-pending) {
    border-color: rgba(232, 133, 43, 0.35);
    box-shadow: inset 0 0 0 1px rgba(232, 133, 43, 0.08), 0 0 24px -12px rgba(232, 133, 43, 0.4);
  }
  :global(.mc-pending-num .mc-pending-num),
  :global(.mc-pending-num) :global(span) {
    color: #e8852b;
  }
  :global(.mc-pending-num [data-slot]),
  :global(.mc-pending-num span) {
    color: #e8852b !important;
  }
  :global(.mc-mt)  { margin-top: 10px; }
  :global(.mc-mt2) { margin-top: 14px; }
  :global(.mc-proposal) {
    font-family: ui-monospace, 'SF Mono', monospace;
    font-size: 12px;
    color: #b8b1a6;
  }

  /* ── Ring / glyph centering ────────────────────────────────────────── */
  :global(.mc-ring-wrap),
  :global(.mc-glyph-wrap) {
    flex: 1;
    min-height: 150px;
  }
  :global(.mc-crew-num span) {
    color: #edeae3;
  }

  /* ── Heatmap / audit fit ───────────────────────────────────────────── */
  :global(.mc-heatmap) {
    width: 100%;
    max-width: 100%;
    overflow: hidden;
  }
  /* Let the contribution grid breathe to the full cell width while keeping
     square-ish cells. */
  :global(.mc-actions .mc-cell-body) {
    align-items: stretch;
  }
  :global(.mc-audit-log) {
    width: 100%;
  }

  /* ── Responsive: collapse to a single column on mobile ─────────────── */
  @media (max-width: 760px) {
    :global(.mc-bento) {
      grid-template-columns: 1fr;
      grid-template-areas:
        'hero'
        'throughput'
        'pending'
        'focus'
        'crews'
        'actions'
        'streak'
        'seismo'
        'trace'
        'audit';
    }
  }
</style>
