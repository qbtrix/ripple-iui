import type { Snippet } from 'svelte';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    /** Flex direction */
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    /** Justify content */
    justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
    /** Align items */
    align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    /** Gap between items */
    gap?: number | string;
    /** Flex wrap */
    wrap?: boolean | 'wrap' | 'nowrap' | 'wrap-reverse';
    /** Click handler */
    onclick?: (e?: unknown) => void;
}
declare const Flex: import("svelte").Component<Props, {}, "">;
type Flex = ReturnType<typeof Flex>;
export default Flex;
