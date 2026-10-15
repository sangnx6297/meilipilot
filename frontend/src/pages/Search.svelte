<script lang="ts">
  import { onMount } from 'svelte';
  import { listIndexes } from '../lib/api/indexes';
  import { compactSearchQuery, searchIndex, facetSearch, similarDocuments } from '../lib/api/search';
  import { EMPTY_SEARCH_FORM, formToSearchQuery, type SearchFormState } from '../lib/api/search-form';
  import type { SearchQuery, SearchResult } from '../lib/api/types';
  import { rowId } from '../lib/ui/hits';
  import {
    compareHitIds,
    compareSearchRuns,
    loadHistory,
    pushHistory,
    scoresFromHits,
    type SearchHistoryItem
  } from '../lib/ui/search-history';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import IndexContext from '../lib/ui/IndexContext.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import HitsViewer from '../lib/ui/HitsViewer.svelte';
  import CodeBlock from '../lib/ui/CodeBlock.svelte';

  let { uid = '' }: { uid?: string } = $props();
  let indexes = $state<string[]>([]);
  let indexUid = $state('');
  $effect(() => {
    if (uid) indexUid = uid;
  });
  let form = $state<SearchFormState>({ ...EMPTY_SEARCH_FORM });
  let result = $state<SearchResult | null>(null);
  let facetName = $state('');
  let facetQuery = $state('');
  let facetHits = $state<{ value: string; count: number }[]>([]);
  let similarEmbedder = $state('default');
  let error = $state<unknown>(null);
  let lastQuery = $state<SearchQuery | null>(null);
  let history = $state<SearchHistoryItem[]>([]);
  let hitCompare = $state<ReturnType<typeof compareHitIds> | null>(null);
  let snapA = $state('1');
  let snapB = $state('0');
  const ADVANCED_KEY = 'meili.searchAdvanced';
  let advanced = $state(localStorage.getItem(ADVANCED_KEY) === '1');
  const pair = $derived.by(() => {
    const a = history[Number(snapA)];
    const b = history[Number(snapB)];
    if (!a || !b || Number(snapA) === Number(snapB)) return null;
    return compareSearchRuns(a, b);
  });

  function setAdvanced(on: boolean) {
    advanced = on;
    localStorage.setItem(ADVANCED_KEY, on ? '1' : '0');
  }

  $effect(() => {
    if (indexUid) history = loadHistory(indexUid);
  });

  onMount(async () => {
    const page = await listIndexes(0, 100);
    indexes = page.results.map((i) => i.uid);
    if (!indexUid && indexes[0]) indexUid = indexes[0];
  });

  async function run() {
    if (!indexUid) return;
    error = null;
    try {
      const query = compactSearchQuery({ ...formToSearchQuery(form), showRankingScore: true });
      lastQuery = query;
      result = await searchIndex(indexUid, query);
      const ids = result.hits.map(rowId).filter(Boolean);
      const prev = history[0];
      history = pushHistory({
        indexUid,
        form: $state.snapshot(form),
        query,
        processingTimeMs: result.processingTimeMs,
        hitCount: result.estimatedTotalHits ?? result.totalHits ?? result.hits.length,
        hitIds: ids,
        hitScores: scoresFromHits(result.hits)
      });
      hitCompare = prev ? compareHitIds(prev.hitIds ?? [], ids) : null;
      snapB = '0';
      snapA = history.length > 1 ? '1' : '0';
    } catch (e) {
      error = e;
    }
  }

  function restore(item: SearchHistoryItem) {
    form = { ...EMPTY_SEARCH_FORM, ...item.form };
  }

  function onCardKey(e: KeyboardEvent) {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      void run();
    }
  }

  async function runFacet() {
    if (!indexUid) return;
    error = null;
    try {
      const r = await facetSearch(indexUid, {
        facetName,
        facetQuery,
        q: form.q,
        filter: form.filter || undefined
      });
      facetHits = r.facetHits;
    } catch (e) {
      error = e;
    }
  }

  async function similar(id: string) {
    error = null;
    try {
      result = await similarDocuments(indexUid, {
        id,
        embedder: similarEmbedder,
        limit: 10,
        showRankingScore: true
      });
    } catch (e) {
      error = e;
    }
  }

  function applyFacet(attr: string, value: string) {
    form.filter = form.filter ? `${form.filter} AND ${attr} = "${value}"` : `${attr} = "${value}"`;
    void run();
  }
