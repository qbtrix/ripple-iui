interface Props {
    label: string;
    value: string | number;
    trend?: string;
    description?: string;
    /** Layout direction */
    variant?: 'default' | 'compact' | 'horizontal';
    class?: string;
}
declare const Metric: import("svelte").Component<Props, {}, "">;
type Metric = ReturnType<typeof Metric>;
export default Metric;
