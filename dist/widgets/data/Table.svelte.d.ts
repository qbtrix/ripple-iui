import type { EventHandlerOrArray } from '../../schema/event-handler.js';
import * as Table from '../../components/ui/table/index.js';
interface TableColumn {
    header: string;
    accessorKey: string;
}
interface Props {
    data?: any[];
    columns?: TableColumn[];
    /** Visual variant */
    variant?: 'default' | 'compact' | 'striped' | 'minimal';
    /** Column key for status dot color (e.g. "_status") */
    statusKey?: string;
    onRowClick?: EventHandlerOrArray;
    class?: string;
}
declare const Table: import("svelte").Component<Props, {}, "">;
type Table = ReturnType<typeof Table>;
export default Table;
