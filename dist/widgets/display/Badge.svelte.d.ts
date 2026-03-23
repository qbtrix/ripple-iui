interface Props {
    text?: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
    class?: string;
}
declare const Badge: import("svelte").Component<Props, {}, "">;
type Badge = ReturnType<typeof Badge>;
export default Badge;
