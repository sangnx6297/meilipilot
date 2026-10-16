<script lang="ts">
  import type { Snippet } from 'svelte';
  import CodeBlock from './CodeBlock.svelte';
  import {
    type HitsViewMode,
    splitDocMeta,
    rowId,
    rowLabel,
    rankingMeta,
    hasRankingMeta,
    tableColumns,
    cellPreview,
    cellTitle,
    columnAlign,
    formattedHtml,
    visibleColumns,
    moveColumn,
    loadHitsViewMode,
    saveHitsViewMode,
    loadVisibleFields,
    saveVisibleFields
  } from './hits';

  let {
    rows = [],
    indexUid = '',
    showSelect = false,
    selectedIds = [],
    onToggleSelect,
    onDelete,
    onSimilar,
    split = false,
    leading
  }: {
    rows?: Record<string, unknown>[];
    indexUid?: string;
    showSelect?: boolean;
    selectedIds?: string[];
    onToggleSelect?: (id: string, checked: boolean) => void;
    onDelete?: (id: string) => void;
    onSimilar?: (id: string) => void;
    split?: boolean;
    leading?: Snippet;
  } = $props();

  let mode = $state<HitsViewMode>(loadHitsViewMode());
  let selectedIndex = $state(-1);
  let chosen = $state<string[]>([]);
  let dragFrom = $state<number | null>(null);
  let dragOver = $state<number | null>(null);

  $effect(() => {
    chosen = loadVisibleFields(indexUid);
  });

  $effect(() => {
    void rows;
    selectedIndex = mode === 'table' ? -1 : 0;
  });

  const allCols = $derived(tableColumns(rows));
  const cols = $derived(visibleColumns(allCols, chosen));
  const showActions = $derived(Boolean(onDelete || onSimilar));
  const anyRanking = $derived(rows.some(hasRankingMeta));
  const selectedRow = $derived(rows[selectedIndex] ?? null);
  const fieldCount = $derived(chosen.length === 0 ? allCols.length : cols.length);
  const aligns = $derived(Object.fromEntries(cols.map((col) => [col, columnAlign(rows, col)])));

  function setMode(next: HitsViewMode) {
    mode = next;
    saveHitsViewMode(next);
    selectedIndex = next === 'table' ? -1 : Math.max(selectedIndex, 0);
  }

  function toggle(id: string, checked: boolean) {
    onToggleSelect?.(id, checked);
  }

  function fieldChecked(col: string): boolean {
    return chosen.length === 0 || chosen.includes(col);
  }

  function persistCols(next: string[]) {
    chosen = next;
    saveVisibleFields(indexUid, next);
  }

  function toggleField(col: string, checked: boolean) {
    const base = chosen.length === 0 ? [...allCols] : [...chosen];
    if (!checked && base.length <= 1) return;
    persistCols(checked ? (base.includes(col) ? base : [...base, col]) : base.filter((c) => c !== col));
  }

  function showAllFields() {
    persistCols([]);
  }

  function onColDragStart(e: DragEvent, index: number) {
    dragFrom = index;
    e.dataTransfer?.setData('text/plain', String(index));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
  }

  function onColDragOver(e: DragEvent, index: number) {
    e.preventDefault();
    if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    dragOver = index;
  }

  function onColDrop(e: DragEvent, index: number) {
    e.preventDefault();
    const raw = e.dataTransfer?.getData('text/plain');
    const from = dragFrom ?? (raw === undefined || raw === '' ? NaN : Number(raw));
    persistCols(moveColumn(cols, from, index));
    dragFrom = null;
    dragOver = null;
  }

  function onColDragEnd() {
    dragFrom = null;
    dragOver = null;
  }
</script>

