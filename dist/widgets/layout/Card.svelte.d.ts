import type { Snippet } from 'svelte';
import * as Card from '../../components/ui/card/index.js';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    children?: Snippet;
    title?: string;
    description?: string;
    variant?: 'default' | 'selected' | 'muted';
    onclick?: (e?: unknown) => void;
}
declare const Card: import("svelte").Component<Props, {}, "">;
type Card = ReturnType<typeof Card>;
export default Card;
