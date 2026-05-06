<!--
  @file ProjectDashboard.svelte
  @description Project / agile / engineering dashboard archetype: project
  header (status, progress, lead, due) → burndown chart → status breakdown
  bars → team load list → milestones + recent updates feed.
-->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import Icon from '$lib/widgets/display/Icon.svelte';
  import Chart from '$lib/widgets/data/Chart.svelte';

  type ProjectStatus = 'on-track' | 'at-risk' | 'off-track' | 'completed' | 'paused';

  interface Lead {
    name: string;
    avatar?: string;
    role?: string;
  }

  interface MetaItem {
    label: string;
    value: string;
    icon?: string;
  }

  interface BurndownPoint {
    label: string;
    value?: number;
    series?: Record<string, number>;
    [key: string]: unknown;
  }

  interface Breakdown {
    todo?: number;
    inProgress?: number;
    done?: number;
    blocked?: number;
  }

  interface TeamMember {
    name: string;
    avatar?: string;
    role?: string;
    /** 0–100; > 100 highlights overload. */
    load?: number;
    status?: 'available' | 'busy' | 'overloaded' | 'off';
  }

  interface Update {
    time: string;
    actor?: string;
    label: string;
    icon?: string;
    type?: string;
  }

  interface Milestone {
    label: string;
    due?: string;
    done?: boolean;
    overdue?: boolean;
  }

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    title?: string;
    description?: string;
    status?: ProjectStatus;
    progress?: number;
    dueDate?: string;
    lead?: Lead;
    meta?: MetaItem[];
    burndown?: { data: BurndownPoint[]; title?: string };
    breakdown?: Breakdown;
    team?: TeamMember[];
    updates?: Update[];
    milestones?: Milestone[];
  }

  let {
    id,
    class: className,
    style,
    title,
    description,
    status,
    progress,
    dueDate,
    lead,
    meta = [],
    burndown,
    breakdown,
    team = [],
    updates = [],
    milestones = []
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  const STATUS_META: Record<ProjectStatus, { label: string; color: string; bg: string; icon: string }> = {
    'on-track': { label: 'On track', color: 'oklch(0.55 0.18 150)', bg: 'color-mix(in oklab, oklch(0.55 0.18 150) 14%, transparent)', icon: 'check-circle-2' },
    'at-risk': { label: 'At risk', color: 'oklch(0.6 0.2 70)', bg: 'color-mix(in oklab, oklch(0.6 0.2 70) 16%, transparent)', icon: 'alert-triangle' },
    'off-track': { label: 'Off track', color: 'oklch(0.55 0.22 25)', bg: 'color-mix(in oklab, oklch(0.55 0.22 25) 16%, transparent)', icon: 'alert-octagon' },
    completed: { label: 'Completed', color: 'oklch(0.55 0.18 250)', bg: 'color-mix(in oklab, oklch(0.55 0.18 250) 12%, transparent)', icon: 'check' },
    paused: { label: 'Paused', color: 'var(--muted-foreground)', bg: 'var(--muted)', icon: 'pause' }
  };

  function initials(name: string): string {
    return name.split(/\s+/).filter(Boolean).slice(0, 2).map((n) => n[0]?.toUpperCase()).join('');
  }

  const totalTasks = $derived.by(() => {
    if (!breakdown) return 0;
    return (breakdown.todo ?? 0) + (breakdown.inProgress ?? 0) + (breakdown.done ?? 0) + (breakdown.blocked ?? 0);
  });

  function pct(n?: number): number {
    if (!totalTasks || !n) return 0;
    return (n / totalTasks) * 100;
  }
</script>

<div {id} class={cn('rproj', className)} style={styleString}>
  {#if title || description || status !== undefined || progress !== undefined || dueDate || lead}
    <header class="rproj-header">
      <div class="rproj-header-main">
        <div class="rproj-header-row">
          {#if title}<h1 class="rproj-title">{title}</h1>{/if}
          {#if status}
            {@const sm = STATUS_META[status]}
            <span class="rproj-status" style={`color:${sm.color}; background:${sm.bg}; border:1px solid color-mix(in oklab, ${sm.color} 35%, transparent);`}>
              <Icon name={sm.icon} size={11} />
              {sm.label}
            </span>
          {/if}
        </div>
        {#if description}<p class="rproj-description">{description}</p>{/if}

        {#if progress !== undefined}
          <div class="rproj-progress-block">
            <div class="rproj-progress-row">
              <span class="rproj-progress-label">Progress</span>
              <span class="rproj-progress-pct">{Math.round(progress)}%</span>
            </div>
            <div class="rproj-progress-track">
              <div class="rproj-progress-fill" style={`width:${Math.max(0, Math.min(100, progress))}%`}></div>
            </div>
          </div>
        {/if}
      </div>
      <div class="rproj-side">
        {#if lead}
          <div class="rproj-lead">
            {#if lead.avatar}
              <img src={lead.avatar} alt={lead.name} class="rproj-lead-avatar" />
            {:else}
              <span class="rproj-lead-initials">{initials(lead.name)}</span>
            {/if}
            <div>
              <div class="rproj-lead-label">Lead</div>
              <div class="rproj-lead-name">{lead.name}</div>
              {#if lead.role}<div class="rproj-lead-role">{lead.role}</div>{/if}
            </div>
          </div>
        {/if}
        {#if dueDate}
          <div class="rproj-due">
            <Icon name="calendar" size={12} />
            <div>
              <div class="rproj-due-label">Due</div>
              <div class="rproj-due-value">{dueDate}</div>
            </div>
          </div>
        {/if}
      </div>
    </header>
  {/if}

  {#if meta.length > 0}
    <dl class="rproj-meta">
      {#each meta as m}
        <div class="rproj-meta-item">
          <dt>
            {#if m.icon}<Icon name={m.icon} size={11} />{/if}
            {m.label}
          </dt>
          <dd>{m.value}</dd>
        </div>
      {/each}
    </dl>
  {/if}

  {#if burndown || breakdown}
    <div class="rproj-row">
      {#if burndown}
        <div class="rproj-card">
          <div class="rproj-card-title">{burndown.title ?? 'Burndown'}</div>
          <Chart data={burndown.data} type="line" height={220} />
        </div>
      {/if}
      {#if breakdown}
        <div class="rproj-card">
          <div class="rproj-card-title">Status breakdown</div>
          <div class="rproj-bd">
            {#if breakdown.done !== undefined}
              <div class="rproj-bd-row">
                <span class="rproj-bd-label">Done</span>
                <div class="rproj-bd-track"><div class="rproj-bd-fill rproj-bd-done" style={`width:${pct(breakdown.done)}%`}></div></div>
                <span class="rproj-bd-num">{breakdown.done}</span>
              </div>
            {/if}
            {#if breakdown.inProgress !== undefined}
              <div class="rproj-bd-row">
                <span class="rproj-bd-label">In progress</span>
                <div class="rproj-bd-track"><div class="rproj-bd-fill rproj-bd-progress" style={`width:${pct(breakdown.inProgress)}%`}></div></div>
                <span class="rproj-bd-num">{breakdown.inProgress}</span>
              </div>
            {/if}
            {#if breakdown.todo !== undefined}
              <div class="rproj-bd-row">
                <span class="rproj-bd-label">To do</span>
                <div class="rproj-bd-track"><div class="rproj-bd-fill rproj-bd-todo" style={`width:${pct(breakdown.todo)}%`}></div></div>
                <span class="rproj-bd-num">{breakdown.todo}</span>
              </div>
            {/if}
            {#if breakdown.blocked !== undefined && breakdown.blocked > 0}
              <div class="rproj-bd-row">
                <span class="rproj-bd-label">Blocked</span>
                <div class="rproj-bd-track"><div class="rproj-bd-fill rproj-bd-blocked" style={`width:${pct(breakdown.blocked)}%`}></div></div>
                <span class="rproj-bd-num">{breakdown.blocked}</span>
              </div>
            {/if}
            <div class="rproj-bd-total">
              <span>Total</span>
              <span class="rproj-bd-num">{totalTasks}</span>
            </div>
          </div>
        </div>
      {/if}
    </div>
  {/if}

  {#if team.length > 0 || milestones.length > 0}
    <div class="rproj-row">
      {#if team.length > 0}
        <div class="rproj-card">
          <div class="rproj-card-title">Team</div>
          <ul class="rproj-team">
            {#each team as m}
              {@const load = m.load ?? 0}
              {@const overloaded = load > 100 || m.status === 'overloaded'}
              <li class="rproj-team-item">
                {#if m.avatar}
                  <img src={m.avatar} alt={m.name} class="rproj-team-avatar" />
                {:else}
                  <span class="rproj-team-initials">{initials(m.name)}</span>
                {/if}
                <div class="rproj-team-body">
                  <div class="rproj-team-row">
                    <span class="rproj-team-name">{m.name}</span>
                    {#if m.role}<span class="rproj-team-role">{m.role}</span>{/if}
                  </div>
                  {#if m.load !== undefined}
                    <div class="rproj-team-load">
                      <div class={cn('rproj-team-bar', overloaded && 'rproj-team-bar-over')} style={`width:${Math.min(100, load)}%`}></div>
                      <span class="rproj-team-load-num">{load}%</span>
                    </div>
                  {/if}
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}

      {#if milestones.length > 0}
        <div class="rproj-card">
          <div class="rproj-card-title">Milestones</div>
          <ul class="rproj-milestones">
            {#each milestones as ms}
              <li class={cn('rproj-ms', ms.done && 'rproj-ms-done', ms.overdue && 'rproj-ms-overdue')}>
                <span class="rproj-ms-dot">
                  {#if ms.done}
                    <Icon name="check" size={11} color="white" />
                  {:else if ms.overdue}
                    <Icon name="alert-circle" size={11} color="white" />
                  {/if}
                </span>
                <div class="rproj-ms-body">
                  <span class="rproj-ms-label">{ms.label}</span>
                  {#if ms.due}<span class="rproj-ms-due">{ms.due}</span>{/if}
                </div>
              </li>
            {/each}
          </ul>
        </div>
      {/if}
    </div>
  {/if}

  {#if updates.length > 0}
    <div class="rproj-card">
      <div class="rproj-card-title">Recent updates</div>
      <ol class="rproj-updates">
        {#each updates as u}
          <li class="rproj-update">
            <span class="rproj-update-dot"></span>
            <div class="rproj-update-body">
              <div class="rproj-update-row">
                <span class="rproj-update-label">
                  {#if u.icon}<Icon name={u.icon} size={11} />{/if}
                  {u.label}
                </span>
                <span class="rproj-update-time">{u.time}</span>
              </div>
              {#if u.actor || u.type}
                <span class="rproj-update-meta">
                  {#if u.actor}{u.actor}{/if}
                  {#if u.type}<span class="rproj-update-type">· {u.type}</span>{/if}
                </span>
              {/if}
            </div>
          </li>
        {/each}
      </ol>
    </div>
  {/if}
</div>

<style>
  .rproj {
    display: flex;
    flex-direction: column;
    gap: 16px;
    width: 100%;
  }

  .rproj-header {
    display: flex;
    gap: 18px;
    flex-wrap: wrap;
    align-items: flex-start;
    padding: 18px 20px;
    border-radius: 14px;
    border: 1px solid var(--border);
    background: linear-gradient(180deg, color-mix(in oklab, oklch(0.55 0.18 250) 5%, var(--card)) 0%, var(--card) 100%);
  }
  .rproj-header-main { flex: 1; min-width: 0; }
  .rproj-header-row {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-wrap: wrap;
  }
  .rproj-title {
    font-size: 22px;
    font-weight: 600;
    margin: 0;
    letter-spacing: -0.01em;
  }
  .rproj-status {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11.5px;
    font-weight: 600;
    text-transform: capitalize;
  }
  .rproj-description {
    font-size: 13px;
    color: var(--muted-foreground);
    margin: 6px 0 0;
    max-width: 60ch;
  }

  .rproj-progress-block {
    margin-top: 14px;
  }
  .rproj-progress-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    font-size: 11.5px;
    margin-bottom: 4px;
  }
  .rproj-progress-label {
    font-size: 11.5px;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }
  .rproj-progress-pct {
    font-size: 16px;
    font-weight: 600;
    color: var(--foreground);
    font-variant-numeric: tabular-nums;
  }
  .rproj-progress-track {
    height: 8px;
    background: var(--muted);
    border-radius: 999px;
    overflow: hidden;
  }
  .rproj-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, oklch(0.6 0.18 250), oklch(0.55 0.18 250));
    transition: width 0.5s ease;
  }

  .rproj-side {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
  }
  .rproj-lead,
  .rproj-due {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 8px 12px;
    border-radius: 10px;
    background: var(--card);
    border: 1px solid var(--border);
  }
  .rproj-lead-avatar,
  .rproj-lead-initials {
    width: 32px;
    height: 32px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--muted);
    color: var(--foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }
  .rproj-lead-label,
  .rproj-due-label {
    font-size: 10.5px;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
  }
  .rproj-lead-name,
  .rproj-due-value {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }
  .rproj-lead-role {
    font-size: 11px;
    color: var(--muted-foreground);
  }

  .rproj-meta {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 10px 16px;
    padding: 12px 16px;
    border-radius: 10px;
    background: color-mix(in oklab, var(--muted) 35%, transparent);
    margin: 0;
  }
  .rproj-meta-item { margin: 0; display: flex; flex-direction: column; gap: 2px; }
  .rproj-meta-item dt {
    font-size: 10.5px;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    font-weight: 500;
    margin: 0;
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .rproj-meta-item dd {
    font-size: 13px;
    color: var(--foreground);
    margin: 0;
    font-weight: 500;
  }

  .rproj-row {
    display: grid;
    gap: 12px;
    grid-template-columns: 1fr;
  }
  @media (min-width: 920px) {
    .rproj-row { grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); }
  }

  .rproj-card {
    padding: 14px 16px;
    border-radius: 12px;
    border: 1px solid var(--border);
    background: var(--card);
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-width: 0;
  }
  .rproj-card-title {
    font-size: 12px;
    font-weight: 600;
    color: var(--muted-foreground);
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  /* Breakdown bars */
  .rproj-bd { display: flex; flex-direction: column; gap: 8px; }
  .rproj-bd-row {
    display: grid;
    grid-template-columns: 90px 1fr 38px;
    align-items: center;
    gap: 10px;
    font-size: 12.5px;
  }
  .rproj-bd-label { color: var(--muted-foreground); }
  .rproj-bd-track {
    height: 8px;
    background: var(--muted);
    border-radius: 999px;
    overflow: hidden;
  }
  .rproj-bd-fill { height: 100%; }
  .rproj-bd-done { background: oklch(0.55 0.18 150); }
  .rproj-bd-progress { background: oklch(0.55 0.18 250); }
  .rproj-bd-todo { background: var(--muted-foreground); opacity: 0.5; }
  .rproj-bd-blocked { background: oklch(0.55 0.22 25); }
  .rproj-bd-num {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
    color: var(--foreground);
  }
  .rproj-bd-total {
    display: flex;
    justify-content: space-between;
    margin-top: 6px;
    padding-top: 8px;
    border-top: 1px solid var(--border);
    font-size: 12px;
    color: var(--muted-foreground);
  }

  /* Team */
  .rproj-team {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .rproj-team-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rproj-team-avatar,
  .rproj-team-initials {
    width: 30px;
    height: 30px;
    border-radius: 50%;
    object-fit: cover;
    background: var(--muted);
    color: var(--foreground);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 11.5px;
    font-weight: 600;
    flex-shrink: 0;
  }
  .rproj-team-body { flex: 1; min-width: 0; }
  .rproj-team-row {
    display: flex;
    align-items: baseline;
    gap: 6px;
    flex-wrap: wrap;
  }
  .rproj-team-name {
    font-size: 13px;
    font-weight: 500;
    color: var(--foreground);
  }
  .rproj-team-role {
    font-size: 11px;
    color: var(--muted-foreground);
  }
  .rproj-team-load {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-top: 4px;
  }
  .rproj-team-bar {
    height: 4px;
    background: oklch(0.55 0.18 250);
    border-radius: 999px;
    flex: 1;
    max-width: 200px;
    transition: width 0.4s ease;
  }
  .rproj-team-bar-over { background: oklch(0.55 0.22 25); }
  .rproj-team-load-num {
    font-size: 10.5px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
    min-width: 32px;
    text-align: right;
  }

  /* Milestones */
  .rproj-milestones {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .rproj-ms {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .rproj-ms-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: var(--muted);
    border: 1.5px solid var(--border);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }
  .rproj-ms-done .rproj-ms-dot { background: oklch(0.55 0.18 150); border-color: oklch(0.55 0.18 150); }
  .rproj-ms-overdue .rproj-ms-dot { background: oklch(0.55 0.22 25); border-color: oklch(0.55 0.22 25); }
  .rproj-ms-body {
    display: flex;
    justify-content: space-between;
    flex: 1;
    align-items: baseline;
    gap: 10px;
  }
  .rproj-ms-label { font-size: 13px; color: var(--foreground); }
  .rproj-ms-done .rproj-ms-label { color: var(--muted-foreground); text-decoration: line-through; }
  .rproj-ms-due {
    font-size: 11px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .rproj-ms-overdue .rproj-ms-due { color: oklch(0.55 0.22 25); font-weight: 500; }

  /* Updates */
  .rproj-updates {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .rproj-update {
    display: flex;
    gap: 10px;
    align-items: flex-start;
  }
  .rproj-update-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: oklch(0.55 0.18 250);
    margin-top: 6px;
    flex-shrink: 0;
    box-shadow: 0 0 0 3px color-mix(in oklab, oklch(0.55 0.18 250) 18%, transparent);
  }
  .rproj-update-body { flex: 1; min-width: 0; }
  .rproj-update-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 10px;
  }
  .rproj-update-label {
    font-size: 13px;
    color: var(--foreground);
    display: inline-flex;
    align-items: center;
    gap: 4px;
  }
  .rproj-update-time {
    font-size: 11px;
    color: var(--muted-foreground);
    font-variant-numeric: tabular-nums;
  }
  .rproj-update-meta {
    font-size: 11.5px;
    color: var(--muted-foreground);
  }
  .rproj-update-type {
    text-transform: lowercase;
  }
</style>
