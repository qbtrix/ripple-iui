import type { Snippet } from 'svelte';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    /** Number of columns or template string */
    columns?: number | string;
    /** Number of rows or template string */
    rows?: number | string;
    /** Gap between items */
    gap?: number | string;
    /** Click handler */
    onclick?: (e?: unknown) => void;
}
declare const Grid: import("svelte").Component<Props, {}, "">;
type Grid = ReturnType<typeof Grid>;
export default Grid;
