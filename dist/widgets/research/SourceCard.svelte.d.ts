interface Props {
    /** Source/publisher name */
    source: string;
    /** Headline or title text */
    title: string;
    /** Dot/accent color (CSS color value) — used only if favicon fails */
    color?: string;
    /** Override favicon URL (auto-derived from source name if omitted) */
    favicon?: string;
    /** Link URL */
    url?: string;
    class?: string;
    onclick?: (e?: unknown) => void;
}
declare const SourceCard: import("svelte").Component<Props, {}, "">;
type SourceCard = ReturnType<typeof SourceCard>;
export default SourceCard;
