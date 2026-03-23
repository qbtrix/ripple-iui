import type { Snippet } from 'svelte';
import * as Chart from '../../components/ui/chart/index.js';
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
    class?: string;
    /** Escape hatch: render your own chart */
    chartSlot?: Snippet<[{
        data: DataPoint[];
        type: string;
    }]>;
}
declare const Chart: import("svelte").Component<Props, {}, "">;
type Chart = ReturnType<typeof Chart>;
export default Chart;
