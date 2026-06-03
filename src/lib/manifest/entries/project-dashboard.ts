import type { WidgetManifestEntry } from '../index.js';

export const projectDashboardEntry: WidgetManifestEntry = {
  type: 'project-dashboard',
  category: 'composite',
  description: 'Project / agile / engineering dashboard: project header (status + progress + lead) + burndown chart + status-breakdown bars + team load list + milestones + recent updates.',
  props: {
    title: { type: 'string', required: false, description: 'Project name.' },
    description: { type: 'string', required: false, description: 'Project description.' },
    status: { type: '"on-track" | "at-risk" | "off-track" | "completed" | "paused"', required: false, description: 'Overall project status.' },
    progress: { type: 'number', required: false, description: '0–100 overall progress percentage.' },
    dueDate: { type: 'string', required: false, description: 'Due date.' },
    lead: { type: '{ name: string; avatar?: string; role?: string }', required: false, description: 'Project lead.' },
    meta: { type: 'Array<{ label: string; value: string; icon?: string }>', required: false, description: 'Project metadata (start date, sprint, repo, etc.).' },
    burndown: { type: '{ title?: string; data: Array<{ label: string; value?: number; series?: Record<string, number> }> }', required: false, description: 'Burndown chart data; supports `series` for ideal vs actual lines.' },
    breakdown: { type: '{ todo?: number; inProgress?: number; done?: number; blocked?: number }', required: false, description: 'Task counts; renders proportional bars.' },
    team: { type: 'Array<{ name: string; avatar?: string; role?: string; load?: number; status?: "available" | "busy" | "overloaded" | "off" }>', required: false, description: 'Team members. `load` is 0–100 (>100 highlights overload).' },
    updates: { type: 'Array<{ time: string; actor?: string; label: string; icon?: string; type?: string }>', required: false, description: 'Recent updates / activity feed.' },
    milestones: { type: 'Array<{ label: string; due?: string; done?: boolean; overdue?: boolean }>', required: false, description: 'Milestones with completion / overdue indicators.' },
  },
  example: {
    type: 'project-dashboard',
    props: {
      title: 'Phoenix migration',
      description: 'Move legacy reporting service to the new analytics platform with zero customer-facing downtime.',
      status: 'at-risk',
      progress: 64,
      dueDate: 'Jun 30, 2026',
      lead: { name: 'Jamie Park', role: 'Tech lead' },
      meta: [
        { label: 'Sprint',  value: '4 of 6',         icon: 'flag' },
        { label: 'Repo',    value: 'acme/phoenix',   icon: 'github' },
        { label: 'Started', value: 'Mar 4, 2026',    icon: 'calendar' },
        { label: 'Budget',  value: '$248k / $320k',  icon: 'dollar-sign' },
        { label: 'Stack',   value: 'Go · ClickHouse · Kafka', icon: 'layers' },
        { label: 'Slack',   value: '#proj-phoenix',  icon: 'message-square' }
      ],
      burndown: {
        title: 'Sprint burndown — Sprint 4',
        data: [
          { label: 'Day 1',  series: { ideal: 100, actual: 100 } },
          { label: 'Day 2',  series: { ideal: 93,  actual: 96 } },
          { label: 'Day 3',  series: { ideal: 85,  actual: 92 } },
          { label: 'Day 4',  series: { ideal: 78,  actual: 86 } },
          { label: 'Day 5',  series: { ideal: 70,  actual: 78 } },
          { label: 'Day 6',  series: { ideal: 62,  actual: 70 } },
          { label: 'Day 7',  series: { ideal: 55,  actual: 60 } },
          { label: 'Day 8',  series: { ideal: 48,  actual: 55 } },
          { label: 'Day 9',  series: { ideal: 40,  actual: 48 } },
          { label: 'Day 10', series: { ideal: 32,  actual: 40 } },
          { label: 'Day 11', series: { ideal: 25,  actual: 32 } },
          { label: 'Day 12', series: { ideal: 18,  actual: 26 } },
          { label: 'Day 13', series: { ideal: 9,   actual: 20 } },
          { label: 'Day 14', series: { ideal: 0,   actual: 14 } }
        ]
      },
      breakdown: { done: 38, inProgress: 12, todo: 18, blocked: 4 },
      team: [
        { name: 'Jamie Park',    role: 'Tech lead',  load: 85,  status: 'busy' },
        { name: 'Priya Mehta',   role: 'Backend',    load: 110, status: 'overloaded' },
        { name: 'Marcus Lee',    role: 'Frontend',   load: 70,  status: 'busy' },
        { name: 'Emma Schmidt',  role: 'QA',         load: 55,  status: 'available' },
        { name: 'Diego Ramos',   role: 'Backend',    load: 92,  status: 'busy' },
        { name: 'Anya Volkov',   role: 'SRE',        load: 78,  status: 'busy' },
        { name: 'Ken Watanabe',  role: 'Data eng',   load: 102, status: 'overloaded' },
        { name: 'Sofia Romano',  role: 'Designer',   load: 35,  status: 'available' },
        { name: 'Theo Carter',   role: 'Backend',    load: 0,   status: 'off' }
      ],
      milestones: [
        { label: 'Spec sign-off',         done: true, due: 'Mar 10' },
        { label: 'Schema design',         done: true, due: 'Mar 18' },
        { label: 'Data backfill',         done: true, due: 'Apr 15' },
        { label: 'Read-path rollout',     done: true, due: 'Apr 28' },
        { label: 'Dual-write rollout',                due: 'May 10', overdue: true },
        { label: 'Customer beta',                     due: 'Jun 1' },
        { label: 'Cutover',                           due: 'Jun 25' },
        { label: 'Legacy decommission',               due: 'Jul 15' }
      ],
      updates: [
        { time: '8m ago',   label: 'PR merged: dual-write metrics + alerts', actor: 'Diego Ramos',  icon: 'git-merge',       type: 'pr' },
        { time: '14m ago',  label: 'Backfill validated for region us-east',  actor: 'Priya Mehta',  icon: 'check-circle-2',  type: 'milestone' },
        { time: '1h ago',   label: 'New blocker: EU schema review pending',  actor: 'Jamie Park',   icon: 'alert-octagon',   type: 'blocker' },
        { time: '2h ago',   label: 'Dual-write blocked on EU schema review', actor: 'Jamie Park',   icon: 'alert-circle',    type: 'risk' },
        { time: '4h ago',   label: 'Customer beta plan posted',              actor: 'Sofia Romano', icon: 'file-text',       type: 'doc' },
        { time: '6h ago',   label: 'Capacity test passed at 3× peak',        actor: 'Anya Volkov',  icon: 'zap',             type: 'test' },
        { time: 'Yesterday',label: 'Sprint planning notes posted',           actor: 'Emma Schmidt', icon: 'file-text',       type: 'doc' },
        { time: 'Yesterday',label: 'Ken added to backfill workstream',       actor: 'Jamie Park',   icon: 'user-plus',       type: 'team' },
        { time: '2d ago',   label: 'Hotfix: corrected null-handling in v0.4',actor: 'Priya Mehta',  icon: 'wrench',          type: 'fix' }
      ]
    },
  },
};
