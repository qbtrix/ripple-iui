interface Props {
    /** Input placeholder text */
    placeholder?: string;
    /** Submit button label (sr-only) */
    submitLabel?: string;
    /** Emit event name on submit */
    event?: string;
    class?: string;
    onsubmit?: (e?: unknown) => void;
}
declare const FollowUp: import("svelte").Component<Props, {}, "">;
type FollowUp = ReturnType<typeof FollowUp>;
export default FollowUp;
