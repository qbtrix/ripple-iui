import type { Snippet } from 'svelte';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    columns?: number | string;
    rows?: number | string;
    gap?: number | string;
    onclick?: (e?: unknown) => void;
}
declare const Grid: import("svelte").Component<Props, {}, "">;
type Grid = ReturnType<typeof Grid>;
export default Grid;
