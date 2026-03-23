import { Container, Flex, Grid, Card, Tabs, Dashboard, DashboardSlot } from './layout/index.js';
import { Text, Heading, Image, Badge, Progress, Avatar, Metric, Feed } from './display/index.js';
import { Button, Input, Select, Checkbox, Switch } from './input/index.js';
import { Table, Chart } from './data/index.js';
import { If, Each } from './control/index.js';
import { Terminal } from './composite/index.js';
const defaultRegistry = {
    container: Container,
    flex: Flex,
    grid: Grid,
    card: Card,
    tabs: Tabs,
    dashboard: Dashboard,
    'dashboard-slot': DashboardSlot,
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
let registry = { ...defaultRegistry };
export function getWidget(type) {
    return registry[type];
}
export function registerWidget(type, component) {
    registry[type] = component;
}
export function unregisterWidget(type) {
    delete registry[type];
}
export function hasWidget(type) {
    return type in registry;
}
export function getWidgetTypes() {
    return Object.keys(registry);
}
export function resetRegistry() {
    registry = { ...defaultRegistry };
}
export { Container, Flex, Grid, Card, Tabs, Dashboard, DashboardSlot, Text, Heading, Image, Badge, Progress, Avatar, Metric, Feed, Button, Input, Select, Checkbox, Switch, Table, Chart, Terminal, If, Each };
