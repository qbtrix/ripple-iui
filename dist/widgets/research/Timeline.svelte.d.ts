interface TimelineEvent {
    /** Date or time label */
    date: string;
    /** Event title */
    title: string;
    /** Optional detail text */
    detail?: string;
    /** Dot color or event type */
    type?: 'default' | 'success' | 'warning' | 'error' | 'info';
    /** Custom dot color */
    color?: string;
}
interface Props {
    events: TimelineEvent[];
    /** Max events to show before truncating */
    maxItems?: number;
    class?: string;
}
declare const Timeline: import("svelte").Component<Props, {}, "">;
type Timeline = ReturnType<typeof Timeline>;
export default Timeline;
