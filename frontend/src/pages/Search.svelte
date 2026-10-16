<script lang="ts">
  import { onMount } from 'svelte';
  import { getIndex, getIndexStats, listIndexes, listIndexFields } from '../lib/api/indexes';
  import { asFieldPage, type IndexField } from '../lib/api/index-fields';
  import { getSettings } from '../lib/api/settings';
  import { MeiliError } from '../lib/api/client';
  import { compactSearchQuery, searchIndex, facetSearch, similarDocuments } from '../lib/api/search';
  import { flagOn } from '../lib/api/capability';
  import { EMPTY_SEARCH_FORM, formToSearchQuery, parseSearchBody, queryToForm, type SearchFormState } from '../lib/api/search-form';
  import {
    appendFilter,
    appendSort,
    buildSearchCatalog,
    facetsForQuery,
    fieldsFromFallback,
    filterClause,
    opsForField,
    toggleFilter,
    type FilterOp
  } from '../lib/api/search-fields';
  import { SEARCH_TAB_LABELS, searchTabs, type SearchTab } from '../lib/api/search-layout';
  import { mediaFromImageFile, mediaJsonFromImageUrl, splitDataUrl } from '../lib/experimental';
  import { shellReader } from '../lib/ui/shell-context';
  import FieldChips from '../lib/ui/FieldChips.svelte';
  import JsonEditor from '../lib/ui/JsonEditor.svelte';
  import type { SearchQuery, SearchResult } from '../lib/api/types';
  import {
    compareHitIds,
    compareSearchRuns,
    findSnapshot,
    loadHistory,
    loadLastIndex,
    loadSearchDraft,
    pushHistory,
    saveLastIndex,
    saveSearchDraft,
    snapshotKey,
    snapsFromHits,
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
  let snapA = $state('');
  let snapB = $state('');
  let primaryKey = $state<string | null>(null);
  let snapIndex = '';
  let draftIndex = '';
  let fieldsReadyFor = '';
  let appliedTabFor = '';
  let mode = $state<'form' | 'json'>('form');
  let tab = $state<SearchTab>('filter');
  let showRequest = $state(false);
  let showResponse = $state(false);
  let showCompare = $state(false);
  let jsonText = $state('');
  let jsonError = $state('');
  let indexFields = $state<IndexField[]>([]);
  let embedderNames = $state<string[]>([]);
  let fieldSource = $state('');
  let filterAttr = $state('');
  let filterOp = $state<FilterOp>('=');
  let filterValue = $state('');
  let filterValueTo = $state('');
  let filterJoin = $state<'AND' | 'OR'>('AND');
  let sortAttr = $state('');
  let sortOrder = $state<'asc' | 'desc'>('asc');
  let imageUrl = $state('');
  let facetPane = $state<HTMLDivElement | null>(null);
  let facetJump = $state('');
  const catalog = $derived(buildSearchCatalog(indexFields));
  const readShell = shellReader();
  const shell = $derived(readShell());
  const activeFilterField = $derived(catalog.filterable.find((field) => field.name === filterAttr));
  const filterOps = $derived(opsForField(activeFilterField, flagOn(shell.caps, 'containsFilter')));
  const filterNeedsValue = $derived(
    !['EXISTS', 'NOT EXISTS', 'IS NULL', 'IS NOT NULL', 'IS EMPTY', 'IS NOT EMPTY'].includes(filterOp)
  );
  const tabs = $derived(
    searchTabs({
      filterable: catalog.filterable.length,
      sortable: catalog.sortable.length,
      facets: catalog.facets.length,
      retrieve: catalog.retrieve.length,
      searchOn: catalog.searchOn.length,
      locales: catalog.locales.length,
      embedders: embedderNames.length,
      media: flagOn(shell.caps, 'multimodal'),
      filterText: form.filter,
      sortText: form.sort,
      facetText: form.facets,
      distinctText: form.distinct,
      localeText: form.locales,
      retrieveText: form.attributesToRetrieve,
      searchOnText: form.attributesToSearchOn,
      embedderText: form.hybridEmbedder,
      mediaText: form.mediaJson
    })
  );
  const pair = $derived.by(() => {
    const a = findSnapshot(history, snapA);
    const b = findSnapshot(history, snapB);
    if (!a || !b || a === b) return null;
    return compareSearchRuns(a, b);
  });

  function selectSnapshots(items: SearchHistoryItem[]) {
    snapB = items[0] ? snapshotKey(items[0], 0) : '';
    snapA = items[1] ? snapshotKey(items[1], 1) : snapB;
  }

  $effect(() => {
    if (!indexUid || fieldsReadyFor !== indexUid) return;
    if (appliedTabFor !== indexUid) {
      appliedTabFor = indexUid;
      const savedTab = loadSearchDraft(shell.session?.id ?? '', indexUid)?.panel.tab;
      if (savedTab && tabs.includes(savedTab)) {
        tab = savedTab;
        return;
      }
    }
    if (!tabs.includes(tab) && tabs[0]) tab = tabs[0];
  });

  function setMode(next: 'form' | 'json') {
    if (next === mode) return;
    if (next === 'json') {
      try {
        jsonText = JSON.stringify(formToSearchQuery(form), null, 2);
        jsonError = '';
        mode = 'json';
      } catch (e) {
        error = e;
      }
      return;
    }
    try {
      form = { ...EMPTY_SEARCH_FORM, ...queryToForm(parseSearchBody(jsonText)) };
      jsonError = '';
      mode = 'form';
    } catch (e) {
      jsonError = e instanceof Error ? e.message : 'JSON không hợp lệ';
    }
  }

  function applyFilterRow() {
    const clause = filterClause({ attr: filterAttr, op: filterOp, value: filterValue, valueTo: filterValueTo });
    form.filter = appendFilter(form.filter, clause, filterJoin);
  }

  $effect(() => {
    if (!filterOps.includes(filterOp)) filterOp = filterOps[0] ?? '=';
  });

  $effect(() => {
    const current = indexUid;
    if (!current) return;
    fieldsReadyFor = '';
    let stale = false;
    void (async () => {
      const [fieldsResult, settingsResult, statsResult, indexResult] = await Promise.allSettled([
        (async () => {
          const collected: IndexField[] = [];
          let offset = 0;
          for (let page = 0; page < 10; page += 1) {
            const chunk = asFieldPage(await listIndexFields(current, offset, 200));
            collected.push(...chunk.results);
            if (!chunk.results.length || collected.length >= chunk.total) break;
            offset += chunk.results.length;
          }
          return collected;
        })(),
        getSettings(current),
        getIndexStats(current),
        getIndex(current)
      ]);
      if (stale) return;
      primaryKey = indexResult.status === 'fulfilled' ? indexResult.value.primaryKey : null;
      const settings = settingsResult.status === 'fulfilled' ? settingsResult.value : null;
      embedderNames = settings?.embedders ? Object.keys(settings.embedders) : [];
      if (fieldsResult.status === 'fulfilled' && fieldsResult.value.length) {
        indexFields = fieldsResult.value;
        fieldSource = 'fields';
        fieldsReadyFor = current;
        return;
      }
      const names = statsResult.status === 'fulfilled' ? Object.keys(statsResult.value.fieldDistribution ?? {}) : [];
      indexFields = fieldsFromFallback(names, settings);
      fieldSource = indexFields.length ? 'stats' : '';
      fieldsReadyFor = current;
    })();
    return () => {
      stale = true;
    };
  });

  $effect(() => {
    const profileId = shell.session?.id ?? '';
    const current = indexUid;
    if (!profileId || !current) return;
    saveLastIndex(profileId, current);
  });

  $effect(() => {
    const profileId = shell.session?.id ?? '';
    const current = indexUid;
    if (!profileId || !current || draftIndex !== current) return;
    saveSearchDraft(profileId, current, {
      mode,
      form: { ...form },
      jsonText,
      panel: { tab, sortAttr, sortOrder, filterAttr, filterOp, filterValue, filterValueTo, filterJoin }
    });
  });

  $effect(() => {
    const profileId = shell.session?.id ?? '';
    const current = indexUid;
    if (!profileId || !current || draftIndex === current) return;
    const previous = draftIndex;
    draftIndex = current;
    const saved = loadSearchDraft(profileId, current);
    if (saved) {
      form = saved.form;
      mode = saved.mode;
      jsonText = saved.jsonText;
      tab = saved.panel.tab;
      sortAttr = saved.panel.sortAttr;
      sortOrder = saved.panel.sortOrder;
      filterAttr = saved.panel.filterAttr;
      filterOp = saved.panel.filterOp;
      filterValue = saved.panel.filterValue;
      filterValueTo = saved.panel.filterValueTo;
      filterJoin = saved.panel.filterJoin;
      jsonError = '';
      return;
    }
    if (!previous) return;
    form = { ...EMPTY_SEARCH_FORM };
    mode = 'form';
    jsonText = '';
    tab = 'filter';
    sortAttr = '';
    sortOrder = 'asc';
    filterAttr = '';
    filterOp = '=';
    filterValue = '';
    filterValueTo = '';
    filterJoin = 'AND';
    jsonError = '';
  });

  $effect(() => {
    const uid = indexUid;
    if (!uid) return;
    const items = loadHistory(uid);
    history = items;
    if (snapIndex === uid) return;
    snapIndex = uid;
    selectSnapshots(items);
  });

  onMount(async () => {
    const page = await listIndexes(0, 100);
    indexes = page.results.map((i) => i.uid);
    if (indexUid) return;
    const remembered = loadLastIndex(shell.session?.id ?? '');
    if (remembered && indexes.includes(remembered)) {
      indexUid = remembered;
      return;
    }
    if (indexes[0]) indexUid = indexes[0];
  });

  async function run() {
    if (!indexUid) {
      error = new Error('Chưa chọn index');
      return;
    }
    error = null;
    try {
      const query = compactSearchQuery(mode === 'json' ? parseSearchBody(jsonText) : formToSearchQuery(form));
      if (mode === 'form') query.facets = facetsForQuery(query.facets, catalog.facets);
      if (mode === 'json') form = { ...EMPTY_SEARCH_FORM, ...queryToForm(query) };
      let response;
      try {
        response = await searchIndex(indexUid, query);
      } catch (e) {
        const facetFailed = e instanceof MeiliError && e.code.toLowerCase().includes('facet') && !!query.facets?.length;
        if (!facetFailed) throw e;
        delete query.facets;
        response = await searchIndex(indexUid, query);
      }
      lastQuery = query;
      result = response;
      try {
        const snaps = snapsFromHits(response.hits ?? [], primaryKey);
        const prev = history[0];
        history = pushHistory({
          indexUid,
          form: $state.snapshot(form),
          query,
          processingTimeMs: response.processingTimeMs,
          hitCount: response.estimatedTotalHits ?? response.totalHits ?? response.hits.length,
          ...snaps
        });
        hitCompare = prev ? compareHitIds(prev.hitIds ?? [], snaps.hitIds ?? []) : null;
        selectSnapshots(history);
      } catch {
        // Kết quả search vẫn giữ khi không lưu được snapshot.
      }
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

  function facetClause(attr: string, value: string): string {
    return filterClause({ attr, op: '=', value, valueTo: '' });
  }

  function jumpFacet(name: string) {
    facetJump = name;
    const root = facetPane;
    const target = root?.querySelector(`[data-facet="${CSS.escape(name)}"]`);
    if (!root || !(target instanceof HTMLElement)) return;
    const top = target.getBoundingClientRect().top - root.getBoundingClientRect().top + root.scrollTop;
    root.scrollTo({ top: Math.max(0, top - 4), behavior: 'smooth' });
  }

  function applyFacet(attr: string, value: string) {
    const clause = facetClause(attr, value);
    if (!clause) return;
    form.filter = toggleFilter(form.filter, clause);
    void run();
  }
</script>

<PageHeader title="Search" hint="Chỉ hiện phần index đã cấu hình. Ctrl+Enter" />
{#if uid}
  <IndexContext {uid} active="search" />
{/if}
<ErrorBanner {error} />
<form class="card bg-base-100 mb-4 shadow-sm" onkeydown={onCardKey} onsubmit={(e) => { e.preventDefault(); void run(); }}>
  <div class="card-body gap-3 p-4">
    <div class="flex min-w-0 flex-wrap items-end gap-2">
      <select class="select select-bordered select-sm w-44 shrink-0" bind:value={indexUid} title="index uid">
        {#if !indexes.length}<option value="">— chọn index —</option>{/if}
        {#each indexes as i}<option value={i}>{i}</option>{/each}
      </select>
      {#if mode === 'form'}
        <div class="flex min-w-0 flex-1 flex-col gap-1">
          <div class="flex flex-wrap items-center gap-x-4 gap-y-1">
            <label class="flex cursor-pointer items-center gap-1.5 text-xs text-base-content">
              <input type="checkbox" class="checkbox checkbox-xs" bind:checked={form.showRankingScore} />
              showRankingScore
            </label>
            <label class="flex cursor-pointer items-center gap-1.5 text-xs text-base-content {form.showRankingScore ? '' : 'opacity-50'}">
              <input type="checkbox" class="checkbox checkbox-xs" bind:checked={form.showRankingScoreDetails} disabled={!form.showRankingScore} />
              showRankingScoreDetails
            </label>
          </div>
          <input class="input input-bordered input-sm min-w-0" placeholder="Từ khóa tìm kiếm" bind:value={form.q} onkeydown={(e) => e.key === 'Enter' && run()} />
        </div>
      {/if}
      <div class="join shrink-0">
        <button class="btn btn-sm join-item {mode === 'form' ? 'btn-primary' : 'btn-ghost'}" type="button" onclick={() => setMode('form')}>Form</button>
        <button class="btn btn-sm join-item {mode === 'json' ? 'btn-primary' : 'btn-ghost'}" type="button" onclick={() => setMode('json')}>JSON</button>
      </div>
    </div>

    {#if mode === 'json'}
      <p class="text-xs text-base-content/55">Body POST /indexes/{indexUid || '{uid}'}/search. Field lạ bị bỏ khi search.</p>
      <JsonEditor value={jsonText} rows={16} onchange={(text) => { jsonText = text; jsonError = ''; }} />
      {#if jsonError}<p class="text-error text-xs">{jsonError}</p>{/if}
    {:else}
      <div role="tablist" class="tabs tabs-box tabs-sm w-fit max-w-full flex-wrap">
        {#each tabs as id (id)}
          <button class="tab" class:tab-active={tab === id} type="button" role="tab" onclick={() => (tab = id)}>{SEARCH_TAB_LABELS[id]}</button>
        {/each}
      </div>

      <div class="rounded-box bg-base-200/40 p-3">
        {#if tab === 'filter'}
          <div class="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {#if catalog.filterable.length || form.filter.trim()}
              <div class="flex flex-col gap-2 lg:col-span-2">
                <p class="text-xs font-medium">Filter</p>
                <div class="flex flex-wrap items-end gap-1">
                  <input class="input input-bordered input-sm w-40" list="search-filter-fields" placeholder="field" bind:value={filterAttr} />
                  <datalist id="search-filter-fields">
                    {#each catalog.filterable as field}<option value={field.name}></option>{/each}
                  </datalist>
                  <select class="select select-bordered select-sm w-36" bind:value={filterOp}>
                    {#each filterOps as op}<option value={op}>{op}</option>{/each}
                  </select>
                  {#if filterNeedsValue}
                    <input class="input input-bordered input-sm min-w-32 flex-1" placeholder={filterOp === 'IN' ? 'a, b' : 'giá trị'} bind:value={filterValue} />
                  {/if}
                  {#if filterOp === 'TO'}
                    <input class="input input-bordered input-sm w-28" placeholder="đến" bind:value={filterValueTo} />
                  {/if}
                  <select class="select select-bordered select-sm w-20" bind:value={filterJoin}>
                    <option value="AND">AND</option>
                    <option value="OR">OR</option>
                  </select>
                  <button class="btn btn-outline btn-sm" type="button" onclick={applyFilterRow}>Thêm</button>
                </div>
                <input class="input input-bordered input-sm" placeholder='genres = "action" AND year >= 2000' bind:value={form.filter} />
              </div>
            {/if}
            {#if catalog.sortable.length || form.sort.trim()}
              <div class="flex flex-col gap-2">
                <p class="text-xs font-medium">Sort</p>
                <div class="flex min-w-0 items-center gap-1">
                  <select class="select select-bordered select-sm min-w-0 flex-1" bind:value={sortAttr}>
                    <option value="">Chọn field</option>
                    {#each catalog.sortable as name (name)}
                      <option value={name}>{name}</option>
                    {/each}
                    {#if sortAttr && !catalog.sortable.includes(sortAttr)}
                      <option value={sortAttr}>{sortAttr}</option>
                    {/if}
                  </select>
                  <select class="select select-bordered select-sm w-24 shrink-0" bind:value={sortOrder}>
                    <option value="asc">asc</option>
                    <option value="desc">desc</option>
                  </select>
                  <button class="btn btn-outline btn-sm shrink-0" type="button" disabled={!sortAttr.trim()} onclick={() => (form.sort = appendSort(form.sort, sortAttr, sortOrder))}>Thêm</button>
                </div>
                <input class="input input-bordered input-sm" placeholder="year:desc" bind:value={form.sort} />
              </div>
            {/if}
          </div>
        {:else if tab === 'facet'}
          <div class="flex flex-col gap-3">
            <div>
              <p class="mb-1 text-xs font-medium">Facet trong setting</p>
              <p class="mb-2 text-[11px] text-base-content/50">Để trống thì search gửi mọi facet filterable. Bấm giá trị ở cột kết quả để lọc.</p>
              <FieldChips names={catalog.facets} value={form.facets} onchange={(value) => (form.facets = value)} />
              <input class="input input-bordered input-sm mt-2 w-full" placeholder="trống = mọi facet" bind:value={form.facets} />
            </div>
            <div class="border-t border-base-300 pt-3">
              <p class="mb-2 text-xs font-medium">Facet search</p>
              <div class="flex min-w-0 flex-wrap gap-2">
                <input class="input input-bordered input-sm min-w-0 flex-1" list="search-facet-names" placeholder="facetName" bind:value={facetName} />
                <datalist id="search-facet-names">
                  {#each catalog.facets as name}<option value={name}></option>{/each}
                </datalist>
                <input class="input input-bordered input-sm min-w-0 flex-1" placeholder="facetQuery" bind:value={facetQuery} />
                <button class="btn btn-outline btn-sm shrink-0" type="button" onclick={runFacet}>Tìm giá trị</button>
              </div>
              {#if facetHits.length}
                <div class="mt-2 flex flex-wrap gap-1">
                  {#each facetHits as hit}
                    <button class="btn btn-xs btn-ghost" type="button" onclick={() => applyFacet(facetName, hit.value)}>{hit.value} ({hit.count})</button>
                  {/each}
                </div>
              {/if}
            </div>
          </div>
        {:else if tab === 'display'}
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {#if catalog.retrieve.length || form.attributesToRetrieve.trim()}
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">attributesToRetrieve</span></span>
                <FieldChips names={catalog.retrieve} value={form.attributesToRetrieve} onchange={(value) => (form.attributesToRetrieve = value)} />
                <input class="input input-bordered input-sm" placeholder="*, id, title" bind:value={form.attributesToRetrieve} />
              </label>
            {/if}
            {#if catalog.searchOn.length || form.attributesToSearchOn.trim()}
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">attributesToSearchOn</span></span>
                <FieldChips names={catalog.searchOn} value={form.attributesToSearchOn} onchange={(value) => (form.attributesToSearchOn = value)} />
                <input class="input input-bordered input-sm" placeholder="title, overview" bind:value={form.attributesToSearchOn} />
              </label>
            {/if}
            {#if catalog.filterable.length || form.distinct.trim()}
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">distinct</span></span>
                <input class="input input-bordered input-sm" list="search-distinct-fields" placeholder="product_id" bind:value={form.distinct} />
                <datalist id="search-distinct-fields">
                  {#each catalog.facets as name}<option value={name}></option>{/each}
                </datalist>
              </label>
            {/if}
            {#if catalog.locales.length || form.locales.trim()}
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">locales</span></span>
                <FieldChips names={catalog.locales} value={form.locales} onchange={(value) => (form.locales = value)} />
                <input class="input input-bordered input-sm" placeholder="en, vi" bind:value={form.locales} />
              </label>
            {/if}
            {#if catalog.retrieve.length || form.attributesToHighlight.trim() || form.attributesToCrop.trim()}
              <label class="form-control sm:col-span-2">
                <span class="label cursor-pointer justify-start gap-2 py-1">
                  <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.highlightAll} />
                  <span class="text-sm">Highlight tất cả field hiển thị</span>
                </span>
              </label>
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">attributesToHighlight</span></span>
                <FieldChips names={catalog.retrieve} value={form.attributesToHighlight} onchange={(value) => (form.attributesToHighlight = value)} />
                <input class="input input-bordered input-sm" placeholder="title, overview" bind:value={form.attributesToHighlight} />
              </label>
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">attributesToCrop</span></span>
                <FieldChips names={catalog.retrieve} value={form.attributesToCrop} onchange={(value) => (form.attributesToCrop = value)} />
                <input class="input input-bordered input-sm" placeholder="overview" bind:value={form.attributesToCrop} />
              </label>
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">highlightPreTag</span></span>
                <input class="input input-bordered input-sm" placeholder="<em>" bind:value={form.highlightPreTag} />
              </label>
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">highlightPostTag</span></span>
                <input class="input input-bordered input-sm" placeholder="</em>" bind:value={form.highlightPostTag} />
              </label>
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">cropLength</span></span>
                <input class="input input-bordered input-sm" placeholder="10" bind:value={form.cropLength} />
              </label>
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">cropMarker</span></span>
                <input class="input input-bordered input-sm" placeholder="…" bind:value={form.cropMarker} />
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.showMatchesPosition} />
                <span class="text-sm">showMatchesPosition</span>
              </label>
            {/if}
          </div>
        {:else if tab === 'vector'}
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {#if embedderNames.length || form.hybridEmbedder.trim()}
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">hybrid.embedder</span></span>
                <input class="input input-bordered input-sm" list="search-embedders" placeholder="default" bind:value={form.hybridEmbedder} />
                <datalist id="search-embedders">
                  {#each embedderNames as name}<option value={name}></option>{/each}
                </datalist>
              </label>
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">semanticRatio</span><span class="label-text-alt text-[10px]">0 keyword · 1 semantic</span></span>
                <input class="input input-bordered input-sm" placeholder="0.5" bind:value={form.hybridSemanticRatio} />
              </label>
              <label class="form-control sm:col-span-2">
                <span class="label py-1"><span class="label-text text-xs">vector</span></span>
                <input class="input input-bordered input-sm" placeholder="0.1, 0.2, 0.3" bind:value={form.vector} />
              </label>
              <label class="label cursor-pointer justify-start gap-2">
                <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.retrieveVectors} />
                <span class="text-sm">retrieveVectors</span>
              </label>
            {/if}
            {#if flagOn(shell.caps, 'multimodal') || form.mediaJson.trim()}
              <label class="form-control sm:col-span-2">
                <span class="label py-1"><span class="label-text text-xs">Ảnh</span><span class="label-text-alt text-[10px]">media.image.mime + data</span></span>
                <input class="file-input file-input-bordered file-input-sm w-full" type="file" accept="image/*" onchange={(e) => {
                  const file = e.currentTarget.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => {
                    const parts = splitDataUrl(String(reader.result ?? ''));
                    if (!parts) return;
                    form.mediaJson = mediaFromImageFile(parts.mime, parts.data);
                  };
                  reader.readAsDataURL(file);
                }} />
              </label>
              <label class="form-control sm:col-span-2">
                <span class="label py-1"><span class="label-text text-xs">URL ảnh</span></span>
                <div class="flex gap-2">
                  <input class="input input-bordered input-sm flex-1" placeholder="https://..." bind:value={imageUrl} />
                  <button class="btn btn-outline btn-sm" type="button" disabled={!imageUrl.trim()} onclick={() => (form.mediaJson = mediaJsonFromImageUrl(imageUrl))}>Dùng URL</button>
                </div>
              </label>
              <label class="form-control sm:col-span-2">
                <span class="label py-1"><span class="label-text text-xs">media</span></span>
                <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="3" placeholder={'{ "image": { "mime": "...", "data": "..." } }'} bind:value={form.mediaJson}></textarea>
              </label>
            {/if}
          </div>
        {:else if tab === 'advanced'}
          <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label class="form-control">
              <span class="label py-1"><span class="label-text text-xs">offset</span></span>
              <input class="input input-bordered input-sm" bind:value={form.offset} />
            </label>
            <label class="form-control">
              <span class="label py-1"><span class="label-text text-xs">limit</span></span>
              <input class="input input-bordered input-sm" bind:value={form.limit} />
            </label>
            <label class="form-control">
              <span class="label py-1"><span class="label-text text-xs">page</span></span>
              <input class="input input-bordered input-sm" placeholder="bỏ trống = offset" bind:value={form.page} />
            </label>
            <label class="form-control">
              <span class="label py-1"><span class="label-text text-xs">hitsPerPage</span></span>
              <input class="input input-bordered input-sm" bind:value={form.hitsPerPage} />
            </label>
            <label class="form-control">
              <span class="label py-1"><span class="label-text text-xs">matchingStrategy</span></span>
              <select class="select select-bordered select-sm" bind:value={form.matchingStrategy}>
                <option value="">(default)</option>
                <option value="last">last</option>
                <option value="all">all</option>
                <option value="frequency">frequency</option>
              </select>
            </label>
            <label class="form-control">
              <span class="label py-1"><span class="label-text text-xs">rankingScoreThreshold</span></span>
              <input class="input input-bordered input-sm" placeholder="0.5" bind:value={form.rankingScoreThreshold} />
            </label>
            <label class="label cursor-pointer justify-start gap-2">
              <input type="checkbox" class="checkbox checkbox-sm" bind:checked={form.showPerformanceDetails} />
              <span class="text-sm">showPerformanceDetails</span>
            </label>
            {#if flagOn(shell.caps, 'network')}
              <label class="form-control">
                <span class="label py-1"><span class="label-text text-xs">useNetwork</span></span>
                <select class="select select-bordered select-sm" bind:value={form.useNetwork}>
                  <option value="">(default)</option>
                  <option value="true">true</option>
                  <option value="false">false</option>
                </select>
              </label>
            {/if}
            <label class="form-control sm:col-span-2">
              <span class="label py-1"><span class="label-text text-xs">personalize.userContext</span></span>
              <textarea class="textarea textarea-bordered textarea-sm" rows="2" placeholder="likes action movies" bind:value={form.personalizeUserContext}></textarea>
            </label>
            {#if flagOn(shell.caps, 'dynamicSearchRules')}
              <label class="form-control sm:col-span-2 lg:col-span-4">
                <span class="label py-1"><span class="label-text text-xs">inlineRule</span></span>
                <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="4" placeholder={'{ "uid": "...", "actions": [] }'} bind:value={form.inlineRuleJson}></textarea>
              </label>
            {/if}
          </div>
        {:else if tab === 'debug'}
          <div class="flex flex-col gap-3">
            <div class="flex flex-wrap gap-2">
              <button class="btn btn-sm {showRequest ? 'btn-primary' : 'btn-outline'}" type="button" disabled={!lastQuery} onclick={() => (showRequest = !showRequest)}>Raw request</button>
              <button class="btn btn-sm {showResponse ? 'btn-primary' : 'btn-outline'}" type="button" disabled={!result} onclick={() => (showResponse = !showResponse)}>Raw response</button>
              <button class="btn btn-sm {showCompare ? 'btn-primary' : 'btn-outline'}" type="button" disabled={history.length < 2} onclick={() => (showCompare = !showCompare)}>So sánh snapshot</button>
            </div>
            {#if showRequest && lastQuery}
              <CodeBlock value={lastQuery} />
            {/if}
            {#if showResponse && result}
              <CodeBlock value={result} />
              {#if result.performanceDetails}
                <p class="text-xs font-medium">performanceDetails</p>
                <CodeBlock value={result.performanceDetails} />
              {/if}
            {/if}
            {#if showCompare}
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label class="form-control">
                  <span class="mb-1 text-xs text-base-content/60">Run A</span>
                  <select class="select select-bordered select-sm w-full" value={snapA} onchange={(e) => (snapA = e.currentTarget.value)}>
                    {#each history as item, i (snapshotKey(item, i))}
                      <option value={snapshotKey(item, i)} selected={snapA === snapshotKey(item, i)}>{new Date(item.at).toLocaleTimeString()} · q={item.query.q ?? ''} · {item.hitCount ?? 0} hits · {item.processingTimeMs ?? '—'}ms</option>
                    {/each}
                  </select>
                </label>
                <label class="form-control">
                  <span class="mb-1 text-xs text-base-content/60">Run B</span>
                  <select class="select select-bordered select-sm w-full" value={snapB} onchange={(e) => (snapB = e.currentTarget.value)}>
                    {#each history as item, i (snapshotKey(item, i))}
                      <option value={snapshotKey(item, i)} selected={snapB === snapshotKey(item, i)}>{new Date(item.at).toLocaleTimeString()} · q={item.query.q ?? ''} · {item.hitCount ?? 0} hits · {item.processingTimeMs ?? '—'}ms</option>
                    {/each}
                  </select>
                </label>
              </div>
              {#if pair}
                <p class="text-xs text-base-content/60">
                  Latency A {pair.latencyA ?? '—'}ms → B {pair.latencyB ?? '—'}ms
                  {#if pair.latencyDelta != null} · Δ {pair.latencyDelta > 0 ? '+' : ''}{pair.latencyDelta}ms{/if}
                  ·
                  {#if pair.ids.orderChanged}<span class="status-chip status-chip-processing">order đổi</span>{:else}<span class="status-chip status-chip-canceled">order giữ</span>{/if}
                  {#if pair.ids.onlyA.length} · mất {pair.ids.onlyA.join(', ')}{/if}
                  {#if pair.ids.onlyB.length} · thêm {pair.ids.onlyB.join(', ')}{/if}
                </p>
                <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
                  <table class="table table-sm">
                    <thead>
                      <tr>
                        <th>doc</th>
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
                          <td class="font-mono text-xs" title={row.id}>{row.label}</td>
                          <td class="text-right tabular-nums">{row.rankA ?? '—'}</td>
                          <td class="text-right tabular-nums">{row.rankB ?? '—'}</td>
                          <td class="text-right tabular-nums" class:text-error={row.rankDelta != null && row.rankDelta > 0} class:text-success={row.rankDelta != null && row.rankDelta < 0}>{row.rankDelta == null ? '—' : row.rankDelta > 0 ? `+${row.rankDelta}` : row.rankDelta}</td>
                          <td class="text-right font-mono text-xs tabular-nums">{row.scoreA == null ? '—' : row.scoreA.toFixed(4)}</td>
                          <td class="text-right font-mono text-xs tabular-nums">{row.scoreB == null ? '—' : row.scoreB.toFixed(4)}</td>
                          <td class="text-right font-mono text-xs tabular-nums" class:text-success={row.scoreDelta != null && row.scoreDelta > 0} class:text-error={row.scoreDelta != null && row.scoreDelta < 0}>{row.scoreDelta == null ? '—' : `${row.scoreDelta > 0 ? '+' : ''}${row.scoreDelta.toFixed(4)}`}</td>
                        </tr>
                      {/each}
                    </tbody>
                  </table>
                </div>
              {:else}
                <p class="text-xs text-base-content/50">Chọn hai run khác nhau. Cần ít nhất 2 lần Search.</p>
              {/if}
            {/if}
            {#if history.length}
              <div>
                <p class="mb-1 text-xs font-medium">Lịch sử trên máy này</p>
                <ul class="max-h-40 space-y-1 overflow-auto text-xs">
                  {#each history as item}
                    <li>
                      <button class="link link-hover" type="button" onclick={() => restore(item)}>
                        {new Date(item.at).toLocaleTimeString()} · q={item.query.q ?? ''} · {item.hitCount ?? 0} hits · {item.processingTimeMs ?? '—'}ms
                      </button>
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/if}
      </div>
      {#if fieldSource === 'stats'}
        <p class="text-[11px] text-base-content/45">Field lấy từ stats vì /fields không trả về.</p>
      {/if}
    {/if}

    <div class="flex justify-end border-t border-base-300 pt-3">
      <button class="btn btn-primary btn-sm" type="submit" title="Ctrl+Enter">Search</button>
    </div>

    {#if result}
      {@const facetEntries = result.facetDistribution && typeof result.facetDistribution === 'object' ? Object.entries(result.facetDistribution).filter((entry) => entry[1] && typeof entry[1] === 'object') : []}
      <div class="border-t border-base-300 pt-3 {facetEntries.length ? 'search-results' : ''}">
        {#if facetEntries.length}
          <div class="facet-quick">
            {#each facetEntries as [attr] (attr)}
              <button
                class="facet-quick-item"
                class:facet-quick-item-on={facetJump === attr}
                type="button"
                onclick={() => jumpFacet(attr)}
              >{attr}</button>
            {/each}
          </div>
          <div class="facet-rail rounded-box bg-base-200/60 p-2" bind:this={facetPane}>
            {#each facetEntries as [attr, vals] (attr)}
              <section class="facet-block" class:facet-block-active={facetJump === attr} data-facet={attr}>
                <p class="facet-block-title">{attr}</p>
                <div class="facet-block-values">
                  {#each Object.entries(vals) as [v, c]}
                    {@const clause = facetClause(attr, String(v))}
                    {@const selected = clause !== '' && (form.filter ?? '').includes(clause)}
                    <button
                        class="facet-value flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 text-left text-xs {selected ? 'facet-value-on' : ''}"
                      type="button"
                      title={v}
                      onclick={() => applyFacet(attr, String(v))}
                    >
                      <span class="min-w-0 truncate">{v}</span>
                      <span class="shrink-0 tabular-nums {selected ? 'text-primary-content' : 'text-base-content/60'}">{c}</span>
                    </button>
                  {/each}
                </div>
                {#if result.facetStats?.[attr]}
                  <p class="mt-1 px-2 text-[11px] text-base-content/55">{result.facetStats[attr].min} – {result.facetStats[attr].max}</p>
                {/if}
              </section>
            {/each}
          </div>
        {/if}
        <HitsViewer rows={result.hits ?? []} indexUid={indexUid} onSimilar={similar} split={facetEntries.length > 0}>
          {#snippet leading()}
            <span class="text-xs text-base-content/60">
              {result.estimatedTotalHits ?? result.totalHits ?? result.hits.length} hits
              {#if result.page != null} · page {result.page}{#if result.totalPages != null}/{result.totalPages}{/if}{/if}
              · {result.processingTimeMs}ms
            </span>
            {#if hitCompare}
              {#if hitCompare.orderChanged}<span class="status-chip status-chip-processing">order đổi</span>{:else}<span class="status-chip status-chip-canceled">order giữ</span>{/if}
            {/if}
            {#if embedderNames.length}
              <input class="input input-bordered input-xs w-36" list="search-similar-embedders" placeholder="embedder" bind:value={similarEmbedder} />
              <datalist id="search-similar-embedders">
                {#each embedderNames as name}<option value={name}></option>{/each}
              </datalist>
            {/if}
          {/snippet}
        </HitsViewer>
      </div>
    {/if}
  </div>
</form>
