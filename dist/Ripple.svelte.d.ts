import type { UISpec } from './schema/ui-spec.js';
import type { UniversalSpec } from './schema/universal-spec.js';
import { type OnEventCallback } from './core/event-dispatcher.js';
import type { DashboardSpec } from './intent/dashboard-manager.svelte.js';
interface Props {
    spec: UniversalSpec | UISpec | any;
    state?: Record<string, any>;
    onEvent?: OnEventCallback;
    onSpecChanged?: (spec: DashboardSpec) => void;
    class?: string;
    style?: string;
}
declare const Ripple: import("svelte").Component<Props, {}, "">;
type Ripple = ReturnType<typeof Ripple>;
export default Ripple;
