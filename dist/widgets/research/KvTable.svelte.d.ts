interface KvRow {
    key: string;
    value: string;
}
interface Props {
    /** Array of key-value rows */
    rows: KvRow[];
    /** Number of columns (1 or 2) */
    columns?: 1 | 2;
    /** Show subtle alternating row backgrounds */
    striped?: boolean;
    class?: string;
}
declare const KvTable: import("svelte").Component<Props, {}, "">;
type KvTable = ReturnType<typeof KvTable>;
export default KvTable;
