import type { Snippet } from 'svelte';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    title?: string;
    description?: string;
    opacity?: number;
    blur?: number;
    tint?: string;
    borderGlow?: boolean;
    onclick?: (e?: unknown) => void;
}
declare const GlassCard: import("svelte").Component<Props, {}, "">;
type GlassCard = ReturnType<typeof GlassCard>;
export default GlassCard;
