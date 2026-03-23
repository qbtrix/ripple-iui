interface Props {
    value?: number;
    max?: number;
    /** Bar color override */
    color?: string;
    /** Height variant */
    variant?: 'default' | 'thin' | 'thick';
    class?: string;
    style?: Record<string, string>;
}
declare const Progress: import("svelte").Component<Props, {}, "">;
type Progress = ReturnType<typeof Progress>;
export default Progress;
