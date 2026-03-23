interface TermLine {
    text: string;
    type?: 'stdout' | 'stderr' | 'info' | 'command';
    timestamp?: string;
}
interface Props {
    lines?: TermLine[];
    /** Show command input at bottom */
    interactive?: boolean;
    /** Max height before scroll */
    maxHeight?: string;
    /** Terminal title */
    title?: string;
    class?: string;
    /** Called when command submitted */
    oncommand?: (command: string) => void;
}
declare const Terminal: import("svelte").Component<Props, {}, "">;
type Terminal = ReturnType<typeof Terminal>;
export default Terminal;
