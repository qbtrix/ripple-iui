import type { Snippet } from 'svelte';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    direction?: 'row' | 'column' | 'row-reverse' | 'column-reverse';
    justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
    align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    gap?: number | string;
    wrap?: boolean | 'wrap' | 'nowrap' | 'wrap-reverse';
    /** Layout variant */
    variant?: 'default' | 'divided' | 'compact';
    onclick?: (e?: unknown) => void;
}
declare const Flex: import("svelte").Component<Props, {}, "">;
type Flex = ReturnType<typeof Flex>;
export default Flex;
