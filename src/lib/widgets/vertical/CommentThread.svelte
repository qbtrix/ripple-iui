<!-- src/lib/widgets/vertical/CommentThread.svelte -->
<script module lang="ts">
  // Public type — module scope so svelte-package emits it in the
  // generated .d.ts.
  export type Comment = {
    id: string | number;
    author: string;
    avatar?: string;
    body: string;
    timestamp?: string;
    replies?: Comment[];
  };
</script>

<script lang="ts">
  import { cn } from '$lib/utils.js';
  import { asText } from '$lib/widgets/text-coerce';
  import Self from './CommentThread.svelte';
  import MessageSquareIcon from '@lucide/svelte/icons/message-square';

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    comments?: Comment[];
    /** Internal nesting depth — used to indent recursively. */
    _depth?: number;
    /** Show reply button per comment. */
    canReply?: boolean;
    onreply?: (id: string | number) => void;
  }

  let {
    id,
    class: className,
    style,
    comments = [],
    _depth = 0,
    canReply = true,
    onreply
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  // Comment authors come from data and can be non-strings — coerce before .split.
  function initials(name: unknown): string {
    return asText(name)
      .split(/\s+/)
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
</script>

<div
  {id}
  class={cn('flex flex-col gap-3', className)}
  style={styleString}
>
  {#each comments as c (c.id)}
    <article
      class={cn(
        'flex gap-3',
        _depth > 0 && 'pl-4 border-l-2 border-border'
      )}
    >
      <div class="shrink-0">
        {#if c.avatar}
          <img src={c.avatar} alt={c.author} class="h-8 w-8 rounded-full object-cover" />
        {:else}
          <div class="h-8 w-8 rounded-full bg-muted text-xs font-semibold grid place-items-center text-muted-foreground">
            {initials(c.author)}
          </div>
        {/if}
      </div>
      <div class="flex-1 min-w-0">
        <div class="flex items-baseline gap-2">
          <span class="text-sm font-semibold">{c.author}</span>
          {#if c.timestamp}
            <span class="text-xs text-muted-foreground">{c.timestamp}</span>
          {/if}
        </div>
        <div class="mt-1 text-sm whitespace-pre-wrap">{c.body}</div>
        {#if canReply}
          <button
            type="button"
            class="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            onclick={() => onreply?.(c.id)}
          >
            <MessageSquareIcon size={11} />
            Reply
          </button>
        {/if}

        {#if c.replies && c.replies.length > 0}
          <div class="mt-3">
            <Self comments={c.replies} _depth={_depth + 1} {canReply} {onreply} />
          </div>
        {/if}
      </div>
    </article>
  {/each}
</div>
