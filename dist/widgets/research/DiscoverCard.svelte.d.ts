interface Props {
    /** Card image URL */
    image?: string;
    /** Card title */
    title: string;
    /** Short description */
    description?: string;
    /** Source/publisher name */
    source?: string;
    /** Link URL */
    url?: string;
    class?: string;
    onclick?: (e?: unknown) => void;
}
declare const DiscoverCard: import("svelte").Component<Props, {}, "">;
type DiscoverCard = ReturnType<typeof DiscoverCard>;
export default DiscoverCard;
