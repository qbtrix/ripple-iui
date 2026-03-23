interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Heading text */
    text?: string;
    /** Heading level (1-6) */
    level?: 1 | 2 | 3 | 4 | 5 | 6;
}
declare const Heading: import("svelte").Component<Props, {}, "">;
type Heading = ReturnType<typeof Heading>;
export default Heading;
