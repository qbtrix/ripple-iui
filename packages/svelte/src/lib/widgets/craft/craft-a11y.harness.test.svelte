<!--
  craft-a11y.harness.test.svelte — test-only composition of the Quick/craft parts as a host
  wires them (inspector rows with unit fields, a toolbar colour swatch, the asset panel, the page
  strip, the palette), for craft-a11y.test.ts's accessible-name scan.
-->
<script lang="ts">
  import ContextToolbar from './ContextToolbar.svelte';
  import AssetPanel from './AssetPanel.svelte';
  import PageStrip from './PageStrip.svelte';
  import PropertyRow from './PropertyRow.svelte';
  import InspectorSection from './InspectorSection.svelte';
  import NumberInput from '../input/NumberInput.svelte';
  import ColorPicker from '../input/ColorPicker.svelte';
  import CommandPalette from '../overlay/CommandPalette.svelte';

  const noop = () => {};
</script>

<div style="position: relative; width: 800px; height: 600px">
  <ContextToolbar anchor={{ x: 300, y: 300, width: 200, height: 60 }} bounds={{ width: 800, height: 600 }}>
    <ColorPicker compact showInput={false} value="#7a1f2c" onchange={noop} />
    <NumberInput compact suffix="pt" value={48} aria-label="Text size" onchange={noop} />
  </ContextToolbar>
</div>

<!-- Docked: in flow, so the scan reaches the bar's own controls (a floating bar is aria-hidden
     until it is measured, which jsdom never does). -->
<ContextToolbar variant="docked">
  <ColorPicker compact showInput={false} value="#7a1f2c" onchange={noop} />
  <NumberInput compact suffix="pt" value={48} aria-label="Text size" onchange={noop} />
  {#snippet panel()}<p>Edit</p>{/snippet}
</ContextToolbar>

<InspectorSection title="Text">
  <PropertyRow label="Size"><NumberInput compact suffix="pt" value={12} onchange={noop} /></PropertyRow>
  <PropertyRow label="Weight"><NumberInput compact suffix="pt" value={1} onchange={noop} /></PropertyRow>
  <PropertyRow label="Fill"><ColorPicker compact value="#7a1f2c" cmyk={{ c: 0, m: 75, y: 64, k: 52 }} onchange={noop} /></PropertyRow>
  <PropertyRow label="Position"><NumberInput compact label="X" suffix="mm" value={1} onchange={noop} /><NumberInput compact label="Y" suffix="mm" value={2} onchange={noop} /></PropertyRow>
</InspectorSection>

<AssetPanel
  tabs={[{ id: 'templates', label: 'Templates' }, { id: 'elements', label: 'Elements', captions: false }]}
  items={{ templates: [{ id: 't1', label: 'Kesar classic' }], elements: [{ id: 'e1', label: 'Diya' }] }}
  oninsert={noop}
/>

<PageStrip pages={[{ id: 'p1' }, { id: 'p2' }]} onadd={noop} onmove={noop} onduplicate={noop} ondelete={noop} />

<CommandPalette value={true} commands={[{ id: 'c1', label: 'Align Center', group: 'Commands' }]} />
