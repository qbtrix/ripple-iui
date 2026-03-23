<script lang="ts">
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

  let {
    id, class: className, style, src = '', alt = '',
    width, height, fit = 'cover', rounded = 'md'
  }: Props = $props();

  const radiusMap: Record<string, string> = {
    none: '0', sm: '4px', md: '8px', lg: '12px', xl: '16px', full: '9999px'
  };

  const combinedStyle = $derived.by(() => {
    const s: string[] = [
      `object-fit:${fit}`,
      `border-radius:${radiusMap[rounded] ?? '8px'}`,
    ];
    if (width) s.push(`width:${typeof width === 'number' ? `${width}px` : width}`);
    if (height) s.push(`height:${typeof height === 'number' ? `${height}px` : height}`);
    if (style) s.push(...Object.entries(style).map(([k, v]) => `${k}:${v}`));
    return s.join(';');
  });
</script>

<img {id} {src} {alt} class="block max-w-full {className ?? ''}" style={combinedStyle} />
