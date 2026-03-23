interface Props {
    id?: string;
    class?: string;
    text?: string;
    level?: 1 | 2 | 3 | 4 | 5 | 6;
}
declare const Heading: import("svelte").Component<Props, {}, "">;
type Heading = ReturnType<typeof Heading>;
export default Heading;
