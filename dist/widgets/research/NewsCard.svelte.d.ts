interface Props {
    /** Article headline */
    headline: string;
    /** Source/publisher name */
    source: string;
    /** Relative or absolute time */
    time?: string;
    /** Sentiment */
    sentiment?: 'bullish' | 'bearish' | 'neutral';
    /** Thumbnail image URL */
    image?: string;
    /** Article URL */
    url?: string;
    class?: string;
    onclick?: (e?: unknown) => void;
}
declare const NewsCard: import("svelte").Component<Props, {}, "">;
type NewsCard = ReturnType<typeof NewsCard>;
export default NewsCard;
