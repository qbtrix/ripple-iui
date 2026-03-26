// Updated: Added GlassCard import and registry entry (Phase 4 — glass design system)
import type { Component } from 'svelte';

import { Container, Flex, Grid, Card, GlassCard, Tabs, Dashboard, DashboardSlot } from './layout/index.js';
import { Text, Heading, Image, Badge, Progress, Avatar, Metric, Feed } from './display/index.js';
import { Button, Input, Select, Checkbox, Switch } from './input/index.js';
import { Table, Chart } from './data/index.js';
import { If, Each } from './control/index.js';
import { Terminal } from './composite/index.js';

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
  Text, Heading, Image, Badge, Progress, Avatar, Metric, Feed,
  Button, Input, Select, Checkbox, Switch,
  Table, Chart, Terminal, If, Each
};