{#snippet highlightOrText(meta: Record<string, unknown>, field: string, value: unknown, pretty = false, compact = false)}
  {@const html = formattedHtml(meta, field)}
  {@const preview = cellPreview(value)}
  {#if html}
    <span
      class="[&_em]:bg-amber-200 [&_em]:not-italic [&_em]:rounded-sm [&_em]:px-0.5 {compact ? 'block truncate' : ''}"
      title={cellTitle(value)}>{@html html}</span>
  {:else if pretty && value !== null && typeof value === 'object'}
    <pre class="text-xs font-mono whitespace-pre-wrap break-all">{JSON.stringify(value, null, 2)}</pre>
  {:else if compact && !preview}
    <span class="hits-grid-empty">—</span>
  {:else}
    <span class={compact ? 'block truncate' : ''} title={cellTitle(value)}>{preview}</span>
  {/if}
{/snippet}

{#snippet metaCard(meta: Record<string, unknown>)}
  <div class="card bg-base-200 shadow-sm">
    <div class="card-body p-3 gap-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Ranking</h3>
      {#each Object.entries(meta) as [k, v]}
        <div class="text-xs">
          <div class="font-mono text-base-content/60 mb-1">{k}</div>
          <CodeBlock value={v} />
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet documentCard(doc: Record<string, unknown>, meta: Record<string, unknown>)}
  <div class="card bg-base-100 shadow-sm border border-base-200">
    <div class="card-body p-3 gap-2">
      <h3 class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Document</h3>
      {#each visibleColumns(Object.keys(doc), chosen) as k}
        <div class="text-sm">
          <div class="text-xs font-mono text-base-content/60">{k}</div>
          {@render highlightOrText(meta, k, doc[k], true)}
        </div>
      {/each}
    </div>
  </div>
{/snippet}

{#snippet rowActions(row: Record<string, unknown>)}
  {@const id = rowId(row)}
  <div class="flex gap-1">
    {#if onSimilar && id}
      <button class="btn btn-ghost btn-xs" onclick={(e) => { e.stopPropagation(); onSimilar(id); }}>Similar</button>
    {/if}
    {#if onDelete && id}
      <button class="btn btn-ghost btn-xs text-error" onclick={(e) => { e.stopPropagation(); onDelete(id); }}>Xóa</button>
    {/if}
  </div>
{/snippet}

<div class={split ? 'hits-pane' : 'min-w-0'}>
<div class="hits-toolbar flex flex-wrap items-center gap-2" class:mb-3={!split}>
  {#if leading}
    <div class="mr-auto flex min-w-0 flex-wrap items-center gap-2">{@render leading()}</div>
  {/if}
  <div class="join">
    <button type="button" class="btn btn-sm join-item" class:btn-active={mode === 'table'} onclick={() => setMode('table')}>Table</button>
    <button type="button" class="btn btn-sm join-item" class:btn-active={mode === 'detail'} onclick={() => setMode('detail')}>Detail</button>
    <button type="button" class="btn btn-sm join-item" class:btn-active={mode === 'json'} onclick={() => setMode('json')}>Pretty JSON</button>
  </div>
  {#if allCols.length}
    <details class="dropdown">
      <summary class="btn btn-sm btn-outline">Fields ({fieldCount})</summary>
      <div class="dropdown-content z-20 bg-base-100 rounded-box shadow-lg p-3 w-56 max-h-72 overflow-auto">
        <button type="button" class="btn btn-ghost btn-xs mb-2" onclick={showAllFields}>Tất cả</button>
        <div class="flex flex-col gap-1">
          {#each allCols as col}
            <label class="label cursor-pointer justify-start gap-2 py-0.5">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={fieldChecked(col)}
                onchange={(e) => toggleField(col, (e.currentTarget as HTMLInputElement).checked)}
              />
              <span class="text-xs font-mono truncate">{col}</span>
            </label>
          {/each}
        </div>
        <p class="text-[10px] text-base-content/50 mt-2">Ẩn/hiện trên UI. Kéo header bảng để đổi thứ tự cột — nhớ theo index.</p>
      </div>
    </details>
  {/if}
</div>

{#if rows.length === 0}
  <p class="hits-body text-sm text-base-content/60">Không có kết quả</p>
{:else if mode === 'table'}
  <div class="hits-grid-wrap hits-body">
    <table class="hits-grid" class:has-check={showSelect}>
      <thead>
        <tr>
          {#if showSelect}<th class="hits-grid-check"></th>{/if}
          <th class="hits-grid-idx">#</th>
          {#each cols as col, i}
            <th
              class={aligns[col] === 'right' ? 'hits-grid-num' : ''}
              class:hits-grid-drag-over={dragOver === i && dragFrom !== i}
              class:hits-grid-dragging={dragFrom === i}
              title="{col} — kéo để đổi vị trí"
              draggable="true"
              ondragstart={(e) => onColDragStart(e, i)}
              ondragover={(e) => onColDragOver(e, i)}
              ondrop={(e) => onColDrop(e, i)}
              ondragend={onColDragEnd}
            >{col}</th>
          {/each}
          {#if anyRanking}<th class="hits-grid-num">score</th>{/if}
          {#if showActions}<th class="hits-grid-actions"></th>{/if}
        </tr>
      </thead>
      <tbody>
        {#each rows as row, i}
          {@const parts = splitDocMeta(row)}
          {@const id = rowId(row)}
          <tr
            class="cursor-pointer"
            class:hits-grid-selected={selectedIndex === i}
            tabindex="0"
            onclick={() => (selectedIndex = i)}
            onkeydown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                selectedIndex = i;
              }
            }}
          >
            {#if showSelect}
              <td class="hits-grid-check">
                {#if id}
                  <input
                    type="checkbox"
                    class="checkbox checkbox-sm"
                    checked={selectedIds.includes(id)}
                    onclick={(e) => e.stopPropagation()}
                    onchange={(e) => toggle(id, (e.currentTarget as HTMLInputElement).checked)}
                  />
                {/if}
              </td>
            {/if}
            <td class="hits-grid-idx">{i + 1}</td>
            {#each cols as col}
              <td class={aligns[col] === 'right' ? 'hits-grid-num' : ''} title={cellTitle(parts.doc[col])}>
                {@render highlightOrText(parts.meta, col, parts.doc[col], false, true)}
              </td>
            {/each}
            {#if anyRanking}
              {@const rank = rankingMeta(row)}
              <td class="hits-grid-num" onclick={(e) => e.stopPropagation()}>
                {#if rank._rankingScore !== undefined}
                  <span title={rank._semanticScore !== undefined ? `semantic ${String(rank._semanticScore)}` : ''}>
                    {String(rank._rankingScore)}
                  </span>
                {:else}
                  <span class="hits-grid-empty">—</span>
                {/if}
              </td>
            {/if}
            {#if showActions}
              <td class="hits-grid-actions">{@render rowActions(row)}</td>
            {/if}
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else if mode === 'detail'}
  <div class="hits-body flex min-h-72 overflow-hidden rounded-box border border-base-300 bg-base-100">
    <ul class="w-[38%] shrink-0 border-r border-base-200 overflow-auto max-h-[32rem]">
      {#each rows as row, i}
        {@const id = rowId(row)}
        <li class="border-b border-base-200 {selectedIndex === i ? 'bg-primary/10' : ''}">
          <div class="flex items-start gap-2 p-2">
            {#if showSelect && id}
              <input
                type="checkbox"
                class="checkbox checkbox-sm mt-0.5"
                checked={selectedIds.includes(id)}
                onchange={(e) => toggle(id, (e.currentTarget as HTMLInputElement).checked)}
              />
            {/if}
            <button type="button" class="min-w-0 flex-1 text-left" onclick={() => (selectedIndex = i)}>
              <div class="text-sm font-medium truncate">{rowLabel(row)}</div>
              {#if id}
                <div class="text-xs text-base-content/50">#{id}</div>
              {/if}
            </button>
          </div>
        </li>
      {/each}
    </ul>
    <div class="flex-1 p-3 overflow-auto max-h-[32rem] space-y-3">
      {#if selectedRow}
        {@const parts = splitDocMeta(selectedRow)}
        {@render documentCard(parts.doc, parts.meta)}
        {#if hasRankingMeta(selectedRow)}
          {@render metaCard(rankingMeta(selectedRow))}
        {/if}
        {@render rowActions(selectedRow)}
      {/if}
    </div>
  </div>
{:else}
  <div class="hits-body space-y-3">
    {#each rows as row}
      {@const parts = splitDocMeta(row)}
      {@const id = rowId(row)}
      <article class="card bg-base-100">
        <div class="card-body p-3 gap-2">
          <div class="flex items-center gap-2">
            {#if showSelect && id}
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={selectedIds.includes(id)}
                onchange={(e) => toggle(id, (e.currentTarget as HTMLInputElement).checked)}
              />
            {/if}
            <div class="text-sm font-medium flex-1">{rowLabel(row)}</div>
            {@render rowActions(row)}
          </div>
          <CodeBlock value={parts.doc} />
          {#if hasRankingMeta(row)}
            <p class="text-xs font-semibold uppercase tracking-wide text-base-content/60">Ranking</p>
            <CodeBlock value={rankingMeta(row)} />
          {/if}
        </div>
      </article>
    {/each}
  </div>
{/if}
</div>
