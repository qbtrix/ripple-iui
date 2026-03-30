interface Props {
    /** Callout title (optional) */
    title?: string;
    /** Body text */
    text: string;
    /** Variant determines left border color and icon */
    variant?: 'info' | 'success' | 'warning' | 'insight';
    class?: string;
}
declare const Callout: import("svelte").Component<Props, {}, "">;
type Callout = ReturnType<typeof Callout>;
export default Callout;
