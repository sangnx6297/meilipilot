<script lang="ts">
  import { csvList } from '../api/search-form';

  let {
    names,
    value,
    onchange
  }: {
    names: string[];
    value: string;
    onchange: (value: string) => void;
  } = $props();

  let needle = $state('');
  let open = $state(false);
  const selectedItems = $derived(csvList(value) ?? []);
  const selected = $derived(new Set(selectedItems));
  const matches = $derived.by(() => {
    const query = needle.trim().toLowerCase();
    return names.filter((name) => !selected.has(name) && (!query || name.toLowerCase().includes(query)));
  });
  const suggestions = $derived(matches.slice(0, 8));

  function write(items: string[]) {
    onchange(items.join(', '));
  }

  function add(name: string) {
    if (selected.has(name)) return;
    write([...selectedItems, name]);
    needle = '';
    open = true;
  }

  function remove(name: string) {
    write(selectedItems.filter((item) => item !== name));
  }
</script>

{#if names.length || selectedItems.length}
  <div class="flex flex-col gap-1">
    {#if selectedItems.length}
      <div class="flex flex-wrap gap-1">
        {#each selectedItems as name (name)}
          <span class="inline-flex max-w-full items-center gap-1 rounded-md border border-base-300 bg-base-100 py-0.5 pl-2 pr-0.5 text-xs text-base-content">
            <span class="truncate">{name}</span>
            <button
              class="grid size-4 shrink-0 place-items-center rounded text-sm leading-none text-base-content/45 hover:bg-base-200 hover:text-error"
              type="button"
              aria-label="Bỏ {name}"
              onclick={() => remove(name)}
            >×</button>
          </span>
        {/each}
      </div>
    {/if}
    {#if names.length}
      <div class="relative">
        <input
          class="input input-bordered input-xs w-full"
          placeholder="Thêm field ({names.length})"
          bind:value={needle}
          onfocus={() => (open = true)}
          onblur={() => (open = false)}
        />
        {#if open}
          <ul class="absolute z-30 mt-1 max-h-52 w-full overflow-auto rounded-box border border-base-300 bg-base-100 p-1 shadow-lg">
            {#each suggestions as name (name)}
              <li>
                <button
                  class="w-full rounded-md px-2 py-1 text-left text-xs text-base-content hover:bg-base-200"
                  type="button"
                  onmousedown={(e) => {
                    e.preventDefault();
                    add(name);
                  }}
                >{name}</button>
              </li>
            {:else}
              <li class="px-2 py-1 text-xs text-base-content/50">Không có field khớp</li>
            {/each}
            {#if matches.length > suggestions.length}
              <li class="px-2 py-1 text-[10px] text-base-content/45">Còn {matches.length - suggestions.length} field. Gõ để lọc.</li>
            {/if}
          </ul>
        {/if}
      </div>
    {/if}
  </div>
{/if}
