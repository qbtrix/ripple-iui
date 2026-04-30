// Updated: C4 diagram, textarea+modal (#20), Skeleton for streaming (#22), ConfirmDialog overlay (#23), type `WidgetRegistry` renamed to `WidgetMap` to free the name for the runtime class in core/widget-registry.ts
import type { Component } from 'svelte';

import { Container, Flex, Grid, Card, GlassCard, Tabs, Dashboard, DashboardSlot, Modal } from './layout/index.js';
import { Text, Heading, Image, Badge, Progress, Avatar, Metric, Stat, Feed, SoulStatus, Skeleton } from './display/index.js';
import { Button, Input, Select, Checkbox, Switch, Textarea, Slider, RadioGroup } from './input/index.js';
import { Table, Chart } from './data/index.js';
import { If, Each } from './control/index.js';
import { Terminal } from './composite/index.js';
import { ConfirmDialog } from './overlay/index.js';
import {
  SourceCard, Citation, SourcesBar, DiscoverCard, FollowUp,
  CompanyHeader, Ticker, KvTable, Timeline, Callout, NewsCard,
  AnalystBar, RangeBar
} from './research/index.js';
import Workflow from './Workflow.svelte';
import { C4Diagram } from './c4/index.js';

/** Map of widget type name → Svelte component. Internal registry format. */
export type WidgetMap = Record<string, Component<any>>;

const defaultRegistry: WidgetMap = {
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
  slider: Slider,
  'radio-group': RadioGroup,
  radio: RadioGroup,
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
  'confirm-dialog': ConfirmDialog,
  // Aliases
  label: Text,
};

let registry: WidgetMap = { ...defaultRegistry };

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
  Button, Input, Select, Checkbox, Switch, Textarea, Slider, RadioGroup,
  Table, Chart, Terminal, If, Each,
  SourceCard, Citation, SourcesBar, DiscoverCard, FollowUp,
  CompanyHeader, Ticker, KvTable, Timeline, Callout, NewsCard,
  AnalystBar, RangeBar,
  Workflow,
  C4Diagram
};
