interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    src?: string;
    alt?: string;
    width?: number | string;
    height?: number | string;
    fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
declare const Image: import("svelte").Component<Props, {}, "">;
type Image = ReturnType<typeof Image>;
export default Image;
