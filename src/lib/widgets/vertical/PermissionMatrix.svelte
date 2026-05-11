<!-- src/lib/widgets/vertical/PermissionMatrix.svelte -->
<script lang="ts">
  import { cn } from '$lib/utils.js';
  import CheckIcon from '@lucide/svelte/icons/check';

  type Role = { id: string; label: string; description?: string };
  type Permission = { id: string; label: string; description?: string };

  /**
   * Map of `roleId__permissionId` → boolean. We use a flat key map so this
   * shape is friendly to JSON specs and easy to bind to a state path.
   */
  type Grid = Record<string, boolean>;

  interface Props {
    id?: string;
    class?: string;
    style?: Record<string, string>;
    roles?: Role[];
    permissions?: Permission[];
    /** Bind via `bind: "<state-path>"`. */
    value?: Grid;
    readonly?: boolean;
    onchange?: (next: Grid) => void;
  }

  let {
    id,
    class: className,
    style,
    roles = [],
    permissions = [],
    value = {},
    readonly = false,
    onchange
  }: Props = $props();

  const styleString = $derived(
    style ? Object.entries(style).map(([k, v]) => `${k}:${v}`).join(';') : undefined
  );

  function key(roleId: string, permId: string): string {
    return `${roleId}__${permId}`;
  }

  function isAllowed(roleId: string, permId: string): boolean {
    return !!(value && value[key(roleId, permId)]);
  }

  function toggle(roleId: string, permId: string) {
    if (readonly) return;
    const k = key(roleId, permId);
    const next: Grid = { ...(value ?? {}), [k]: !value?.[k] };
    onchange?.(next);
  }
</script>

<div
  {id}
  class={cn('overflow-x-auto rounded-md border border-border', className)}
  style={styleString}
>
  <table class="w-full text-sm">
    <thead class="bg-muted/30">
      <tr>
        <th class="text-left px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Permission
        </th>
        {#each roles as role (role.id)}
          <th class="text-center px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <div>{role.label}</div>
            {#if role.description}
              <div class="text-[10px] text-muted-foreground/70 normal-case font-normal mt-0.5">
                {role.description}
              </div>
            {/if}
          </th>
        {/each}
      </tr>
    </thead>
    <tbody>
      {#each permissions as perm (perm.id)}
        <tr class="border-t border-border">
          <td class="px-3 py-2 align-top">
            <div class="font-medium">{perm.label}</div>
            {#if perm.description}
              <div class="text-xs text-muted-foreground mt-0.5">{perm.description}</div>
            {/if}
          </td>
          {#each roles as role (role.id)}
            {@const allowed = isAllowed(role.id, perm.id)}
            <td class="px-3 py-2 text-center align-middle">
              <button
                type="button"
                role="checkbox"
                aria-checked={allowed}
                aria-label={`${role.label}: ${perm.label}`}
                disabled={readonly}
                onclick={() => toggle(role.id, perm.id)}
                class={cn(
                  'inline-grid place-items-center h-6 w-6 rounded border transition-colors',
                  allowed
                    ? 'bg-primary border-primary text-primary-foreground'
                    : 'border-input hover:bg-muted',
                  readonly && 'cursor-not-allowed opacity-70'
                )}
              >
                {#if allowed}
                  <CheckIcon size={14} />
                {/if}
              </button>
            </td>
          {/each}
        </tr>
      {/each}
    </tbody>
  </table>
</div>
