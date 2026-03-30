interface Props {
    /** Label for the range */
    label?: string;
    /** Minimum value (left) */
    min: number;
    /** Maximum value (right) */
    max: number;
    /** Current value (marker position) */
    current: number;
    /** Formatted min label */
    minLabel?: string;
    /** Formatted max label */
    maxLabel?: string;
    /** Formatted current value label */
    currentLabel?: string;
    /** Bar color */
    color?: string;
    class?: string;
}
declare const RangeBar: import("svelte").Component<Props, {}, "">;
type RangeBar = ReturnType<typeof RangeBar>;
export default RangeBar;
