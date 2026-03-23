interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Text content to display */
    text?: string;
    /** Text size */
    size?: 'xs' | 'sm' | 'base' | 'lg' | 'xl' | '2xl' | '3xl';
    /** Font weight */
    weight?: 'normal' | 'medium' | 'semibold' | 'bold';
    /** Text color (Tailwind class or custom) */
    color?: string;
    /** Whether to render as inline span or block p */
    inline?: boolean;
}
declare const Text: import("svelte").Component<Props, {}, "">;
type Text = ReturnType<typeof Text>;
export default Text;
