<script lang="ts">
  import Card from '$lib/widgets/layout/Card.svelte';
  import Stat from '$lib/widgets/display/Stat.svelte';
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>Card — Visual QA</h1>
    <p>
      All variants, densities, and snippet slots for the rebuilt
      <code>Card</code> widget. Verify against treatment A (hairline) spec.
    </p>
    <nav class="showcase-nav">
      <a href="#variants">Variants</a>
      <a href="#density">Density</a>
      <a href="#interactive">Interactive</a>
      <a href="#header-slot">Header slot</a>
      <a href="#footer-slot">Footer slot</a>
      <a href="#full">Full composition</a>
    </nav>
  </header>

  <!-- Variants ──────────────────────────────────────────────── -->
  <section id="variants" class="showcase-section">
    <h2 class="showcase-section-title">Variants</h2>
    <div class="grid-2x2">
      <div class="showcase-item">
        <h3 class="showcase-item-title">default</h3>
        <div class="showcase-item-demo">
          <Card title="Default" description="border border-border on bg-card">
            <p class="body-text">Standard card, no extra fill.</p>
          </Card>
        </div>
      </div>

      <div class="showcase-item">
        <h3 class="showcase-item-title">muted</h3>
        <div class="showcase-item-demo">
          <Card variant="muted" title="Muted" description="border border-border on bg-muted">
            <p class="body-text">Subdued background, low emphasis.</p>
          </Card>
        </div>
      </div>

      <div class="showcase-item">
        <h3 class="showcase-item-title">outlined</h3>
        <div class="showcase-item-demo">
          <Card variant="outlined" title="Outlined" description="border foreground/15 — hairline">
            <p class="body-text">Hairline border, lightest treatment.</p>
          </Card>
        </div>
      </div>

      <div class="showcase-item">
        <h3 class="showcase-item-title">selected</h3>
        <div class="showcase-item-demo">
          <Card variant="selected" title="Selected" description="ring-1 ring-inset ring-primary">
            <p class="body-text">Primary ring overlay signals selection.</p>
          </Card>
        </div>
      </div>
    </div>
  </section>

  <!-- Density ───────────────────────────────────────────────── -->
  <section id="density" class="showcase-section">
    <h2 class="showcase-section-title">Density</h2>
    <div class="side-by-side">
      <div class="showcase-item">
        <h3 class="showcase-item-title">compact (default)</h3>
        <div class="showcase-item-demo">
          <Card title="Compact card" description="gap-2 p-4">
            <p class="body-text">Tighter padding, default density.</p>
          </Card>
        </div>
      </div>

      <div class="showcase-item">
        <h3 class="showcase-item-title">comfortable</h3>
        <div class="showcase-item-demo">
          <Card density="comfortable" title="Comfortable card" description="gap-3 p-5">
            <p class="body-text">More breathing room for content-heavy layouts.</p>
          </Card>
        </div>
      </div>
    </div>
  </section>

  <!-- Interactive ────────────────────────────────────────────── -->
  <section id="interactive" class="showcase-section">
    <h2 class="showcase-section-title">Interactive</h2>
    <div class="showcase-item">
      <h3 class="showcase-item-title">interactive + onclick (renders as &lt;button&gt;)</h3>
      <div class="showcase-item-demo">
        <Card
          title="Interactive"
          description="Clickable + keyboard focusable"
          interactive
          onclick={() => console.log('card clicked')}
        >
          Click me, or tab in and press Enter / Space.
        </Card>
      </div>
    </div>
  </section>

  <!-- Header slot ────────────────────────────────────────────── -->
  <section id="header-slot" class="showcase-section">
    <h2 class="showcase-section-title">With header slot</h2>
    <div class="showcase-item">
      <h3 class="showcase-item-title">title + description + right-side stat in header snippet</h3>
      <div class="showcase-item-demo">
        <Card title="Monthly revenue" description="Last 30 days">
          {#snippet header()}
            <Stat value={12450.32} format="currency" deltaPercent={3.4} direction="up-good" size="sm" align="right" />
          {/snippet}
          <div class="h-16 rounded bg-muted/50" aria-hidden="true"></div>
        </Card>
      </div>
    </div>
  </section>

  <!-- Footer slot ────────────────────────────────────────────── -->
  <section id="footer-slot" class="showcase-section">
    <h2 class="showcase-section-title">With footer slot</h2>
    <div class="showcase-item">
      <h3 class="showcase-item-title">footer snippet with meta text</h3>
      <div class="showcase-item-demo">
        <Card title="Active users" description="Rolling 7-day window">
          <div class="h-16 rounded bg-muted/50" aria-hidden="true"></div>
          {#snippet footer()}
            <span class="text-xs text-muted-foreground">Updated 2m ago · Source: analytics</span>
          {/snippet}
        </Card>
      </div>
    </div>
  </section>

  <!-- Full composition ───────────────────────────────────────── -->
  <section id="full" class="showcase-section">
    <h2 class="showcase-section-title">Full composition</h2>
    <div class="showcase-item">
      <h3 class="showcase-item-title">title + description + header snippet + body + footer snippet</h3>
      <div class="showcase-item-demo">
        <Card title="Monthly revenue" description="Last 30 days">
          {#snippet header()}
            <Stat value={12450.32} format="currency" deltaPercent={-2.1} direction="up-good" size="sm" align="right" />
          {/snippet}
          <div class="h-16 rounded bg-muted/50" aria-hidden="true"></div>
          {#snippet footer()}
            <span class="text-xs text-muted-foreground">Updated 2m ago</span>
          {/snippet}
        </Card>
      </div>
    </div>
  </section>
</div>

<style>
  .showcase {
    max-width: 960px;
    margin: 0 auto;
    padding: 2rem 1.5rem 4rem;
    color: hsl(var(--foreground));
  }
  .showcase-header {
    margin-bottom: 2.5rem;
  }
  .showcase-header h1 {
    font-size: 1.75rem;
    font-weight: 700;
    margin: 0 0 0.25rem;
  }
  .showcase-header p {
    font-size: 0.875rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 1rem;
  }
  .showcase-header code {
    background: hsl(var(--muted) / 0.5);
    padding: 1px 5px;
    border-radius: 4px;
    font-size: 0.8rem;
  }
  .showcase-nav {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }
  .showcase-nav a {
    padding: 4px 12px;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 500;
    background: hsl(var(--muted) / 0.4);
    color: hsl(var(--foreground));
    text-decoration: none;
    transition: background 0.15s;
  }
  .showcase-nav a:hover {
    background: hsl(var(--muted));
  }
  .showcase-section {
    margin-bottom: 2.5rem;
  }
  .showcase-section-title {
    font-size: 1.15rem;
    font-weight: 600;
    margin: 0 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  .grid-2x2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .side-by-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .showcase-item {
    border: 1px solid hsl(var(--border));
    border-radius: 10px;
    overflow: hidden;
  }
  .showcase-item-title {
    font-size: 0.8rem;
    font-weight: 600;
    padding: 8px 14px;
    margin: 0;
    background: hsl(var(--muted) / 0.25);
    border-bottom: 1px solid hsl(var(--border));
    color: hsl(var(--muted-foreground));
  }
  .showcase-item-demo {
    padding: 1.25rem;
    background: hsl(var(--background));
  }
  .body-text {
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    margin: 0;
  }
</style>
