import type { Snippet } from 'svelte';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    children?: Snippet;
    hasChildren?: boolean;
    variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disabled?: boolean;
    onclick?: () => void;
}
declare const Button: import("svelte").Component<Props, {}, "">;
type Button = ReturnType<typeof Button>;
export default Button;
