import * as Select from '../../components/ui/select/index.js';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    value?: string;
    placeholder?: string;
    options?: (string | {
        value: string;
        label: string;
    })[];
    label?: string;
    disabled?: boolean;
    onchange?: (value?: unknown) => void;
}
declare const Select: import("svelte").Component<Props, {}, "">;
type Select = ReturnType<typeof Select>;
export default Select;
