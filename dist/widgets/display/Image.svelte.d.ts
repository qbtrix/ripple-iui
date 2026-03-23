interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    /** Image source URL */
    src?: string;
    /** Alt text */
    alt?: string;
    /** Width (number for px, string for any unit) */
    width?: number | string;
    /** Height (number for px, string for any unit) */
    height?: number | string;
    /** Object fit */
    fit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    /** Border radius */
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | 'full';
}
declare const Image: import("svelte").Component<Props, {}, "">;
type Image = ReturnType<typeof Image>;
export default Image;
