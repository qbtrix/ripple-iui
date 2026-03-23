interface Props {
    id?: string;
    class?: string;
    value?: string | number;
    placeholder?: string;
    type?: 'text' | 'email' | 'password' | 'number' | 'tel' | 'url';
    disabled?: boolean;
    label?: string;
    onchange?: (value?: unknown) => void;
}
declare const Input: import("svelte").Component<Props, {}, "">;
type Input = ReturnType<typeof Input>;
export default Input;
