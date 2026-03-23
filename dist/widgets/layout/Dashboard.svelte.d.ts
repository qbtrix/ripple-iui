import type { Snippet } from 'svelte';
interface Props {
    id?: string;
    class?: string;
    children?: Snippet;
    /** Min column width — grid auto-fills based on container */
    columnMin?: string;
    gap?: string;
    /** Enable drag-to-swap */
    swappable?: boolean;
    /** Called when items are swapped */
    onswap?: (event: {
        data: {
            array: {
                slot: string;
                item: string;
            }[];
        };
    }) => void;
}
declare const Dashboard: import("svelte").Component<Props, {}, "">;
type Dashboard = ReturnType<typeof Dashboard>;
export default Dashboard;
