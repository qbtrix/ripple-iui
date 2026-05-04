<!-- src/lib/widgets/input/FileUpload.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import UploadIcon from '@lucide/svelte/icons/upload';
  import FileIcon from '@lucide/svelte/icons/file';
  import XIcon from '@lucide/svelte/icons/x';

  type SelectedFile = {
    name: string;
    size: number;
    type: string;
    file: File;
  };

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    label?: string;
    /** Accept attribute (e.g. "image/*", ".pdf,.docx"). */
    accept?: string;
    /** Allow selecting multiple files. */
    multiple?: boolean;
    /** Max bytes per file. */
    maxSize?: number;
    /** Max number of files. */
    maxFiles?: number;
    /** Helper text shown under the dropzone. */
    helperText?: string;
    /** When true, hides the file list below the dropzone. */
    hideFileList?: boolean;
    /** Selected files. Bind via `bind: "<state-path>"` to receive a SelectedFile[]. */
    value?: SelectedFile[];
    disabled?: boolean;
    onchange?: (files: SelectedFile[]) => void;
    onerror?: (message: string) => void;
  }

  let {
    id,
    class: className,
    style,
    label,
    accept,
    multiple = false,
    maxSize,
    maxFiles,
    helperText,
    hideFileList = false,
    value = [],
    disabled = false,
    onchange,
    onerror
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  let inputEl = $state<HTMLInputElement | null>(null);
  let isDragging = $state(false);
  const files = $derived(Array.isArray(value) ? value : []);

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }

  function validate(list: FileList | File[]): { ok: SelectedFile[]; errors: string[] } {
    const ok: SelectedFile[] = [];
    const errors: string[] = [];
    for (const f of Array.from(list)) {
      if (maxSize && f.size > maxSize) {
        errors.push(`${f.name} exceeds ${formatSize(maxSize)}`);
        continue;
      }
      ok.push({ name: f.name, size: f.size, type: f.type, file: f });
    }
    return { ok, errors };
  }

  function ingest(list: FileList | File[]) {
    if (disabled) return;
    const { ok, errors } = validate(list);
    if (errors.length > 0) onerror?.(errors.join('; '));

    let next = multiple ? [...files, ...ok] : ok.slice(0, 1);
    if (maxFiles && next.length > maxFiles) {
      onerror?.(`Maximum of ${maxFiles} files`);
      next = next.slice(0, maxFiles);
    }
    onchange?.(next);
  }

  function onFileInput(e: Event) {
    const target = e.target as HTMLInputElement;
    if (target.files) ingest(target.files);
    if (inputEl) inputEl.value = '';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    isDragging = false;
    if (e.dataTransfer?.files) ingest(e.dataTransfer.files);
  }

  function onDragEnter(e: DragEvent) {
    e.preventDefault();
    if (!disabled) isDragging = true;
  }
  function onDragOver(e: DragEvent) {
    e.preventDefault();
  }
  function onDragLeave(e: DragEvent) {
    if (e.currentTarget === e.target) isDragging = false;
  }

  function remove(idx: number) {
    const next = files.filter((_, i) => i !== idx);
    onchange?.(next);
  }

  function openFileDialog() {
    if (!disabled) inputEl?.click();
  }
</script>

<div class={cn('flex flex-col gap-2', className)} style={styleString}>
  {#if label}
    <span class="text-sm font-medium">{label}</span>
  {/if}

  <button
    type="button"
    {id}
    {disabled}
    onclick={openFileDialog}
    ondrop={onDrop}
    ondragenter={onDragEnter}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    class={cn(
      'group relative flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted/20 px-6 py-8 text-center transition-colors',
      'hover:border-primary/40 hover:bg-muted/40',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      isDragging && 'border-primary bg-primary/5',
      disabled && 'cursor-not-allowed opacity-50'
    )}
    aria-label={label ?? 'Upload file'}
  >
    <input
      bind:this={inputEl}
      type="file"
      class="sr-only"
      {accept}
      {multiple}
      {disabled}
      onchange={onFileInput}
    />
    <UploadIcon size={24} class="opacity-60" />
    <div class="flex flex-col gap-1">
      <span class="text-sm font-medium">
        Drop {multiple ? 'files' : 'a file'} here or
        <span class="text-primary underline-offset-4 group-hover:underline">browse</span>
      </span>
      {#if helperText}
        <span class="text-xs text-muted-foreground">{helperText}</span>
      {:else if maxSize}
        <span class="text-xs text-muted-foreground">Up to {formatSize(maxSize)} per file</span>
      {/if}
    </div>
  </button>

  {#if !hideFileList && files.length > 0}
    <ul class="flex flex-col gap-1.5 m-0 p-0 list-none">
      {#each files as f, i (f.name + i)}
        <li class="flex items-center gap-2 rounded-md border border-ripple-border bg-ripple-muted/40 px-2.5 py-1.5">
          <FileIcon size={14} class="opacity-60 shrink-0" />
          <div class="flex-1 min-w-0">
            <div class="text-sm truncate">{f.name}</div>
            <div class="text-xs text-muted-foreground">{formatSize(f.size)}</div>
          </div>
          <button
            type="button"
            class="rounded p-1 hover:bg-muted transition-colors"
            aria-label={`Remove ${f.name}`}
            onclick={() => remove(i)}
          >
            <XIcon size={12} />
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
