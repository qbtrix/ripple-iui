import { Input } from '../../components/ui/input/index.js';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
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