</script>

<PageHeader title="Search" hint="POST /indexes/{'{uid}'}/search — Ctrl+Enter" />
{#if uid}
  <IndexContext {uid} active="search" />
{/if}
<ErrorBanner {error} />
<form class="card bg-base-100 mb-4" onkeydown={onCardKey} onsubmit={(e) => { e.preventDefault(); void run(); }}>
  <div class="card-body p-4 gap-3">
    <div class="flex min-w-0 items-center gap-2">
      <select class="select select-bordered select-sm w-44 shrink-0" bind:value={indexUid} title="index uid">
        {#if !indexes.length}<option value="">— chọn index —</option>{/if}
        {#each indexes as i}<option value={i}>{i}</option>{/each}
      </select>
      <input
        class="input input-bordered input-sm min-w-0 flex-1"
        placeholder="Từ khóa tìm kiếm (q)"
        bind:value={form.q}
        onkeydown={(e) => e.key === 'Enter' && run()}
      />
      <button class="btn btn-primary btn-sm shrink-0" type="submit" title="Ctrl+Enter">Search</button>
      <label class="flex shrink-0 cursor-pointer items-center gap-2 select-none">
        <span class="text-sm">Advanced</span>
        <input
          type="checkbox"
          role="switch"
          class="toggle toggle-sm toggle-primary"
          checked={advanced}
          aria-label="Advanced"
          onchange={(e) => setAdvanced((e.currentTarget as HTMLInputElement).checked)}
        />
      </label>
    </div>

    {#if advanced}
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
      <label class="form-control">
        <span class="label py-1"><span class="label-text text-xs font-mono">filter</span></span>
        <input class="input input-bordered input-sm" placeholder='genres = action AND year > 2000' bind:value={form.filter} />
      </label>
      <label class="form-control">
        <span class="label py-1"><span class="label-text text-xs font-mono">sort</span><span class="label-text-alt text-[10px]">attr:asc, attr:desc</span></span>
        <input class="input input-bordered input-sm" placeholder="year:desc" bind:value={form.sort} />
      </label>
      <label class="form-control">
        <span class="label py-1"><span class="label-text text-xs font-mono">facets</span></span>
        <input class="input input-bordered input-sm" placeholder="genres, year" bind:value={form.facets} />
      </label>
      <label class="form-control">
        <span class="label py-1"><span class="label-text text-xs font-mono">matchingStrategy</span></span>
        <select class="select select-bordered select-sm" bind:value={form.matchingStrategy}>
          <option value="">(default)</option>
          <option value="last">last</option>
          <option value="all">all</option>
          <option value="frequency">frequency</option>
        </select>
      </label>
    </div>

    <details class="bg-base-200/60 rounded-box">
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium">Pagination — offset, limit, page, hitsPerPage</summary>
      <div class="grid grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-2 lg:grid-cols-4">
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">offset</span></span>
          <input class="input input-bordered input-sm" bind:value={form.offset} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">limit</span></span>
          <input class="input input-bordered input-sm" bind:value={form.limit} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">page</span><span class="label-text-alt text-[10px]">1-indexed</span></span>
          <input class="input input-bordered input-sm" placeholder="bỏ trống = dùng offset" bind:value={form.page} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">hitsPerPage</span></span>
          <input class="input input-bordered input-sm" placeholder="kèm page" bind:value={form.hitsPerPage} />
        </label>
      </div>
    </details>

    <details class="bg-base-200/60 rounded-box">
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium">Retrieve — attributesToRetrieve, attributesToSearchOn, distinct, locales</summary>
      <div class="grid grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-2">
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">attributesToRetrieve</span></span>
          <input class="input input-bordered input-sm" placeholder="*, id, title" bind:value={form.attributesToRetrieve} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">attributesToSearchOn</span></span>
          <input class="input input-bordered input-sm" placeholder="title, overview" bind:value={form.attributesToSearchOn} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">distinct</span></span>
          <input class="input input-bordered input-sm" placeholder="product_id" bind:value={form.distinct} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">locales</span></span>
          <input class="input input-bordered input-sm" placeholder="en, vi" bind:value={form.locales} />
        </label>
      </div>
    </details>

    <details class="bg-base-200/60 rounded-box">
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium">Highlight & crop — highlight, crop, showMatchesPosition</summary>
      <div class="grid grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-2">
        <label class="label cursor-pointer justify-start gap-2 sm:col-span-2">
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.highlightAll} />
          <span class="text-sm">highlightAll → attributesToHighlight ["*"] nếu để trống field bên dưới</span>
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">attributesToHighlight</span></span>
          <input class="input input-bordered input-sm" placeholder="title, overview" bind:value={form.attributesToHighlight} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">attributesToCrop</span></span>
          <input class="input input-bordered input-sm" placeholder="overview" bind:value={form.attributesToCrop} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">highlightPreTag</span></span>
          <input class="input input-bordered input-sm" placeholder="<em>" bind:value={form.highlightPreTag} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">highlightPostTag</span></span>
          <input class="input input-bordered input-sm" placeholder="</em>" bind:value={form.highlightPostTag} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">cropLength</span></span>
          <input class="input input-bordered input-sm" placeholder="10" bind:value={form.cropLength} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">cropMarker</span></span>
          <input class="input input-bordered input-sm" placeholder="…" bind:value={form.cropMarker} />
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.showMatchesPosition} />
          <span class="text-sm font-mono">showMatchesPosition</span>
        </label>
      </div>
    </details>

    <details class="bg-base-200/60 rounded-box">
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium">Ranking & debug — score, threshold, performanceDetails</summary>
      <div class="grid grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-2">
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.showRankingScore} />
          <span class="text-sm font-mono">showRankingScore</span>
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.showRankingScoreDetails} disabled={!form.showRankingScore} />
          <span class="text-sm font-mono">showRankingScoreDetails</span>
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">rankingScoreThreshold</span><span class="label-text-alt text-[10px]">0.0–1.0</span></span>
          <input class="input input-bordered input-sm" placeholder="0.5" bind:value={form.rankingScoreThreshold} />
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.showPerformanceDetails} />
          <span class="text-sm font-mono">showPerformanceDetails</span>
        </label>
      </div>
    </details>

    <details class="bg-base-200/60 rounded-box">
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium">Hybrid / vector / media</summary>
      <div class="grid grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-2">
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">hybrid.embedder</span></span>
          <input class="input input-bordered input-sm" placeholder="default" bind:value={form.hybridEmbedder} />
        </label>
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">hybrid.semanticRatio</span><span class="label-text-alt text-[10px]">0 keyword · 1 semantic</span></span>
          <input class="input input-bordered input-sm" placeholder="0.5" bind:value={form.hybridSemanticRatio} />
        </label>
        <label class="form-control sm:col-span-2">
          <span class="label py-1"><span class="label-text text-xs font-mono">vector</span></span>
          <input class="input input-bordered input-sm" placeholder="0.1, 0.2, 0.3" bind:value={form.vector} />
        </label>
        <label class="label cursor-pointer justify-start gap-2">
          <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.retrieveVectors} />
          <span class="text-sm font-mono">retrieveVectors</span>
        </label>
        <label class="form-control sm:col-span-2">
          <span class="label py-1"><span class="label-text text-xs font-mono">media</span><span class="label-text-alt text-[10px]">JSON object, POST only</span></span>
          <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="3" placeholder={'{ "image": { "url": "..." } }'} bind:value={form.mediaJson}></textarea>
        </label>
      </div>
    </details>

    <details class="bg-base-200/60 rounded-box">
      <summary class="cursor-pointer px-3 py-2 text-sm font-medium">Network / personalize / inlineRule</summary>
      <div class="grid grid-cols-1 gap-3 p-3 pt-0 sm:grid-cols-2">
        <label class="form-control">
          <span class="label py-1"><span class="label-text text-xs font-mono">useNetwork</span></span>
          <select class="select select-bordered select-sm" bind:value={form.useNetwork}>
            <option value="">(default)</option>
            <option value="true">true</option>
            <option value="false">false</option>
          </select>
        </label>
        <label class="form-control sm:col-span-2">
          <span class="label py-1"><span class="label-text text-xs font-mono">personalize.userContext</span></span>
          <textarea class="textarea textarea-bordered textarea-sm" rows="2" placeholder="likes action movies" bind:value={form.personalizeUserContext}></textarea>
        </label>
        <label class="form-control sm:col-span-2">
          <span class="label py-1"><span class="label-text text-xs font-mono">inlineRule</span><span class="label-text-alt text-[10px]">JSON object, experimental</span></span>
          <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="4" placeholder={'{ "uid": "...", "actions": [] }'} bind:value={form.inlineRuleJson}></textarea>
        </label>
      </div>
    </details>
    {/if}
  </div>
