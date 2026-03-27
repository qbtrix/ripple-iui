interface Props {
    name?: string;
    role?: string;
    initials?: string;
    color?: string;
    mood?: string;
    energy?: number;
    memories?: number;
    lastAction?: string;
    status?: 'online' | 'offline' | 'busy';
    compact?: boolean;
    class?: string;
}
declare const SoulStatus: import("svelte").Component<Props, {}, "">;
type SoulStatus = ReturnType<typeof SoulStatus>;
export default SoulStatus;
