import type { Snippet } from 'svelte';
interface Props {
    slotId: string;
    itemId: string;
    class?: string;
    /** Column span: 1, 2, 3 or 'auto' */
    span?: number | 'auto';
    children?: Snippet;
}
declare const DashboardSlot: import("svelte").Component<Props, {}, "">;
type DashboardSlot = ReturnType<typeof DashboardSlot>;
export default DashboardSlot;