</form>

{#if result}
  <p class="text-xs text-base-content/60 mb-2">
    {result.estimatedTotalHits ?? result.totalHits} hits
    {#if result.page != null} · page {result.page}{#if result.totalPages != null}/{result.totalPages}{/if}{/if}
    {#if result.hitsPerPage != null} · hitsPerPage {result.hitsPerPage}{/if}
    {#if result.offset != null} · offset {result.offset}{/if}
    {#if result.limit != null} · limit {result.limit}{/if}
    · {result.processingTimeMs}ms
  </p>
  {#if hitCompare}
    <p class="text-xs mb-2">
      So với lần trước:
      {#if hitCompare.orderChanged}<span class="status-chip status-chip-processing">order đổi</span>{:else}<span class="status-chip status-chip-canceled">order giữ</span>{/if}
      {#if hitCompare.onlyA.length} · mất {hitCompare.onlyA.join(', ')}{/if}
      {#if hitCompare.onlyB.length} · thêm {hitCompare.onlyB.join(', ')}{/if}
    </p>
  {/if}
  {#if lastQuery}
    <details class="bg-base-100 rounded-box shadow-sm mb-3">
      <summary class="cursor-pointer px-3 py-2 text-xs font-medium">Raw request</summary>
      <div class="p-3 pt-0"><CodeBlock value={lastQuery} /></div>
    </details>
    <details class="bg-base-100 rounded-box shadow-sm mb-3">
      <summary class="cursor-pointer px-3 py-2 text-xs font-medium">Raw response</summary>
      <div class="p-3 pt-0"><CodeBlock value={result} /></div>
    </details>
  {/if}
  {#if result.facetDistribution}
    <div class="flex flex-wrap gap-3 text-xs mb-3">
      {#each Object.entries(result.facetDistribution) as [attr, vals]}
        <div class="bg-base-100 rounded-box p-3 shadow-sm">
          <div class="font-medium mb-1">{attr}</div>
          {#each Object.entries(vals) as [v, c]}
            <button class="link link-hover block" onclick={() => applyFacet(attr, v)}>{v} ({c})</button>
          {/each}
        </div>
      {/each}
    </div>
  {/if}
  {#if result.facetStats}
    <div class="flex flex-wrap gap-3 text-xs mb-3">
      {#each Object.entries(result.facetStats) as [attr, stats]}
        <div class="bg-base-100 rounded-box p-3 shadow-sm">
          <div class="font-medium mb-1">{attr} stats</div>
          <div>min {stats.min} · max {stats.max}</div>
        </div>
      {/each}
    </div>
  {/if}
  {#if result.performanceDetails}
    <details class="bg-base-100 rounded-box shadow-sm mb-3">
      <summary class="cursor-pointer px-3 py-2 text-xs font-medium">performanceDetails</summary>
      <div class="p-3 pt-0">
        <CodeBlock value={result.performanceDetails} />
      </div>
    </details>
  {/if}
  {#if history.length > 1}
    <div class="card bg-base-100 shadow-sm mb-4">
      <div class="card-body p-4 gap-3">
        <h2 class="text-sm font-semibold">Debugger — so sánh 2 snapshot</h2>
        <p class="text-xs text-base-content/55">Chọn hai lần chạy. Bảng so rank, rankingScore từng doc, latency.</p>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <label class="form-control">
            <span class="mb-1 text-xs text-base-content/60">Run A</span>
            <select class="select select-bordered select-sm w-full" bind:value={snapA}>
              {#each history as item, i}
                <option value={String(i)}>{new Date(item.at).toLocaleTimeString()} · q={item.query.q ?? ''} · {item.processingTimeMs ?? '—'}ms</option>
              {/each}
            </select>
          </label>
          <label class="form-control">
            <span class="mb-1 text-xs text-base-content/60">Run B</span>
            <select class="select select-bordered select-sm w-full" bind:value={snapB}>
              {#each history as item, i}
                <option value={String(i)}>{new Date(item.at).toLocaleTimeString()} · q={item.query.q ?? ''} · {item.processingTimeMs ?? '—'}ms</option>
              {/each}
            </select>
          </label>
        </div>
        {#if pair}
          <p class="text-xs text-base-content/60">
            Latency A {pair.latencyA ?? '—'}ms → B {pair.latencyB ?? '—'}ms
            {#if pair.latencyDelta != null}
              · Δ {pair.latencyDelta > 0 ? '+' : ''}{pair.latencyDelta}ms
            {/if}
            ·
            {#if pair.ids.orderChanged}<span class="status-chip status-chip-processing">order đổi</span>{:else}<span class="status-chip status-chip-canceled">order giữ</span>{/if}
            {#if pair.ids.onlyA.length} · mất {pair.ids.onlyA.join(', ')}{/if}
            {#if pair.ids.onlyB.length} · thêm {pair.ids.onlyB.join(', ')}{/if}
          </p>
          <div class="overflow-x-auto rounded-box border border-base-300">
            <table class="table table-sm">
              <thead>
                <tr>
                  <th>id</th>
                  <th class="text-right">Rank A</th>
                  <th class="text-right">Rank B</th>
                  <th class="text-right">Δ rank</th>
                  <th class="text-right">Score A</th>
                  <th class="text-right">Score B</th>
                  <th class="text-right">Δ score</th>
                </tr>
              </thead>
              <tbody>
                {#each pair.docs as row}
                  <tr>
                    <td class="font-mono text-xs">{row.id}</td>
                    <td class="text-right tabular-nums">{row.rankA ?? '—'}</td>
                    <td class="text-right tabular-nums">{row.rankB ?? '—'}</td>
                    <td class="text-right tabular-nums" class:text-error={row.rankDelta != null && row.rankDelta > 0} class:text-success={row.rankDelta != null && row.rankDelta < 0}>
                      {row.rankDelta == null ? '—' : row.rankDelta > 0 ? `+${row.rankDelta}` : row.rankDelta}
                    </td>
                    <td class="text-right tabular-nums font-mono text-xs">{row.scoreA == null ? '—' : row.scoreA.toFixed(4)}</td>
                    <td class="text-right tabular-nums font-mono text-xs">{row.scoreB == null ? '—' : row.scoreB.toFixed(4)}</td>
                    <td class="text-right tabular-nums font-mono text-xs" class:text-success={row.scoreDelta != null && row.scoreDelta > 0} class:text-error={row.scoreDelta != null && row.scoreDelta < 0}>
                      {row.scoreDelta == null ? '—' : `${row.scoreDelta > 0 ? '+' : ''}${row.scoreDelta.toFixed(4)}`}
                    </td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
        {:else}
          <p class="text-xs text-base-content/50">Chọn hai run khác nhau (cần ít nhất 2 lần Search).</p>
        {/if}
      </div>
    </div>
  {/if}
  <HitsViewer rows={result.hits} indexUid={indexUid} onSimilar={similar} />
{/if}

{#if history.length}
  <div class="card bg-base-100 shadow-sm mt-4">
    <div class="card-body p-4 gap-3">
      <h2 class="text-sm font-medium">Query history (máy local)</h2>
      <ul class="text-xs space-y-1 max-h-48 overflow-auto">
        {#each history as item}
          <li>
            <button class="link link-hover" onclick={() => restore(item)}>
              {new Date(item.at).toLocaleTimeString()} · q={item.query.q ?? ''} · {item.hitCount ?? 0} hits · {item.processingTimeMs ?? '—'}ms
            </button>
          </li>
        {/each}
      </ul>
    </div>
  </div>
{/if}

{#if advanced}
<div class="card bg-base-100 mt-4">
  <div class="card-body p-4">
    <div class="flex min-w-0 flex-wrap gap-2 text-sm">
      <input class="input input-bordered input-sm min-w-0 flex-1" placeholder="facetName" bind:value={facetName} />
      <input class="input input-bordered input-sm min-w-0 flex-1" placeholder="facetQuery" bind:value={facetQuery} />
      <button class="btn btn-outline btn-sm shrink-0" onclick={runFacet}>Facet search</button>
      <input class="input input-bordered input-sm w-40 shrink-0" placeholder="embedder (similar)" bind:value={similarEmbedder} />
    </div>
    <ul class="text-sm mt-2">
      {#each facetHits as h}<li>{h.value} ({h.count})</li>{/each}
    </ul>
  </div>
</div>
{/if}
