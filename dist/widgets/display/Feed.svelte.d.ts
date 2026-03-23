interface FeedItem {
    text: string;
    time?: string;
    dot?: string;
    type?: 'default' | 'success' | 'warning' | 'error' | 'info';
}
interface Props {
    items: FeedItem[];
    maxItems?: number;
    class?: string;
}
declare const Feed: import("svelte").Component<Props, {}, "">;
type Feed = ReturnType<typeof Feed>;
export default Feed;
