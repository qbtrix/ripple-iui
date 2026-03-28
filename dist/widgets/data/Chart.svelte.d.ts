import type { Snippet } from 'svelte';
interface DataPoint {
    label: string;
    value: number;
    open?: number;
    close?: number;
    high?: number;
    low?: number;
    [key: string]: unknown;
}
interface Props {
    data: DataPoint[];
    type?: 'bar' | 'line' | 'pie' | 'area' | 'donut' | 'candlestick' | 'sparkline' | 'heatmap' | 'gauge' | 'radar';
    title?: string;
    height?: number;
    colors?: string[];
    tooltip?: boolean;
    themeOverrides?: Record<string, unknown>;
    bullColor?: string;
    bearColor?: string;
    class?: string;
    chartSlot?: Snippet<[{
        data: DataPoint[];
        type: string;
    }]>;
}
declare const Chart: import("svelte").Component<Props, {}, "">;
type Chart = ReturnType<typeof Chart>;
export default Chart;
