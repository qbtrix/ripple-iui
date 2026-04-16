// Updated: C4 diagram (SvelteFlow + ELK.js), textarea + modal widgets (#20), Skeleton widget for streaming placeholder (#15)
import type { Component } from 'svelte';

import { Container, Flex, Grid, Card, GlassCard, Tabs, Dashboard, DashboardSlot, Modal } from './layout/index.js';
import { Text, Heading, Image, Badge, Progress, Avatar, Metric, Stat, Feed, SoulStatus, Skeleton } from './display/index.js';
import { Button, Input, Select, Checkbox, Switch, Textarea } from './input/index.js';
import { Table, Chart } from './data/index.js';
import { If, Each } from './control/index.js';
import { Terminal } from './composite/index.js';
import {
  SourceCard, Citation, SourcesBar, DiscoverCard, FollowUp,
  CompanyHeader, Ticker, KvTable, Timeline, Callout, NewsCard,
  AnalystBar, RangeBar
} from './research/index.js';
import Workflow from './Workflow.svelte';
import { C4Diagram } from './c4/index.js';

export type WidgetRegistry = Record<string, Component<any>>;

const defaultRegistry: WidgetRegistry = {
  container: Container,
  flex: Flex,
  grid: Grid,
  card: Card,
  tabs: Tabs,
  dashboard: Dashboard,
  'dashboard-slot': DashboardSlot,
  'glass-card': GlassCard,
  modal: Modal,
  dialog: Modal,
  text: Text,
  heading: Heading,
  image: Image,
  badge: Badge,
  progress: Progress,
  avatar: Avatar,
  metric: Metric,
  stat: Stat,
  feed: Feed,
  'soul-status': SoulStatus,
  skeleton: Skeleton,
  button: Button,
  input: Input,
  select: Select,
  checkbox: Checkbox,
  switch: Switch,
  textarea: Textarea,
  table: Table,
  chart: Chart,
  terminal: Terminal,
  if: If,
  each: Each,
  'source-card': SourceCard,
  citation: Citation,
  'sources-bar': SourcesBar,
  'discover-card': DiscoverCard,
  'follow-up': FollowUp,
  'company-header': CompanyHeader,
  ticker: Ticker,
  'kv-table': KvTable,
  timeline: Timeline,
  callout: Callout,
  'news-card': NewsCard,
  'analyst-bar': AnalystBar,
  'range-bar': RangeBar,
  workflow: Workflow,
  c4: C4Diagram,
  // Aliases
  label: Text,
};

let registry: WidgetRegistry = { ...defaultRegistry };

export function getWidget(type: string): Component<any> | undefined {
  return registry[type];
}

export function registerWidget(type: string, component: Component<any>): void {
  registry[type] = component;
}

export function unregisterWidget(type: string): void {
  delete registry[type];
}

export function hasWidget(type: string): boolean {
  return type in registry;
}

export function getWidgetTypes(): string[] {
  return Object.keys(registry);
}

export function resetRegistry(): void {
  registry = { ...defaultRegistry };
}

export {
  Container, Flex, Grid, Card, GlassCard, Tabs, Dashboard, DashboardSlot, Modal,
  Text, Heading, Image, Badge, Progress, Avatar, Metric, Stat, Feed, SoulStatus, Skeleton,
  Button, Input, Select, Checkbox, Switch, Textarea,
  Table, Chart, Terminal, If, Each,
  SourceCard, Citation, SourcesBar, DiscoverCard, FollowUp,
  CompanyHeader, Ticker, KvTable, Timeline, Callout, NewsCard,
  AnalystBar, RangeBar,
  Workflow,
  C4Diagram
};
