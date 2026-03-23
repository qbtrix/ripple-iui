import type { EventHandlerOrArray } from '../../schema/event-handler.js';
interface TableColumn {
    header: string;
    accessorKey: string;
}
interface Props {
    data?: any[];
    columns?: TableColumn[];
    onRowClick?: EventHandlerOrArray;
    class?: string;
}
declare const Table: import("svelte").Component<Props, {}, "">;
type Table = ReturnType<typeof Table>;
export default Table;
