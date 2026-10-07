<!-- discover/DiscoverPublish.svelte — the band at the foot of the Discover page
     that invites makers to publish their own work. The button is a link with
     `href` (a signed-out public page sends people to sign up) or calls
     `onpublish`; with neither, the band shows no button. -->
<script lang="ts">
  import { Button } from '../components/ui/button/index.js';
  import { cn } from '$lib/utils.js';

  let {
    href,
    onpublish,
    class: className,
  }: {
    href?: string;
    onpublish?: () => void;
    class?: string;
  } = $props();
</script>

<section
  class={cn('flex flex-wrap items-center justify-between gap-6 rounded-2xl border border-dashed border-border p-6 md:p-9', className)}
  aria-labelledby="discover-pub-h"
>
  <div class="flex flex-col gap-1">
    <h2 id="discover-pub-h" class="text-title-2 font-semibold text-foreground">Made something with Paw?</h2>
    <p class="max-w-prose text-body text-muted-foreground">
      Publish it here. Anyone can use it from a link right away, and the best work gets featured on Discover.
    </p>
  </div>
  {#if href}
    <Button {href}>Publish your work</Button>
  {:else if onpublish}
    <Button onclick={onpublish}>Publish your work</Button>
  {/if}
</section>
