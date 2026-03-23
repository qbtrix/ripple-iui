interface Props {
    id?: string;
    class?: string;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (value?: unknown) => void;
}
declare const Switch: import("svelte").Component<Props, {}, "">;
type Switch = ReturnType<typeof Switch>;
export default Switch;
