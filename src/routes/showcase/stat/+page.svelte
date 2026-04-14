<script lang="ts">
  import Stat from '$lib/widgets/display/Stat.svelte';
  import Card from '$lib/widgets/layout/Card.svelte';
</script>

<div class="showcase">
  <header class="showcase-header">
    <h1>Stat — Visual QA</h1>
    <p>
      All sizes, formats, direction semantics, alignment, and Card composition for the
      <code>Stat</code> widget.
    </p>
    <nav class="showcase-nav">
      <a href="#sizes">Sizes</a>
      <a href="#formats">Formats</a>
      <a href="#direction-matrix">Direction matrix</a>
      <a href="#labeled">Labeled vs unlabeled</a>
      <a href="#alignment">Alignment</a>
      <a href="#card-composition">Card composition</a>
    </nav>
  </header>

  <!-- Sizes ──────────────────────────────────────────────────── -->
  <section id="sizes" class="showcase-section">
    <h2 class="showcase-section-title">Sizes</h2>
    <p class="section-caption">Same data at sm / md / lg. Currency, positive delta, up-good.</p>
    <div class="side-by-side-3">
      <div class="showcase-item">
        <h3 class="showcase-item-title">sm</h3>
        <div class="showcase-item-demo">
          <Stat value={12450} format="currency" deltaPercent={3.4} direction="up-good" size="sm" />
        </div>
      </div>
      <div class="showcase-item">
        <h3 class="showcase-item-title">md (default)</h3>
        <div class="showcase-item-demo">
          <Stat value={12450} format="currency" deltaPercent={3.4} direction="up-good" size="md" />
        </div>
      </div>
      <div class="showcase-item">
        <h3 class="showcase-item-title">lg</h3>
        <div class="showcase-item-demo">
          <Stat value={12450} format="currency" deltaPercent={3.4} direction="up-good" size="lg" />
        </div>
      </div>
    </div>
  </section>

  <!-- Formats ────────────────────────────────────────────────── -->
  <section id="formats" class="showcase-section">
    <h2 class="showcase-section-title">Formats</h2>
    <p class="section-caption">number · currency USD · currency INR · percent · compact</p>
    <div class="grid-formats">
      <div class="showcase-item">
        <h3 class="showcase-item-title">number</h3>
        <div class="showcase-item-demo">
          <Stat label="Count" value={1234} format="number" deltaPercent={5.2} direction="up-good" />
        </div>
      </div>
      <div class="showcase-item">
        <h3 class="showcase-item-title">currency — USD</h3>
        <div class="showcase-item-demo">
          <Stat label="Revenue" value={1234.5} format="currency" currency="USD" deltaPercent={2.8} direction="up-good" />
        </div>
      </div>
      <div class="showcase-item">
        <h3 class="showcase-item-title">currency — INR</h3>
        <div class="showcase-item-demo">
          <Stat label="Revenue" value={1234.5} format="currency" currency="INR" locale="en-IN" deltaPercent={2.8} direction="up-good" />
        </div>
      </div>
      <div class="showcase-item">
        <h3 class="showcase-item-title">percent</h3>
        <div class="showcase-item-demo">
          <Stat label="Conversion" value={0.125} format="percent" deltaPercent={-1.3} direction="up-good" />
        </div>
      </div>
      <div class="showcase-item">
        <h3 class="showcase-item-title">compact</h3>
        <div class="showcase-item-demo">
          <Stat label="Impressions" value={1234567} format="compact" deltaPercent={11.4} direction="up-good" />
        </div>
      </div>
    </div>
  </section>

  <!-- Direction matrix ───────────────────────────────────────── -->
  <section id="direction-matrix" class="showcase-section">
    <h2 class="showcase-section-title">Direction matrix</h2>
    <p class="section-caption">
      Rows = direction semantic. Columns = delta sign. Verify green/red rendering is correct for
      each semantic.
    </p>
    <div class="matrix-grid">
      <!-- Header row -->
      <div class="matrix-axis-label"></div>
      <div class="matrix-col-label">positive (+3.4%)</div>
      <div class="matrix-col-label">negative (−2.1%)</div>
      <div class="matrix-col-label">zero (0%)</div>

      <!-- auto -->
      <div class="matrix-row-label">auto</div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={3.4} direction="auto" size="sm" />
        </div>
      </div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={-2.1} direction="auto" size="sm" />
        </div>
      </div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={0} direction="auto" size="sm" />
        </div>
      </div>

      <!-- up-good -->
      <div class="matrix-row-label">up-good</div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={3.4} direction="up-good" size="sm" />
        </div>
      </div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={-2.1} direction="up-good" size="sm" />
        </div>
      </div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={0} direction="up-good" size="sm" />
        </div>
      </div>

      <!-- down-good -->
      <div class="matrix-row-label">down-good</div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={3.4} direction="down-good" size="sm" />
        </div>
      </div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={-2.1} direction="down-good" size="sm" />
        </div>
      </div>
      <div class="showcase-item">
        <div class="showcase-item-demo">
          <Stat value={9200} format="number" deltaPercent={0} direction="down-good" size="sm" />
        </div>
      </div>
    </div>
  </section>

  <!-- Labeled vs unlabeled ───────────────────────────────────── -->
  <section id="labeled" class="showcase-section">
    <h2 class="showcase-section-title">Labeled vs unlabeled</h2>
    <div class="side-by-side">
      <div class="showcase-item">
        <h3 class="showcase-item-title">with label</h3>
        <div class="showcase-item-demo">
          <Stat label="Revenue" value={48200} format="currency" deltaPercent={7.1} direction="up-good" />
        </div>
      </div>
      <div class="showcase-item">
        <h3 class="showcase-item-title">no label</h3>
        <div class="showcase-item-demo">
          <Stat value={48200} format="currency" deltaPercent={7.1} direction="up-good" />
        </div>
      </div>
    </div>
  </section>

  <!-- Alignment ──────────────────────────────────────────────── -->
  <section id="alignment" class="showcase-section">
    <h2 class="showcase-section-title">Alignment</h2>
    <p class="section-caption">Both stats are inside a constrained w-60 container so alignment is visible.</p>
    <div class="side-by-side">
      <div class="showcase-item">
        <h3 class="showcase-item-title">align="left" (default)</h3>
        <div class="showcase-item-demo">
          <div class="w-60 border border-dashed border-border/50 rounded p-2">
            <Stat label="Latency" value={142} format="number" deltaPercent={-8.3} direction="down-good" align="left" />
          </div>
        </div>
      </div>
      <div class="showcase-item">
        <h3 class="showcase-item-title">align="right"</h3>
        <div class="showcase-item-demo">
          <div class="w-60 border border-dashed border-border/50 rounded p-2">
            <Stat label="Latency" value={142} format="number" deltaPercent={-8.3} direction="down-good" align="right" />
          </div>
        </div>
      </div>
    </div>
  </section>

  <!-- Card composition ───────────────────────────────────────── -->
  <section id="card-composition" class="showcase-section">
    <h2 class="showcase-section-title">Card composition</h2>
    <p class="section-caption">Stat in Card header (align right) and plain text in footer.</p>
    <div class="showcase-item">
      <h3 class="showcase-item-title">Stat as Card header + footer</h3>
      <div class="showcase-item-demo">
        <Card title="Active users" description="Rolling 7-day window">
          {#snippet header()}
            <Stat value={3847} format="compact" deltaPercent={12.6} direction="up-good" size="sm" align="right" />
          {/snippet}
          <div class="h-16 rounded bg-muted/50" aria-hidden="true"></div>
          {#snippet footer()}
            <span class="text-xs text-muted-foreground">Updated 4m ago · Source: analytics</span>
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
    margin: 0 0 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid hsl(var(--border));
  }
  .section-caption {
    font-size: 0.8125rem;
    color: hsl(var(--muted-foreground));
    margin: 0 0 1rem;
  }
  .side-by-side {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }
  .side-by-side-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 1rem;
  }
  .grid-formats {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
  .matrix-grid {
    display: grid;
    grid-template-columns: 7rem 1fr 1fr 1fr;
    gap: 0.5rem;
    align-items: center;
  }
  .matrix-col-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    text-align: center;
    padding-bottom: 0.25rem;
  }
  .matrix-row-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(var(--muted-foreground));
    font-family: monospace;
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
</style>
