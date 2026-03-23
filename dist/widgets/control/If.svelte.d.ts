import type { Snippet } from 'svelte';
interface Props {
    condition?: boolean;
    children?: Snippet;
}
declare const If: import("svelte").Component<Props, {}, "">;
type If = ReturnType<typeof If>;
export default If;
