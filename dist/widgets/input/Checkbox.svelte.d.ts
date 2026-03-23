import { Checkbox } from '../../components/ui/checkbox/index.js';
interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    checked?: boolean;
    disabled?: boolean;
    label?: string;
    onchange?: (value?: unknown) => void;
}
declare const Checkbox: import("svelte").Component<Props, {}, "">;
type Checkbox = ReturnType<typeof Checkbox>;
export default Checkbox;
