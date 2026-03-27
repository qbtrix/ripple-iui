import type { UniversalSpec } from '../schema/universal-spec.js';
import { type DashboardSpec } from './dashboard-manager.svelte.js';
interface Props {
    spec: UniversalSpec;
    onSpecChanged?: (spec: DashboardSpec) => void;
}
declare const DashboardRenderer: import("svelte").Component<Props, {}, "">;
type DashboardRenderer = ReturnType<typeof DashboardRenderer>;
export default DashboardRenderer;
