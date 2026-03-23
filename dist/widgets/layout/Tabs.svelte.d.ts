import type { Snippet } from 'svelte';
interface Tab {
    value: string;
    label: string;
}
interface Props {
    id?: string;
    class?: string;
    tabs?: Tab[];
    defaultValue?: string;
    value?: string;
    children?: Snippet;
    onchange?: (value?: unknown) => void;
}
declare const Tabs: import("svelte").Component<Props, {}, "">;
type Tabs = ReturnType<typeof Tabs>;
export default Tabs;
