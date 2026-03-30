import type { Snippet } from 'svelte';
import * as Tabs from '../../components/ui/tabs/index.js';
interface Tab {
    value: string;
    label: string;
}
interface Props {
    id?: string;
    class?: string;
    tabs?: (Tab | string)[];
    defaultValue?: string;
    value?: string;
    children?: Snippet;
    onchange?: (value?: unknown) => void;
}
declare const Tabs: import("svelte").Component<Props, {}, "">;
type Tabs = ReturnType<typeof Tabs>;
export default Tabs;
