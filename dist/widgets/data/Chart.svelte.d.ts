import type { Snippet } from 'svelte';
interface DataPoint {
    label: string;
    value: number;
    [key: string]: unknown;
}
interface Props {
    data: DataPoint[];
    type?: 'bar' | 'line' | 'pie' | 'area' | 'donut';
    title?: string;
    height?: number;
    colors?: string[];
    tooltip?: boolean;
    class?: string;
    chartSlot?: Snippet<[{
        data: DataPoint[];
        type: string;
    }]>;
}
declare const Chart: import("svelte").Component<Props, {}, "">;
type Chart = ReturnType<typeof Chart>;
export default Chart;
