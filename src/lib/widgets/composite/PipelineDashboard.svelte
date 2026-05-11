<!--
  @file PipelineDashboard.svelte
  @description Sales / pipeline / fundraising / recruiting funnel archetype:
  quota progress hero + leaderboard side rail → funnel chart with stage
  conversion stats → deals table → live activity ticker.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Funnel from '$lib/widgets/data/Funnel.svelte';
  import Table from '$lib/widgets/data/Table.svelte';

  interface Quota {
    label?: string;
    current: number;
    target: number;
    currency?: string;
    period?: string;
  }

  interface Stage {
    label: string;
    value: number;
    color?: string;
  }

  interface Conversion {
    from: string;
    to: string;
    rate: number; // 0..100
  }

  interface LeaderItem {
    name: string;
    avatar?: string;
    value: string | number;
    delta?: string;
    sublabel?: string;
    position?: number;
  }

  interface Leaderboard {
    title?: string;
    items: LeaderItem[];
  }

  interface TableConfig {
    title?: string;
    columns: { key: string; label: string; align?: 'left' | 'right' | 'center' }[];
    rows: Record<string, unknown>[];
  }

  interface TickerItem {
    time: string;
    label: string;
    actor?: string;
    icon?: string;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    subtitle?: string;
    period?: string;
    quota?: Quota;
    funnel?: { stages: Stage[]; title?: string };
    conversion?: Conversion[];
    leaderboard?: Leaderboard;
    deals?: TableConfig;
    ticker?: TickerItem[];
  }

  let {
    id,
    class: className,
    style,
    title,
    subtitle,
    period,
    quota,
    funnel,
    conversion = [],
    leaderboard,
    deals,
    ticker = []
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function fmtCurrency(n: number, currency: string = '$'): string {
    if (n >= 1_000_000) return `${currency}${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${currency}${(n / 1_000).toFixed(0)}k`;
    return `${currency}${n}`;
  }

  function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('');
  }

  const quotaPct = $derived(quota ? Math.min(100, Math.max(0, (quota.current / quota.target) * 100)) : 0);
  const onTrack = $derived(quotaPct >= 70);
</script>

