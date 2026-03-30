interface Props {
    /** Source/publisher name */
    source: string;
    /** Dot/accent color — fallback if favicon fails */
    color?: string;
    /** Override favicon URL (auto-derived from source name if omitted) */
    favicon?: string;
    /** Optional superscript citation number */
    number?: number;
    /** Link URL */
    url?: string;
    class?: string;
    onclick?: (e?: unknown) => void;
}
declare const Citation: import("svelte").Component<Props, {}, "">;
type Citation = ReturnType<typeof Citation>;
export default Citation;
