<script lang="ts">
  import { filterCommands, type Command } from '../command-palette';
  import { navAllowed, type EngineCapability } from '../api/capability';

  let {
    open = false,
    caps,
    onclose
  }: {
    open?: boolean;
    caps: EngineCapability;
    onclose: () => void;
  } = $props();

  let q = $state('');
  let active = $state(0);
  let box = $state<HTMLInputElement | null>(null);
  const hits = $derived(filterCommands(q).filter((c) => navAllowed(c.href, caps)));
  const groups = $derived.by(() => {
    const workspace = hits.filter((c) => c.group === 'Workspace');
    const admin = hits.filter((c) => c.group === 'Admin');
    return [
      { name: 'Workspace', items: workspace },
      { name: 'Admin', items: admin }
    ].filter((g) => g.items.length);
  });

  $effect(() => {
    if (open) {
      q = '';
      active = 0;
      queueMicrotask(() => box?.focus());
    }
  });

  $effect(() => {
    hits;
    if (active >= hits.length) active = Math.max(0, hits.length - 1);
  });

  function go(cmd: Command) {
    location.hash = cmd.href;
    onclose();
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onclose();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      active = Math.min(hits.length - 1, active + 1);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      active = Math.max(0, active - 1);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const cmd = hits[active];
      if (cmd) go(cmd);
    }
  }
</script>

{#if open}
  <div class="modal modal-open" role="dialog" aria-modal="true" aria-label="Command palette">
    <div class="modal-box max-w-lg p-0">
      <input
        bind:this={box}
        class="input input-ghost w-full rounded-none border-0 border-b border-base-300"
        placeholder="Đi tới trang…"
        bind:value={q}
        onkeydown={onKey}
      />
      <ul class="max-h-80 overflow-auto p-1">
        {#each groups as group}
          <li class="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-base-content/40">{group.name}</li>
          {#each group.items as cmd}
            {@const i = hits.indexOf(cmd)}
            <li>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm hover:bg-base-200"
                class:bg-base-200={i === active}
                onclick={() => go(cmd)}
              >
                <span>{cmd.label}</span>
                <span class="font-mono text-[10px] text-base-content/40">{cmd.href}</span>
              </button>
            </li>
          {/each}
        {/each}
        {#if !hits.length}
          <li class="px-3 py-4 text-sm text-base-content/50">Không khớp.</li>
        {/if}
      </ul>
    </div>
    <button class="modal-backdrop bg-neutral/40" type="button" onclick={onclose} aria-label="Đóng"></button>
  </div>
{/if}
