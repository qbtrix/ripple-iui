<!--
  routes/quick-lab/+page.svelte
  Visual-check surface for the Quick mode parts, composed the way a host
  editor uses them: EditorShell density="quick" with AssetPanel on the left, a
  CanvasViewport with a click-to-select box, a floating ContextToolbar anchored
  to it (with a `>>` edit panel), a prompt bar under the canvas, a fill-in
  panel on the right, PageStrip at the bottom and CommandPalette on `/` or ⌘K.
  Placeholder data only (generated SVG thumbnails); dev playground, not shipped.
-->
<script lang="ts">
  import {
    EditorShell,
    CanvasViewport,
    ContextToolbar,
    AssetPanel,
    PageStrip,
    CommandPalette,
    InspectorSection,
    PropertyRow,
    Button,
    Input,
    PromptBar,
    readAssetDrop,
    isAssetDrag,
    type AssetItem,
    type PageItem,
    type PaletteItem,
  } from '$lib/ui/index.js';

  const swatch = (label: string, hue: number, w = 300, h = 200) =>
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="hsl(${hue} 70% 88%)"/><text x="50%" y="55%" font-family="sans-serif" font-size="${h / 7}" text-anchor="middle" fill="hsl(${hue} 50% 30%)">${label}</text></svg>`,
    );

  const tabs = [
    { id: 'templates', label: 'Templates', icon: 'layout-template', placeholder: 'Search templates, e.g. diwali', filters: [{ id: 'festival', label: 'Festival' }, { id: 'shop', label: 'Shop' }, { id: 'wedding', label: 'Wedding' }, { id: 'card', label: 'Cards' }] },
    { id: 'elements', label: 'Elements', icon: 'shapes', captions: false },
    { id: 'text', label: 'Text', icon: 'type' },
    { id: 'brand', label: 'Brand', icon: 'palette', emptyText: 'Add your shop logo and colours' },
    { id: 'uploads', label: 'Uploads', icon: 'upload', emptyText: 'Upload a photo or logo' },
  ];
  const templates: AssetItem[] = [
    { id: 't1', label: 'Diwali offer banner', thumb: swatch('Diwali', 40, 300, 120), width: 300, height: 120, tags: ['festival', 'diwali'], kind: 'template' },
    { id: 't2', label: 'Visiting card', thumb: swatch('Card', 210, 350, 200), width: 350, height: 200, tags: ['card'], kind: 'template' },
    { id: 't3', label: 'Holi sale', thumb: swatch('Holi', 300), tags: ['festival', 'shop'], kind: 'template' },
    { id: 't4', label: 'Wedding invite', thumb: swatch('Shaadi', 350, 200, 280), width: 200, height: 280, tags: ['wedding'], kind: 'template' },
    { id: 't5', label: 'Eid Mubarak', thumb: swatch('Eid', 150), tags: ['festival'], kind: 'template' },
    { id: 't6', label: 'Shop banner', thumb: swatch('Dukaan', 20, 300, 120), width: 300, height: 120, tags: ['shop'], kind: 'template' },
  ];
  const elements: AssetItem[] = ['Diya', 'Kalash', 'Toran', 'Rangoli', 'Star', 'QR code'].map((l, i) => ({
    id: `e${i}`, label: l, thumb: swatch(l, i * 55, 120, 120), kind: 'element',
  }));
  const text: AssetItem[] = [
    { id: 'h', label: 'Heading', preview: 'Add a heading', kind: 'text-preset' },
    { id: 's', label: 'Subheading', preview: 'Subheading', kind: 'text-preset' },
    { id: 'b', label: 'Body', preview: 'Body text', kind: 'text-preset' },
  ];

  let pageList = $state<PageItem[]>([
    { id: 'p1', thumb: swatch('1', 40, 300, 120), width: 300, height: 120 },
    { id: 'p2', thumb: swatch('2', 200, 300, 120), width: 300, height: 120 },
  ]);
  let current = $state('p1');
  let n = 3;
  const addPage = (i: number) => {
    const id = `p${n++}`;
    pageList.splice(i, 0, { id, width: 300, height: 120 });
    current = id;
  };
  const movePage = (id: string, to: number) => {
    const from = pageList.findIndex((p) => p.id === id);
    const [p] = pageList.splice(from, 1);
    pageList.splice(to, 0, p);
  };

  const commands: PaletteItem[] = [
    { id: 'dup', label: 'Duplicate', group: 'Commands', shortcut: '⌘D', menu: 'Edit > Duplicate', aliases: ['copy'] },
    { id: 'front', label: 'Bring to front', group: 'Commands', shortcut: '⇧⌘]', menu: 'Object > Arrange' },
    { id: 'bg', label: 'Remove background', group: 'Commands', menu: 'Image > Background', icon: 'eraser' },
    ...templates.map((t) => ({ id: t.id, label: t.label, group: 'Templates', thumb: t.thumb, keywords: t.tags })),
    ...elements.map((e) => ({ id: e.id, label: e.label, group: 'Elements', thumb: e.thumb })),
    { id: 'route-pro', label: 'Open the Pro editor', group: 'Pages', icon: 'square-pen' },
  ];
  let paletteOpen = $state(false);
  let recent = $state<string[]>([]);
  let last = $state('');

  // A 1000 x 400 doc with one selectable box.
  const box = { x: 320, y: 140, width: 360, height: 120 };
  let selected = $state(true);
  let zoom = $state(1);
  let panX = $state(0);
  let panY = $state(0);
  const anchor = $derived(selected ? { x: panX + box.x * zoom, y: panY + box.y * zoom, width: box.width * zoom, height: box.height * zoom } : null);
  let shopName = $state('Sharma Sweets');
  let offer = $state('20% off');
</script>

<div class="h-[calc(100vh-56px)] p-3">
  <EditorShell density="quick" rightWidth={300} class="rounded-xl border border-ripple-border">
    {#snippet title()}<span class="px-1 text-sm font-semibold">Diwali offer banner · 10×4 ft</span>{/snippet}
    {#snippet topbar()}
      <div class="flex items-center gap-2">
        <span class="flex-1"></span>
        <Button variant="secondary" size="sm" label="/ Search or command" onclick={() => (paletteOpen = true)} />
        <Button variant="ghost" size="sm" label="Pro editor" />
      </div>
    {/snippet}
    {#snippet left()}
      <AssetPanel {tabs} items={{ templates, elements, text, brand: [], uploads: [] }} oninsert={(it) => (last = `insert ${it.label}`)} />
    {/snippet}
    <div
      class="size-full"
      role="presentation"
      ondragover={(e) => isAssetDrag(e.dataTransfer) && e.preventDefault()}
      ondrop={(e) => {
        const d = readAssetDrop(e.dataTransfer);
        if (d) last = `dropped ${d.label}`;
      }}
    >
      <CanvasViewport docWidth={1000} docHeight={400} bind:zoom bind:panX bind:panY onpointer={(p) => {
        if (p.kind === 'down') selected = p.x >= box.x && p.x <= box.x + box.width && p.y >= box.y && p.y <= box.y + box.height;
      }}>
        <div class="relative size-full bg-[color-mix(in_oklab,var(--ripple-warning)_25%,var(--ripple-surface))]">
          <div class="absolute flex items-center justify-center text-5xl font-bold outline-2 outline-dashed outline-transparent data-[on]:outline-ripple-accent" data-on={selected || undefined}
            style="left:{box.x}px;top:{box.y}px;width:{box.width}px;height:{box.height}px">{shopName}</div>
        </div>
      </CanvasViewport>
    </div>
    {#snippet floating()}
      <ContextToolbar {anchor} panelTitle="Text">
        <Button variant="ghost" size="sm" label="Mukta" />
        <Button variant="ghost" size="sm" label="48" />
        <Button variant="ghost" size="sm" label="Colour" />
        <Button variant="ghost" size="sm" label="Effects" />
        <Button variant="ghost" size="sm" label="Ask Paw" />
        {#snippet panel()}
          <InspectorSection title="Text"><PropertyRow label="Font">Mukta</PropertyRow><PropertyRow label="Size">48 pt</PropertyRow></InspectorSection>
          <InspectorSection title="Effects"><PropertyRow label="Shadow">Off</PropertyRow></InspectorSection>
        {/snippet}
      </ContextToolbar>
    {/snippet}
    {#snippet prompt()}<PromptBar placeholder="Ask Paw: add a Hindi phone line in gold" />{/snippet}
    {#snippet right()}
      <div class="flex flex-col gap-3 p-3">
        <h2 class="text-[15px] font-semibold">Fill in</h2>
        <label class="flex flex-col gap-1 text-[13px]">Shop name<Input value={shopName} oninput={(v) => (shopName = String(v))} /></label>
        <label class="flex flex-col gap-1 text-[13px]">Offer<Input value={offer} oninput={(v) => (offer = String(v))} /></label>
        <Button label="Print-ready PDF" />
        <p class="text-[12px] text-ripple-muted-foreground">{last}</p>
      </div>
    {/snippet}
    {#snippet pages()}
      <PageStrip pages={pageList} bind:current onadd={addPage} onmove={movePage}
        onduplicate={(id) => addPage(pageList.findIndex((p) => p.id === id) + 1)}
        ondelete={(id) => pageList.splice(pageList.findIndex((p) => p.id === id), 1)} />
    {/snippet}
  </EditorShell>
</div>

<CommandPalette bind:value={paletteOpen} slash {commands} groups={['Commands', 'Templates', 'Elements', 'Pages']} {recent}
  onselect={(id, item) => { last = `ran ${item.label}`; recent = [id, ...recent.filter((r) => r !== id)].slice(0, 4); }} />