<div {id} class={cn('rpipe', className)} style={styleString}>
  {#if title || subtitle || period}
    <header class="rpipe-header">
      <div>
        {#if title}<h1 class="rpipe-title">{title}</h1>{/if}
        {#if subtitle}<p class="rpipe-subtitle">{subtitle}</p>{/if}
      </div>
      {#if period}
        <span class="rpipe-period">
          <Icon name="calendar" size={12} />
          {period}
        </span>
      {/if}
    </header>
  {/if}

  {#if quota || leaderboard}
    <div class={cn('rpipe-top', quota && leaderboard ? 'rpipe-top-2' : 'rpipe-top-1')}>
      {#if quota}
        <div class="rpipe-quota">
          <div class="rpipe-quota-head">
            <div>
              <div class="rpipe-quota-label">{quota.label ?? 'Quota'}</div>
              {#if quota.period}<div class="rpipe-quota-period">{quota.period}</div>{/if}
            </div>
            <div class="rpipe-quota-pct">
              <span class={cn('rpipe-quota-pct-num', onTrack ? 'rpipe-on-track' : 'rpipe-off-track')}>{Math.round(quotaPct)}%</span>
              <span class="rpipe-quota-pct-label">of target</span>
            </div>
          </div>
          <div class="rpipe-quota-bar">
            <div class={cn('rpipe-quota-fill', onTrack ? 'rpipe-fill-on' : 'rpipe-fill-off')} style={`width:${quotaPct}%`}></div>
          </div>
          <div class="rpipe-quota-foot">
            <div>
              <span class="rpipe-quota-current">{fmtCurrency(quota.current, quota.currency)}</span>
              <span class="rpipe-quota-sep"> / </span>
              <span class="rpipe-quota-target">{fmtCurrency(quota.target, quota.currency)}</span>
            </div>
            <div class="rpipe-quota-remaining">
              {fmtCurrency(Math.max(0, quota.target - quota.current), quota.currency)} to go
            </div>
          </div>
        </div>
      {/if}
      {#if leaderboard}
        <div class="rpipe-card">
          <div class="rpipe-card-title">{leaderboard.title ?? 'Leaderboard'}</div>
          <ol class="rpipe-leader">
            {#each leaderboard.items as item, i}
              {@const pos = item.position ?? i + 1}
              <li class={cn('rpipe-leader-item', pos === 1 && 'rpipe-leader-1', pos === 2 && 'rpipe-leader-2', pos === 3 && 'rpipe-leader-3')}>
                <span class="rpipe-leader-pos">{pos}</span>
                {#if item.avatar}
                  <img src={item.avatar} alt={item.name} class="rpipe-leader-avatar" />
                {:else}
                  <span class="rpipe-leader-initials">{initials(item.name)}</span>
                {/if}
                <div class="rpipe-leader-body">
                  <div class="rpipe-leader-name">{item.name}</div>
                  {#if item.sublabel}<div class="rpipe-leader-sub">{item.sublabel}</div>{/if}
                </div>
                <div class="rpipe-leader-stat">
                  <span class="rpipe-leader-value">{item.value}</span>
                  {#if item.delta}<span class="rpipe-leader-delta">{item.delta}</span>{/if}
                </div>
              </li>
            {/each}
          </ol>
        </div>
      {/if}
    </div>
  {/if}

  {#if funnel}
    <div class={cn('rpipe-funnel-row', conversion.length > 0 ? 'rpipe-funnel-row-2' : 'rpipe-funnel-row-1')}>
      <div class="rpipe-card">
        <div class="rpipe-card-title">{funnel.title ?? 'Funnel'}</div>
        <Funnel
          data={funnel.stages.map((s) => ({ label: s.label, value: s.value }))}
          colors={funnel.stages.map((s) => s.color).filter((c): c is string => Boolean(c))}
        />
      </div>
      {#if conversion.length > 0}
        <div class="rpipe-card">
          <div class="rpipe-card-title">Conversion</div>
          <ul class="rpipe-conv">
            {#each conversion as c}
              <li class="rpipe-conv-item">
                <span class="rpipe-conv-stages">
                  {c.from}
                  <Icon name="arrow-right" size={11} />
                  {c.to}
                </span>
                <span class={cn('rpipe-conv-rate', c.rate >= 50 ? 'rpipe-conv-good' : c.rate >= 25 ? 'rpipe-conv-mid' : 'rpipe-conv-low')}>
                  {c.rate.toFixed(1)}%
                </span>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  {#if deals}
    <div class="rpipe-card">
      {#if deals.title}<div class="rpipe-card-title">{deals.title}</div>{/if}
      <Table columns={deals.columns} rows={deals.rows} />
    </div>
  {/if}

  {#if ticker.length > 0}
    <div class="rpipe-card">
      <div class="rpipe-card-title">Live activity</div>
      <ol class="rpipe-ticker">
        {#each ticker as t}
          <li class="rpipe-ticker-item">
            <span class="rpipe-ticker-dot"></span>
            <div class="rpipe-ticker-body">
              <div class="rpipe-ticker-row">
                <span class="rpipe-ticker-label">
                  {#if t.icon}<Icon name={t.icon} size={11} />{/if}
                  {t.label}
                </span>
                <span class="rpipe-ticker-time">{t.time}</span>
              </div>
              {#if t.actor}<span class="rpipe-ticker-actor">{t.actor}</span>{/if}
            </div>
          </li>
        {/each}
      </ol>
    </div>
  {/if}
</div>

<style>
  .rpipe {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }
  .rpipe-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    flex-wrap: wrap;
    border-bottom: 1px solid var(--border);
    padding-bottom: 12px;
  }
  .rpipe-title { font-size: 22px; font-weight: 600; margin: 0; letter-spacing: -0.01em; }
  .rpipe-subtitle { font-size: 13px; color: var(--muted-foreground); margin: 4px 0 0; }
  .rpipe-period {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    height: 32px;
    padding: 0 12px;
    border-radius: 8px;
    border: 1px solid var(--border);
    background: var(--card);
    font-size: 12.5px;
  }

  .rpipe-top { display: grid; gap: 14px; grid-template-columns: 1fr; }
  @media (min-width: 920px) {
    .rpipe-top-2 { grid-template-columns: minmax(0, 1.5fr) minmax(0, 1fr); }
  }

  .rpipe-quota {
    padding: 22px 24px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: linear-gradient(180deg, color-mix(in oklab, oklch(0.55 0.18 250) 7%, var(--card)) 0%, var(--card) 100%);
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .rpipe-quota-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }
  .rpipe-quota-label {
    font-size: 11.5px;
    color: var(--muted-foreground);
    font-weight: 500;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .rpipe-quota-period {
    font-size: 12px;
    color: var(--muted-foreground);
    margin-top: 2px;
  }
  .rpipe-quota-pct {
    text-align: right;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
  }
  .rpipe-quota-pct-num {
    font-size: 36px;
    font-weight: 700;
    line-height: 1;
    font-variant-numeric: tabular-nums;
    letter-spacing: -0.02em;
  }
  .rpipe-on-track { color: oklch(0.55 0.18 150); }
  .rpipe-off-track { color: oklch(0.6 0.2 50); }
  .rpipe-quota-pct-label {
    font-size: 11px;
    color: var(--muted-foreground);
    margin-top: 1px;
  }
  .rpipe-quota-bar {
    height: 14px;
    background: var(--muted);
    border-radius: 999px;
    overflow: hidden;
  }
  .rpipe-quota-fill {
    height: 100%;
    border-radius: 999px;
    transition: width 0.6s cubic-bezier(.2,.8,.2,1);
  }
  .rpipe-fill-on { background: linear-gradient(90deg, oklch(0.6 0.18 150), oklch(0.55 0.18 150)); }
  .rpipe-fill-off { background: linear-gradient(90deg, oklch(0.65 0.2 50), oklch(0.55 0.2 50)); }
  .rpipe-quota-foot {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    flex-wrap: wrap;
    gap: 6px;
  }
  .rpipe-quota-current { font-weight: 700; color: var(--foreground); font-variant-numeric: tabular-nums; }
  .rpipe-quota-sep { color: var(--muted-foreground); }
  .rpipe-quota-target { color: var(--muted-foreground); font-variant-numeric: tabular-nums; }
  .rpipe-quota-remaining { color: var(--muted-foreground); }

  .rpipe-card {
    padding: 16px 18px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .rpipe-card-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Leaderboard */
  .rpipe-leader {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rpipe-leader-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 10px;
    background: color-mix(in oklab, var(--muted) 30%, transparent);
  }
  .rpipe-leader-1 { background: linear-gradient(90deg, color-mix(in oklab, oklch(0.78 0.16 90) 25%, transparent), transparent); }
  .rpipe-leader-2 { background: linear-gradient(90deg, color-mix(in oklab, oklch(0.7 0.04 250) 18%, transparent), transparent); }
  .rpipe-leader-3 { background: linear-gradient(90deg, color-mix(in oklab, oklch(0.6 0.12 50) 18%, transparent), transparent); }
  .rpipe-leader-pos {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: var(--card);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    font-weight: 700;
    flex-shrink: 0;
    color: var(--muted-foreground);
    border: 1px solid var(--border);
  }
  .rpipe-leader-1 .rpipe-leader-pos { background: oklch(0.78 0.16 90); color: white; border-color: transparent; }
  .rpipe-leader-2 .rpipe-leader-pos { background: oklch(0.7 0.04 250); color: white; border-color: transparent; }
  .rpipe-leader-3 .rpipe-leader-pos { background: oklch(0.6 0.12 50); color: white; border-color: transparent; }
  .rpipe-leader-avatar,
  .rpipe-leader-initials {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--muted);
    color: var(--foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .rpipe-leader-body {
    flex: 1;
    min-width: 0;
  }
  .rpipe-leader-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }
  .rpipe-leader-sub {
    font-size: 11px;
    color: var(--muted-foreground);
  }
  .rpipe-leader-stat {
    text-align: right;
    display: flex;
    flex-direction: column;
  }
  .rpipe-leader-value {
    font-size: 13px;
    font-weight: 600;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }
  .rpipe-leader-delta {
    font-size: 10.5px;
    color: var(--muted-foreground);
  }

  .rpipe-funnel-row { display: grid; gap: 12px; grid-template-columns: 1fr; }
  @media (min-width: 920px) {
    .rpipe-funnel-row-2 { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
  }

  /* Conversion */
  .rpipe-conv {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rpipe-conv-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 8px 10px;
    border-radius: 8px;
    background: color-mix(in oklab, var(--muted) 30%, transparent);
  }
  .rpipe-conv-stages {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 12.5px;
    color: var(--foreground);
  }
  .rpipe-conv-rate {
    font-size: 14px;
    font-weight: 600;
    font-variant-numeric: tabular-nums;
  }
  .rpipe-conv-good { color: oklch(0.55 0.18 150); }
  .rpipe-conv-mid { color: oklch(0.55 0.18 70); }
  .rpipe-conv-low { color: oklch(0.55 0.22 25); }

  /* Ticker */
  .rpipe-ticker {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
    max-height: 280px;
    overflow-y: auto;
  }
  .rpipe-ticker-item {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .rpipe-ticker-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: oklch(0.55 0.18 250);
    margin-top: 6px;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px color-mix(in oklab, oklch(0.55 0.18 250) 18%, transparent);
  }
  .rpipe-ticker-body { flex: 1; min-width: 0; }
  .rpipe-ticker-row {
    display: flex;
    justify-content: space-between;
    gap: 10px;
    align-items: baseline;
  }
  .rpipe-ticker-label {
    font-size: 13px;
    color: var(--foreground);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .rpipe-ticker-time {
    font-size: 11px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .rpipe-ticker-actor {
    font-size: 11.5px;
    color: var(--muted-foreground);
  }
</style>
