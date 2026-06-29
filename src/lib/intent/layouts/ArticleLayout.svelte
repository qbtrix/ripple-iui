<!--
  ArticleLayout.svelte — designed article / long-form content layout (Wave 3: ported layouts).
  Created 2026-06-07.
  Ripple-native port of ocean-flow's ArticleLayout. Removes all genesis/shadcn
  imports (IconWidget → ripple's Icon widget; no shadcn prose — uses scoped CSS
  with ripple tokens). Composes ripple's display primitives only.

  Routed for the `article` display hint (display.layout='article'). Reads
  structured content from the adapter's `items` where:
    - items[0]  = article metadata (title, description, author, published_at,
                  read_time, cover_image / image)
    - items[1+] = content sections with `type` ∈ heading|paragraph|step|image|
                  video|tip|warning|code and `content` text.
  Falls back gracefully when items is empty (renders title/description only).

  PURE — reads only `input`, no fetch. No top-level $state (child-only; avoids
  the repo's mounted-entry $state flake). Table of contents is client-side only —
  no scroll observer (keeps it SSR-safe and dependency-free).
-->
<script lang="ts">
  import EmptyState from '$lib/widgets/display/EmptyState.svelte';
  import type { LayoutInput } from '../layout-adapter.js';

  interface ArticleSection {
    id?: string;
    type?: 'heading' | 'paragraph' | 'step' | 'image' | 'video' | 'tip' | 'warning' | 'code';
    content?: string;
    level?: 1 | 2 | 3;
    stepNumber?: number;
    imageUrl?: string;
    videoUrl?: string;
  }

  interface Props {
    input: LayoutInput;
  }

  let { input }: Props = $props();

  const items = $derived(input.items);

  // Metadata comes from the first item (or the spec title/description).
  const meta = $derived(items[0] ?? {});
  const articleTitle = $derived(
    (meta.title as string | undefined) ?? input.title ?? 'Article',
  );
  const articleDescription = $derived(
    (meta.description as string | undefined) ?? input.description,
  );
  const authorName = $derived(meta.author as string | undefined);
  const publishedDate = $derived(
    (meta.published_at as string | undefined) ?? (meta.date as string | undefined),
  );
  const readTime = $derived(
    (meta.read_time as string | undefined) ?? (meta.readTime as string | undefined),
  );
  const coverImage = $derived(
    (meta.cover_image as string | undefined) ?? (meta.image as string | undefined),
  );

  // Content sections are items[1..n]. If items[1] has a `sections` array, use
  // that directly (genesis format); otherwise treat each item as a section.
  const sections = $derived<ArticleSection[]>(() => {
    if (items.length <= 1) return [];
    const second = items[1];
    if (Array.isArray((second as any).sections)) {
      return (second as any).sections as ArticleSection[];
    }
    return items.slice(1) as ArticleSection[];
  });

  // TOC entries: headings and steps only. Pure derivation — no side effects.
  const tableOfContents = $derived(
    sections.filter((s) => s.type === 'heading' || s.type === 'step'),
  );

  function sectionId(s: ArticleSection, i: number): string {
    return s.id ?? `section-${i}`;
  }

  function scrollTo(id: string) {
    if (typeof document === 'undefined') return;
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
</script>

{#if items.length === 0 && !input.title}
  <EmptyState title="No content" description="This article has no content yet." icon="file-text" />
{:else}
  <div class="article-layout">
    <!-- Header -->
    <header class="article-layout__header">
      {#if coverImage}
        <div class="article-layout__cover">
          <img src={coverImage} alt={articleTitle} />
        </div>
      {/if}

      <h1 class="article-layout__h1">{articleTitle}</h1>

      {#if articleDescription}
        <p class="article-layout__lead">{articleDescription}</p>
      {/if}

      {#if authorName || publishedDate || readTime}
        <div class="article-layout__meta">
          {#if authorName}
            <span class="article-layout__meta-item">{authorName}</span>
          {/if}
          {#if publishedDate}
            <span class="article-layout__meta-item">{publishedDate}</span>
          {/if}
          {#if readTime}
            <span class="article-layout__meta-item">{readTime} read</span>
          {/if}
        </div>
      {/if}
    </header>

    <div class="article-layout__body">
      <!-- Main content -->
      <article class="article-layout__content">
        {#each sections as section, i (sectionId(section, i))}
          <div id={sectionId(section, i)} class="article-layout__section">
            {#if section.type === 'heading'}
              {#if section.level === 1}
                <h1 class="article-layout__h2">{section.content}</h1>
              {:else if section.level === 3}
                <h3 class="article-layout__h4">{section.content}</h3>
              {:else}
                <h2 class="article-layout__h3">{section.content}</h2>
              {/if}

            {:else if section.type === 'paragraph'}
              <p class="article-layout__p">{section.content}</p>

            {:else if section.type === 'step'}
              <div class="article-layout__step">
                <div class="article-layout__step-num">
                  {section.stepNumber ?? i + 1}
                </div>
                <div class="article-layout__step-body">
                  <p class="article-layout__step-text">{section.content}</p>
                  {#if section.imageUrl}
                    <img src={section.imageUrl} alt="Step illustration" class="article-layout__step-img" />
                  {/if}
                </div>
              </div>

            {:else if section.type === 'image'}
              <figure class="article-layout__figure">
                <img src={section.imageUrl} alt={section.content ?? ''} />
                {#if section.content}
                  <figcaption>{section.content}</figcaption>
                {/if}
              </figure>

            {:else if section.type === 'video'}
              <div class="article-layout__video">
                <!-- svelte-ignore a11y_media_has_caption -->
                <video src={section.videoUrl} controls></video>
              </div>

            {:else if section.type === 'tip'}
              <div class="article-layout__callout article-layout__callout--tip">
                <span class="article-layout__callout-icon">&#128161;</span>
                <p>{section.content}</p>
              </div>

            {:else if section.type === 'warning'}
              <div class="article-layout__callout article-layout__callout--warning">
                <span class="article-layout__callout-icon">&#9888;&#65039;</span>
                <p>{section.content}</p>
              </div>

            {:else if section.type === 'code'}
              <pre class="article-layout__code"><code>{section.content}</code></pre>

            {:else}
              <!-- Unknown section type: render as plain paragraph -->
              {#if section.content}
                <p class="article-layout__p">{section.content}</p>
              {/if}
            {/if}
          </div>
        {/each}
      </article>

      <!-- Table of contents sidebar -->
      {#if tableOfContents.length > 2}
        <aside class="article-layout__toc">
          <div class="article-layout__toc-card">
            <h3 class="article-layout__toc-heading">Contents</h3>
            <nav>
              {#each tableOfContents as item, i (sectionId(item, i))}
                <button
                  class="article-layout__toc-item"
                  onclick={() => scrollTo(sectionId(item, i))}
                >
                  {#if item.type === 'step'}
                    <span class="article-layout__toc-step">{item.stepNumber ?? i + 1}</span>
                  {/if}
                  <span class="article-layout__toc-label">{item.content}</span>
                </button>
              {/each}
            </nav>
          </div>
        </aside>
      {/if}
    </div>
  </div>
{/if}

<style>
  .article-layout {
    max-width: 56rem;
    margin-inline: auto;
  }
  .article-layout__header {
    margin-bottom: 2rem;
  }
  .article-layout__cover {
    aspect-ratio: 21 / 9;
    border-radius: 1rem;
    overflow: hidden;
    margin-bottom: 1.5rem;
  }
  .article-layout__cover img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  .article-layout__h1 {
    font-size: 1.875rem;
    font-weight: 700;
    line-height: 1.2;
    color: var(--ripple-foreground, inherit);
  }
  .article-layout__lead {
    margin-top: 0.75rem;
    font-size: 1.125rem;
    color: var(--ripple-muted-foreground, inherit);
  }
  .article-layout__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-top: 1rem;
    font-size: 0.875rem;
    color: var(--ripple-muted-foreground, inherit);
  }
  .article-layout__meta-item::before {
    content: '· ';
  }
  .article-layout__meta-item:first-child::before {
    content: '';
  }
  .article-layout__body {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
  }
  .article-layout__content {
    flex: 1;
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .article-layout__section {
    scroll-margin-top: 5rem;
  }
  .article-layout__h2 {
    font-size: 1.5rem;
    font-weight: 700;
    margin-top: 1.5rem;
    color: var(--ripple-foreground, inherit);
  }
  .article-layout__h3 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-top: 1.25rem;
    color: var(--ripple-foreground, inherit);
  }
  .article-layout__h4 {
    font-size: 1.125rem;
    font-weight: 600;
    margin-top: 1rem;
    color: var(--ripple-foreground, inherit);
  }
  .article-layout__p {
    font-size: 1rem;
    line-height: 1.75;
    color: var(--ripple-foreground, inherit);
    opacity: 0.85;
  }
  .article-layout__step {
    display: flex;
    gap: 1rem;
    padding: 1rem;
    background: var(--ripple-card, var(--card));
    border: 1px solid var(--ripple-border, var(--border));
    border-radius: 0.75rem;
    margin-block: 1.25rem;
  }
  .article-layout__step-num {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    border-radius: 9999px;
    background: var(--ripple-primary, var(--primary));
    color: #fff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 0.875rem;
  }
  .article-layout__step-body {
    flex: 1;
  }
  .article-layout__step-text {
    font-weight: 500;
    color: var(--ripple-foreground, inherit);
  }
  .article-layout__step-img {
    margin-top: 0.75rem;
    border-radius: 0.5rem;
    max-height: 16rem;
    object-fit: cover;
  }
  .article-layout__figure {
    margin-block: 1.5rem;
  }
  .article-layout__figure img {
    border-radius: 0.75rem;
    width: 100%;
  }
  .article-layout__figure figcaption {
    margin-top: 0.5rem;
    text-align: center;
    font-size: 0.875rem;
    color: var(--ripple-muted-foreground, inherit);
  }
  .article-layout__video {
    margin-block: 1.5rem;
    aspect-ratio: 16 / 9;
    border-radius: 0.75rem;
    overflow: hidden;
    background: #000;
  }
  .article-layout__video video {
    width: 100%;
    height: 100%;
  }
  .article-layout__callout {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    padding: 1rem;
    border-left: 4px solid;
    border-radius: 0 0.5rem 0.5rem 0;
    margin-block: 1rem;
  }
  .article-layout__callout--tip {
    background: color-mix(in srgb, #22c55e 10%, transparent);
    border-color: #22c55e;
    color: #14532d;
  }
  .article-layout__callout--warning {
    background: color-mix(in srgb, #f59e0b 10%, transparent);
    border-color: #f59e0b;
    color: #78350f;
  }
  .article-layout__callout-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }
  .article-layout__callout p {
    font-size: 0.9375rem;
    line-height: 1.6;
  }
  .article-layout__code {
    background: #0f172a;
    color: #e2e8f0;
    padding: 1rem;
    border-radius: 0.5rem;
    overflow-x: auto;
    font-size: 0.875rem;
    line-height: 1.6;
    margin-block: 1rem;
  }
  /* Sidebar TOC — only shows on large viewports */
  .article-layout__toc {
    display: none;
    flex-shrink: 0;
    width: 16rem;
  }
  @media (min-width: 1024px) {
    .article-layout__toc {
      display: block;
    }
  }
  .article-layout__toc-card {
    position: sticky;
    top: 1rem;
    padding: 1rem;
    background: var(--ripple-card, var(--card));
    border: 1px solid var(--ripple-border, var(--border));
    border-radius: 0.75rem;
  }
  .article-layout__toc-heading {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--ripple-muted-foreground, inherit);
    margin-bottom: 0.75rem;
  }
  .article-layout__toc-item {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    width: 100%;
    text-align: left;
    font-size: 0.875rem;
    padding: 0.375rem 0.5rem;
    border-radius: 0.375rem;
    color: var(--ripple-muted-foreground, inherit);
    background: none;
    border: none;
    cursor: pointer;
    transition: background 0.15s;
  }
  .article-layout__toc-item:hover {
    background: var(--ripple-muted, var(--muted));
    color: var(--ripple-foreground, inherit);
  }
  .article-layout__toc-step {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 1.25rem;
    font-size: 0.75rem;
    color: var(--ripple-muted-foreground, inherit);
  }
  .article-layout__toc-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
