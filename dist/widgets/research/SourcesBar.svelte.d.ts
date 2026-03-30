interface SourceRef {
    name: string;
    color?: string;
    favicon?: string;
    url?: string;
}
interface Props {
    /** Array of source references */
    sources: SourceRef[];
    /** Override display count (defaults to sources.length) */
    count?: number;
    /** Label text (defaults to "sources") */
    label?: string;
    /** Show share action */
    share?: boolean;
    /** Show copy action */
    copy?: boolean;
    class?: string;
    onclick?: (e?: unknown) => void;
}
declare const SourcesBar: import("svelte").Component<Props, {}, "">;
type SourcesBar = ReturnType<typeof SourcesBar>;
export default SourcesBar;
