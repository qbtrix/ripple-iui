// Updated: Added C4 diagram widget (SvelteFlow + ELK.js interactive architecture diagrams)
import type { Component } from 'svelte';

import { Container, Flex, Grid, Card, GlassCard, Tabs, Dashboard, DashboardSlot } from './layout/index.js';
import { Text, Heading, Image, Badge, Progress, Avatar, Metric, Feed, SoulStatus } from './display/index.js';
import { Button, Input, Select, Checkbox, Switch } from './input/index.js';
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
  text: Text,
  heading: Heading,
  image: Image,
  badge: Badge,
  progress: Progress,
  avatar: Avatar,
  metric: Metric,
  feed: Feed,
  'soul-status': SoulStatus,
  button: Button,
  input: Input,
  select: Select,
  checkbox: Checkbox,
  switch: Switch,
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
  Container, Flex, Grid, Card, GlassCard, Tabs, Dashboard, DashboardSlot,
  Text, Heading, Image, Badge, Progress, Avatar, Metric, Feed, SoulStatus,
  Button, Input, Select, Checkbox, Switch,
  Table, Chart, Terminal, If, Each,
  SourceCard, Citation, SourcesBar, DiscoverCard, FollowUp,
  CompanyHeader, Ticker, KvTable, Timeline, Callout, NewsCard,
  AnalystBar, RangeBar,
  Workflow,
  C4Diagram
};
