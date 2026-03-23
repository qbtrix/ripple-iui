interface Props {
    id?: string;
    class?: string;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (value?: unknown) => void;
}
declare const Checkbox: import("svelte").Component<Props, {}, "">;
type Checkbox = ReturnType<typeof Checkbox>;
export default Checkbox;
