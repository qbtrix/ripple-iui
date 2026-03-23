import type { Snippet } from 'svelte';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    onclick?: (e?: unknown) => void;
}
declare const Container: import("svelte").Component<Props, {}, "">;
type Container = ReturnType<typeof Container>;
export default Container;
