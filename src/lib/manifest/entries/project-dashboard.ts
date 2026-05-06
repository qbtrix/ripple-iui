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
      description: 'Move legacy reporting service to the new analytics platform.',
      status: 'at-risk',
      progress: 64,
      dueDate: 'Jun 30, 2026',
      lead: { name: 'Jamie Park', role: 'Tech lead' },
      meta: [
        { label: 'Sprint', value: '4 of 6' },
        { label: 'Repo', value: 'acme/phoenix' },
        { label: 'Started', value: 'Mar 4, 2026' }
      ],
      burndown: {
        title: 'Sprint burndown',
        data: [
          { label: 'Day 1', series: { ideal: 100, actual: 100 } },
          { label: 'Day 3', series: { ideal: 85, actual: 92 } },
          { label: 'Day 5', series: { ideal: 70, actual: 78 } },
          { label: 'Day 7', series: { ideal: 55, actual: 60 } },
          { label: 'Day 9', series: { ideal: 40, actual: 48 } },
          { label: 'Day 11', series: { ideal: 25, actual: 32 } },
          { label: 'Day 14', series: { ideal: 0, actual: 14 } }
        ]
      },
      breakdown: { done: 38, inProgress: 12, todo: 18, blocked: 4 },
      team: [
        { name: 'Jamie Park', role: 'Tech lead', load: 85 },
        { name: 'Priya Mehta', role: 'Backend', load: 110, status: 'overloaded' },
        { name: 'Marcus Lee', role: 'Frontend', load: 70 },
        { name: 'Emma Schmidt', role: 'QA', load: 55 }
      ],
      milestones: [
        { label: 'Schema design', done: true, due: 'Mar 18' },
        { label: 'Data backfill', done: true, due: 'Apr 15' },
        { label: 'Dual-write rollout', due: 'May 10', overdue: true },
        { label: 'Cutover', due: 'Jun 25' }
      ],
      updates: [
        { time: '14m ago', label: 'Backfill validated for region us-east', actor: 'Priya Mehta', icon: 'check-circle-2', type: 'milestone' },
        { time: '2h ago', label: 'Dual-write blocked on EU schema review', actor: 'Jamie Park', icon: 'alert-circle', type: 'risk' },
        { time: 'Yesterday', label: 'Sprint planning notes posted', actor: 'Emma Schmidt', icon: 'file-text', type: 'doc' }
      ]
    },
  },
};
