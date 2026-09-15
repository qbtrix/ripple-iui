<script lang="ts">
  import Button from '$lib/widgets/input/Button.svelte';
  import Card from '$lib/widgets/layout/Card.svelte';
  import { Plus, ArrowRight, Trash2, Check, Settings } from '@lucide/svelte';

  let isLoading = $state<boolean>(false);

  function handleLoadingClick() {
    isLoading = true;
    setTimeout(() => {
      isLoading = false;
    }, 1500);
  }
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>Button — Visual QA</h1>
    <p>
      All variants, sizes, icon slots, loading state, and in-Card composition for the rebuilt
      <code>Button</code> widget.
    </p>
    <nav class="showcase-nav">
      <a href="#variants">Variants</a>
      <a href="#sizes">Sizes</a>
      <a href="#icons">Icons</a>
      <a href="#loading">Loading</a>
      <a href="#disabled">Disabled</a>
      <a href="#full-width">Full-width & link</a>
      <a href="#in-card">In a Card</a>
    </nav>
  </header>

  <!-- Variants ─────────────────────────────────────────────────── -->
  <section id="variants" class="showcase-section">
    <h2 class="showcase-section-title">Variants (md size)</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="default" label="Default" />
          <Button variant="secondary" label="Secondary" />
          <Button variant="outline" label="Outline" />
          <Button variant="ghost" label="Ghost" />
          <Button variant="link" label="Link" />
          <Button variant="destructive" label="Destructive" />
        </div>
      </div>
    </div>
  </section>

  <!-- Sizes ────────────────────────────────────────────────────── -->
  <section id="sizes" class="showcase-section">
    <h2 class="showcase-section-title">Sizes</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <div class="flex flex-wrap items-center gap-3">
          <Button size="sm" label="Small" />
          <Button size="md" label="Medium" />
          <Button size="lg" label="Large" />
          <Button size="icon" aria-label="Add">
            {#snippet leading()}<Plus size={16} />{/snippet}
          </Button>
        </div>
        <p class="mt-2 text-xs text-muted-foreground">
          sm · md · lg · icon (icon-only, aria-label required)
        </p>
      </div>
    </div>
  </section>

  <!-- Leading / trailing icons ─────────────────────────────────── -->
  <section id="icons" class="showcase-section">
    <h2 class="showcase-section-title">Leading / trailing icons</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <div class="flex flex-wrap items-center gap-3">
          <Button label="Add item">
            {#snippet leading()}<Plus size={16} />{/snippet}
          </Button>

          <Button label="Continue" variant="secondary">
            {#snippet trailing()}<ArrowRight size={16} />{/snippet}
          </Button>

          <Button label="Delete" variant="destructive">
            {#snippet leading()}<Trash2 size={16} />{/snippet}
            {#snippet trailing()}<ArrowRight size={16} />{/snippet}
          </Button>

          <Button label="Confirm" variant="outline">
            {#snippet leading()}<Check size={16} />{/snippet}
          </Button>

          <Button label="Settings" variant="ghost">
            {#snippet leading()}<Settings size={16} />{/snippet}
          </Button>
        </div>
      </div>
    </div>
  </section>

  <!-- Loading ──────────────────────────────────────────────────── -->
  <section id="loading" class="showcase-section">
    <h2 class="showcase-section-title">Loading (interactive)</h2>
    <div class="showcase-item">
      <h3 class="showcase-item-title">Click to trigger 1.5 s spinner</h3>
      <div class="showcase-item-demo">
        <div class="flex items-center gap-4">
          <Button
            label="Save changes"
            loading={isLoading}
            onclick={handleLoadingClick}
          />
          <span class="text-xs text-muted-foreground">
            {isLoading ? 'Saving…' : 'Idle — click the button'}
          </span>
        </div>
      </div>
    </div>
  </section>

  <!-- Disabled — all variants ──────────────────────────────────── -->
  <section id="disabled" class="showcase-section">
    <h2 class="showcase-section-title">Disabled — all variants</h2>
    <div class="showcase-item">
      <div class="showcase-item-demo">
        <div class="flex flex-wrap items-center gap-3">
          <Button variant="default" label="Default" disabled />
          <Button variant="secondary" label="Secondary" disabled />
          <Button variant="outline" label="Outline" disabled />
          <Button variant="ghost" label="Ghost" disabled />
          <Button variant="link" label="Link" disabled />
          <Button variant="destructive" label="Destructive" disabled />
        </div>
      </div>
    </div>
  </section>

  <!-- Full-width + link ────────────────────────────────────────── -->
  <section id="full-width" class="showcase-section">
    <h2 class="showcase-section-title">Full-width &amp; link</h2>
    <div class="grid-2x2">
      <div class="showcase-item">
        <h3 class="showcase-item-title">Full-width (class="w-full")</h3>
        <div class="showcase-item-demo">
          <Button class="w-full" label="Get started" variant="default">
            {#snippet trailing()}<ArrowRight size={16} />{/snippet}
          </Button>
        </div>
      </div>

      <div class="showcase-item">
        <h3 class="showcase-item-title">Link variant</h3>
        <div class="showcase-item-demo">
          <div class="flex flex-col gap-2">
            <Button variant="link" label="Learn more" />
            <Button variant="link" label="View documentation">
              {#snippet trailing()}<ArrowRight size={14} />{/snippet}
            </Button>
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- In a Card ───────────────────────────────────────────────── -->
  <section id="in-card" class="showcase-section">
    <h2 class="showcase-section-title">In a Card</h2>
    <div class="showcase-item">
      <h3 class="showcase-item-title">Dialog-style footer with Cancel + Create</h3>
      <div class="showcase-item-demo">
        <div class="max-w-sm">
          <Card title="Create pocket" description="Name it and choose a template">
            <div class="flex justify-end gap-2">
              <Button variant="ghost" label="Cancel" />
              <Button variant="default" label="Create">
                {#snippet leading()}<Plus size={16} />{/snippet}
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  </section>
</div>
