<script lang="ts">
  import { onMount } from 'svelte';
  import { getSettings, patchSettings, resetAllSettings, resetSetting } from '../lib/api/settings';
  import {
    SETTING_GROUPS,
    applyChatSearchFields,
    settingMenu,
    chatSearchFields,
    compactStringList,
    diffSettings,
    embeddersToRows,
    facetSortToRows,
    filterableToRows,
    linesToList,
    listToLines,
    localizedToRows,
    rowsToEmbedders,
    rowsToFacetSort,
    rowsToFilterable,
    rowsToLocalized,
    rowsToSynonyms,
    synonymsToRows,
    type ChatSearchFields,
    type EmbedderRow,
    type FacetSortRow,
    type FilterableRow,
    type LocaleRow,
    type SettingGroup,
    type SynonymRow
  } from '../lib/api/settings-form';
  import { waitTask } from '../lib/api/tasks';
  import { embedderHint, settingVisible } from '../lib/experimental';
  import { shellReader } from '../lib/ui/shell-context';
  import type { Settings, SummarizedTaskView } from '../lib/api/types';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import IndexContext from '../lib/ui/IndexContext.svelte';
  import JsonEditor from '../lib/ui/JsonEditor.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import TaskToast from '../lib/ui/TaskToast.svelte';
  import BackupActions from '../lib/ui/BackupActions.svelte';

  let { uid }: { uid: string } = $props();
  let original = $state<Settings | null>(null);
  let draft = $state<Settings | null>(null);
  let jsonTexts = $state<Record<string, string>>({});
  let listTexts = $state<Record<string, string>>({});
  let jsonErrors = $state<Record<string, string>>({});
  let error = $state<unknown>(null);
  let task = $state<SummarizedTaskView | null>(null);
  let saving = $state(false);
  let mode = $state<'form' | 'json'>('form');
  let synonymRows = $state<SynonymRow[]>([]);
  let filterRows = $state<FilterableRow[]>([]);
  let localeRows = $state<LocaleRow[]>([]);
  let facetRows = $state<FacetSortRow[]>([]);
  let embedderRows = $state<EmbedderRow[]>([]);
  let chatFields = $state<ChatSearchFields>({ limit: '', filter: '', attributes: '' });
  let embeddersTouched = $state(false);
  const embedderSources = ['openAi', 'huggingFace', 'ollama', 'rest', 'userProvided', 'composite'];

  const readShell = shellReader();
  const shell = $derived(readShell());
  const groups = $derived(SETTING_GROUPS.filter((group) => settingVisible(group.field, shell.caps)));
  const menu = $derived(settingMenu(groups));
  let selectedSlug = $state('');
  const activeGroup = $derived(groups.find((group) => group.slug === selectedSlug) ?? groups[0] ?? null);
  let menuUid = '';

  function pickGroup(slug: string) {
    selectedSlug = slug;
    localStorage.setItem(`meili.settingsGroup:${uid}`, slug);
  }

  $effect(() => {
    const currentUid = uid;
    const visible = groups.map((group) => group.slug);
    if (!visible.length) return;
    if (menuUid !== currentUid) {
      menuUid = currentUid;
      const saved = localStorage.getItem(`meili.settingsGroup:${currentUid}`) ?? '';
      selectedSlug = visible.some((slug) => slug === saved) ? saved : visible[0];
      return;
    }
    if (!visible.some((slug) => slug === selectedSlug)) selectedSlug = visible[0];
  });
  const patch = $derived(original && draft ? diffSettings(original, draft) : {});
  const dirty = $derived(Object.keys(patch).length > 0);

  function hydrate(s: Settings) {
    original = structuredClone(s);
    draft = structuredClone(s);
    const lists: Record<string, string> = {};
    const jsons: Record<string, string> = {};
    for (const g of SETTING_GROUPS) {
      if (g.editor === 'list') lists[g.field] = listToLines(s[g.field] as string[] | null);
      if (g.editor === 'json') jsons[g.field] = JSON.stringify(s[g.field], null, 2);
    }
    lists.typoDisableOnWords = listToLines(s.typoTolerance?.disableOnWords);
    lists.typoDisableOnAttributes = listToLines(s.typoTolerance?.disableOnAttributes);
    jsons.chatSearchParameters = JSON.stringify(s.chat?.searchParameters ?? {}, null, 2);
    jsons.facetingSort = JSON.stringify(s.faceting?.sortFacetValuesBy ?? { '*': 'alpha' }, null, 2);
    listTexts = lists;
    jsonTexts = jsons;
    jsonErrors = {};
    readFormRows();
  }

  function readFormRows() {
    if (!draft) return;
    synonymRows = synonymsToRows(draft.synonyms);
    filterRows = filterableToRows(draft.filterableAttributes);
    localeRows = localizedToRows(draft.localizedAttributes);
    facetRows = facetSortToRows(draft.faceting?.sortFacetValuesBy);
    embedderRows = embeddersToRows(draft.embedders);
    chatFields = chatSearchFields(draft.chat?.searchParameters);
    embeddersTouched = false;
  }

  function commitFormRows() {
    if (!draft) return;
    draft.synonyms = rowsToSynonyms(synonymRows);
    draft.filterableAttributes = rowsToFilterable(filterRows);
    draft.localizedAttributes = rowsToLocalized(localeRows);
    draft.faceting = { ...(draft.faceting ?? {}), sortFacetValuesBy: rowsToFacetSort(facetRows) };
    if (embeddersTouched) draft.embedders = rowsToEmbedders(embedderRows, original?.embedders ?? draft.embedders);
    draft.chat = { ...(draft.chat ?? {}), searchParameters: applyChatSearchFields(draft.chat?.searchParameters, chatFields) };
    for (const group of SETTING_GROUPS) {
      if (group.editor !== 'list') continue;
      (draft as Record<string, unknown>)[group.field] = compactStringList(draft[group.field]);
    }
    if (draft.typoTolerance) {
      draft.typoTolerance = {
        ...draft.typoTolerance,
        disableOnWords: compactStringList(draft.typoTolerance.disableOnWords),
        disableOnAttributes: compactStringList(draft.typoTolerance.disableOnAttributes)
      };
    }
    if (Array.isArray(draft.foreignKeys)) {
      draft.foreignKeys = draft.foreignKeys.filter((row) => {
        const item = row as { foreignIndexUid?: string; fieldName?: string };
        return Boolean(item?.foreignIndexUid?.trim() && item?.fieldName?.trim());
      });
    }
  }

  function syncJsonFromDraft() {
    if (!draft) return;
    const jsons = { ...jsonTexts };
    for (const group of SETTING_GROUPS) jsons[group.field] = JSON.stringify(draft[group.field], null, 2);
    jsonTexts = jsons;
    jsonErrors = {};
  }

  function applyAllJson() {
    if (!draft) return;
    for (const group of SETTING_GROUPS) {
      const text = jsonTexts[group.field];
      if (text === undefined) continue;
      (draft as Record<string, unknown>)[group.field] = JSON.parse(text);
    }
  }

  function setMode(next: 'form' | 'json') {
    if (!draft || next === mode) return;
    if (next === 'json') {
      commitFormRows();
      syncJsonFromDraft();
      mode = 'json';
      return;
    }
    try {
      applyAllJson();
      jsonErrors = {};
      readFormRows();
      error = null;
      mode = 'form';
    } catch (e) {
      error = e instanceof Error ? e : new Error('JSON không hợp lệ');
    }
  }

  async function load() {
    error = null;
    const s = await getSettings(uid);
    hydrate(s);
  }

  onMount(() => {
    load().catch((e) => {
      error = e;
    });
  });

  function groupDirty(field: keyof Settings) {
    if (!original || !draft) return false;
    return JSON.stringify(original[field]) !== JSON.stringify(draft[field]);
  }

  function setJson(field: string, text: string, assign: (v: unknown) => void) {
    jsonTexts[field] = text;
    try {
      assign(JSON.parse(text));
      jsonErrors[field] = '';
    } catch (e) {
      jsonErrors[field] = e instanceof Error ? e.message : 'JSON không hợp lệ';
    }
  }

  function moveRule(i: number, dir: number) {
    if (!draft?.rankingRules) return;
    const j = i + dir;
    if (j < 0 || j >= draft.rankingRules.length) return;
    const arr = [...draft.rankingRules];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    draft.rankingRules = arr;
  }

  async function save() {
    if (!draft || !original) return;
    const bad = Object.entries(jsonErrors).find(([, msg]) => msg);
    if (bad) {
      error = new Error(`JSON không hợp lệ (${bad[0]}): ${bad[1]}`);
      return;
    }
    try {
      if (mode === 'json') applyAllJson();
      else commitFormRows();
      const body = diffSettings(original, draft);
      if (!Object.keys(body).length) return;
      saving = true;
      error = null;
      task = await patchSettings(uid, body);
      await waitTask(task.taskUid);
      await load();
    } catch (e) {
      error = e;
    } finally {
      saving = false;
    }
  }

  async function resetOne(slug: SettingGroup['slug']) {
    try {
      error = null;
      task = await resetSetting(uid, slug);
      await waitTask(task.taskUid);
      await load();
    } catch (e) {
      error = e;
    }
  }

  async function resetAll() {
    if (prompt('Gõ uid để reset all settings') !== uid) return;
    try {
      error = null;
      task = await resetAllSettings(uid);
      await waitTask(task.taskUid);
      await load();
    } catch (e) {
      error = e;
    }
  }
</script>

<PageHeader title="Settings · {uid}" hint="Chọn nhóm bên trái. Form của nhóm đó hiện bên phải. Lưu chỉ gửi field đã đổi." />
<IndexContext {uid} active="settings" />
<ErrorBanner {error} />
<TaskToast {task} />

{#if draft}
  <div class="flex flex-wrap items-center gap-2 mb-4 sticky top-0 z-10 bg-base-200/95 py-2 -mt-2">
    <div class="join">
      <button class="join-item btn btn-sm" class:btn-active={mode === 'form'} type="button" onclick={() => setMode('form')}>Form</button>
      <button class="join-item btn btn-sm" class:btn-active={mode === 'json'} type="button" onclick={() => setMode('json')}>JSON</button>
    </div>
    <button class="btn btn-primary btn-sm" disabled={!dirty || saving} onclick={save}>
      {#if saving}<span class="loading loading-spinner loading-xs"></span>{/if}
      Lưu thay đổi
    </button>
    <button class="btn btn-outline btn-error btn-sm" onclick={resetAll}>Reset all</button>
    {#if dirty}
      <span class="badge badge-warning badge-sm">{Object.keys(patch).length} group đã sửa</span>
    {:else}
      <span class="text-xs text-base-content/50">Không có thay đổi</span>
    {/if}
  </div>

  <section class="card bg-base-100 shadow-sm mb-4">
    <div class="card-body p-4 gap-2">
      <h2 class="font-medium text-sm">Dump / Restore</h2>
      <p class="text-xs text-base-content/60">File JSON của index này: settings và documents. apiKey embedder không ghi vào file.</p>
      <BackupActions scope="index" {uid} ondone={() => load().catch((e) => (error = e))} />
    </div>
  </section>

  <div class="settings-split pb-8">
    <nav class="settings-cats" aria-label="Nhóm settings">
      {#each menu as section}
        <p class="settings-cat-label">{section.label}</p>
        {#each section.groups as item}
          <button
            type="button"
            class="settings-cat-item"
            class:settings-cat-on={activeGroup?.slug === item.slug}
            aria-current={activeGroup?.slug === item.slug ? 'page' : undefined}
            onclick={() => pickGroup(item.slug)}
          >
            <span>{item.label}</span>
            {#if groupDirty(item.field)}<span class="settings-cat-dirty" title="đã sửa"></span>{/if}
          </button>
        {/each}
      {/each}
    </nav>
    {#each activeGroup ? [activeGroup] : [] as group}
      <section class="card bg-base-100 shadow-sm">
        <div class="card-body p-4 gap-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h2 class="font-medium text-sm">{group.label}</h2>
              <p class="text-xs text-base-content/50">{group.field === 'embedders' ? embedderHint(group.hint, shell.caps) : group.hint}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              {#if groupDirty(group.field)}
                <span class="badge badge-warning badge-xs">dirty</span>
              {/if}
              <button class="btn btn-ghost btn-xs" onclick={() => resetOne(group.slug)}>Reset</button>
            </div>
          </div>

          {#if mode === 'json'}
            <JsonEditor
              bind:value={jsonTexts[group.field]}
              rows={8}
              onchange={(text) =>
                setJson(group.field, text, (v) => {
                  if (draft) (draft as Record<string, unknown>)[group.field] = v;
                })}
            />
            {#if jsonErrors[group.field]}<p class="text-error text-xs">{jsonErrors[group.field]}</p>{/if}
          {:else if group.editor === 'list'}
            {#each (draft[group.field] as string[] | null) ?? [] as item, i}
              <div class="flex gap-1">
                <input
                  class="input input-bordered input-sm flex-1"
                  value={item}
                  oninput={(e) => {
                    if (!draft) return;
                    const arr = [...((draft[group.field] as string[]) ?? [])];
                    arr[i] = e.currentTarget.value;
                    (draft as Record<string, unknown>)[group.field] = arr;
                  }}
                />
                <button class="btn btn-ghost btn-sm" type="button" onclick={() => {
                  if (!draft) return;
                  const arr = [...((draft[group.field] as string[]) ?? [])];
                  arr.splice(i, 1);
                  (draft as Record<string, unknown>)[group.field] = arr;
                }}>✕</button>
              </div>
            {/each}
            <button class="btn btn-outline btn-xs w-fit" type="button" onclick={() => {
              if (!draft) return;
              (draft as Record<string, unknown>)[group.field] = [...((draft[group.field] as string[]) ?? []), ''];
            }}>Thêm</button>
          {:else if group.editor === 'ranking'}
            <div class="flex flex-col gap-1">
              {#each draft.rankingRules ?? [] as rule, i}
                <div class="join w-full">
                  <input
                    class="join-item input input-bordered input-sm flex-1 font-mono"
                    value={rule}
                    oninput={(e) => {
                      const arr = [...(draft?.rankingRules ?? [])];
                      arr[i] = e.currentTarget.value;
                      if (draft) draft.rankingRules = arr;
                    }}
                  />
                  <button class="join-item btn btn-sm" onclick={() => moveRule(i, -1)}>↑</button>
                  <button class="join-item btn btn-sm" onclick={() => moveRule(i, 1)}>↓</button>
                  <button
                    class="join-item btn btn-sm"
                    onclick={() => {
                      if (draft) draft.rankingRules = (draft.rankingRules ?? []).filter((_, x) => x !== i);
                    }}>✕</button>
                </div>
              {/each}
              <button
                class="btn btn-outline btn-xs w-fit mt-1"
                onclick={() => {
                  if (draft) draft.rankingRules = [...(draft.rankingRules ?? []), ''];
                }}>Thêm rule</button>
            </div>
          {:else if group.field === 'synonyms'}
            {#each synonymRows as row, i}
              <div class="flex gap-1">
                <input class="input input-bordered input-sm w-32" placeholder="từ" value={row.word} oninput={(e) => {
                  synonymRows[i].word = e.currentTarget.value;
                  if (draft) draft.synonyms = rowsToSynonyms(synonymRows);
                }} />
                <input class="input input-bordered input-sm flex-1" placeholder="từ đồng nghĩa, cách nhau bằng dấu phẩy" value={row.terms} oninput={(e) => {
                  synonymRows[i].terms = e.currentTarget.value;
                  if (draft) draft.synonyms = rowsToSynonyms(synonymRows);
                }} />
                <button class="btn btn-ghost btn-sm" type="button" onclick={() => {
                  synonymRows = synonymRows.filter((_, index) => index !== i);
                  if (draft) draft.synonyms = rowsToSynonyms(synonymRows);
                }}>✕</button>
              </div>
            {/each}
            <button class="btn btn-outline btn-xs w-fit" type="button" onclick={() => (synonymRows = [...synonymRows, { word: '', terms: '' }])}>Thêm synonym</button>
          {:else if group.field === 'filterableAttributes'}
            {#each filterRows as row, i}
              <div class="flex flex-wrap gap-1 items-center">
                <select class="select select-bordered select-sm w-28" value={row.kind} onchange={(e) => {
                  filterRows[i].kind = e.currentTarget.value as FilterableRow['kind'];
                  if (draft) draft.filterableAttributes = rowsToFilterable(filterRows);
                }}>
                  <option value="name">field</option>
                  <option value="pattern">pattern</option>
                </select>
                <input class="input input-bordered input-sm flex-1 min-w-32" placeholder={row.kind === 'pattern' ? 'price_*, stock' : 'genre'} value={row.text} oninput={(e) => {
                  filterRows[i].text = e.currentTarget.value;
                  if (draft) draft.filterableAttributes = rowsToFilterable(filterRows);
                }} />
                {#if row.kind === 'pattern'}
                  <label class="label cursor-pointer gap-1 py-0">
                    <input type="checkbox" class="checkbox checkbox-xs" checked={row.facetSearch} onchange={(e) => {
                      filterRows[i].facetSearch = e.currentTarget.checked;
                      if (draft) draft.filterableAttributes = rowsToFilterable(filterRows);
                    }} />
                    <span class="text-xs">facet search</span>
                  </label>
                {/if}
                <button class="btn btn-ghost btn-sm" type="button" onclick={() => {
                  filterRows = filterRows.filter((_, index) => index !== i);
                  if (draft) draft.filterableAttributes = rowsToFilterable(filterRows);
                }}>✕</button>
              </div>
            {/each}
            <button class="btn btn-outline btn-xs w-fit" type="button" onclick={() => (filterRows = [...filterRows, { kind: 'name', text: '', facetSearch: false }])}>Thêm filterable</button>
          {:else if group.field === 'localizedAttributes'}
            {#each localeRows as row, i}
              <div class="flex gap-1">
                <input class="input input-bordered input-sm w-32" placeholder="locales: jpn, eng" value={row.locales} oninput={(e) => {
                  localeRows[i].locales = e.currentTarget.value;
                  if (draft) draft.localizedAttributes = rowsToLocalized(localeRows);
                }} />
                <input class="input input-bordered input-sm flex-1" placeholder="attributePatterns: *_ja" value={row.patterns} oninput={(e) => {
                  localeRows[i].patterns = e.currentTarget.value;
                  if (draft) draft.localizedAttributes = rowsToLocalized(localeRows);
                }} />
                <button class="btn btn-ghost btn-sm" type="button" onclick={() => {
                  localeRows = localeRows.filter((_, index) => index !== i);
                  if (draft) draft.localizedAttributes = rowsToLocalized(localeRows);
                }}>✕</button>
              </div>
            {/each}
            <button class="btn btn-outline btn-xs w-fit" type="button" onclick={() => (localeRows = [...localeRows, { locales: '', patterns: '' }])}>Thêm locale</button>
          {:else if group.field === 'foreignKeys'}
            {#each (draft.foreignKeys ?? []) as row, i}
              <div class="flex gap-1">
                <input class="input input-bordered input-sm flex-1" placeholder="foreignIndexUid" value={(row as { foreignIndexUid?: string }).foreignIndexUid ?? ''} oninput={(e) => {
                  if (!draft?.foreignKeys) return;
                  const next = [...draft.foreignKeys] as { foreignIndexUid: string; fieldName: string }[];
                  next[i] = { ...next[i], foreignIndexUid: e.currentTarget.value };
                  draft.foreignKeys = next;
                }} />
                <input class="input input-bordered input-sm flex-1" placeholder="fieldName" value={(row as { fieldName?: string }).fieldName ?? ''} oninput={(e) => {
                  if (!draft?.foreignKeys) return;
                  const next = [...draft.foreignKeys] as { foreignIndexUid: string; fieldName: string }[];
                  next[i] = { ...next[i], fieldName: e.currentTarget.value };
                  draft.foreignKeys = next;
                }} />
                <button class="btn btn-ghost btn-sm" type="button" onclick={() => {
                  if (!draft) return;
                  draft.foreignKeys = (draft.foreignKeys ?? []).filter((_, index) => index !== i);
                }}>✕</button>
              </div>
            {/each}
            <button class="btn btn-outline btn-xs w-fit" type="button" onclick={() => {
              if (!draft) return;
              draft.foreignKeys = [...(draft.foreignKeys ?? []), { foreignIndexUid: '', fieldName: '' }];
            }}>Thêm khóa ngoại</button>
          {:else if group.field === 'embedders'}
            <p class="text-xs text-base-content/50">apiKey để trống sẽ không gửi lại key cũ. Composite cần vector cùng chiều ở hai phía.</p>
            {#each embedderRows as row, i}
              <div class="rounded-box border border-base-300 p-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input class="input input-bordered input-sm" placeholder="tên" value={row.name} oninput={(e) => { embedderRows[i].name = e.currentTarget.value; embeddersTouched = true; }} />
                <select class="select select-bordered select-sm" value={row.source} onchange={(e) => { embedderRows[i].source = e.currentTarget.value; embeddersTouched = true; }}>
                  {#each embedderSources as source}<option value={source}>{source}</option>{/each}
                </select>
                <input class="input input-bordered input-sm" placeholder="model" value={row.model} oninput={(e) => { embedderRows[i].model = e.currentTarget.value; embeddersTouched = true; }} />
                <input class="input input-bordered input-sm" placeholder="url" value={row.url} oninput={(e) => { embedderRows[i].url = e.currentTarget.value; embeddersTouched = true; }} />
                <input class="input input-bordered input-sm" placeholder="apiKey mới" value={row.apiKey} oninput={(e) => { embedderRows[i].apiKey = e.currentTarget.value; embeddersTouched = true; }} />
                <input class="input input-bordered input-sm" placeholder="dimensions" value={row.dimensions} oninput={(e) => { embedderRows[i].dimensions = e.currentTarget.value; embeddersTouched = true; }} />
                <input class="input input-bordered input-sm sm:col-span-2" placeholder="documentTemplate" value={row.documentTemplate} oninput={(e) => { embedderRows[i].documentTemplate = e.currentTarget.value; embeddersTouched = true; }} />
                {#if row.source === 'composite'}
                  <input class="input input-bordered input-sm" placeholder="indexing source" value={row.indexingSource} oninput={(e) => { embedderRows[i].indexingSource = e.currentTarget.value; embeddersTouched = true; }} />
                  <input class="input input-bordered input-sm" placeholder="indexing model" value={row.indexingModel} oninput={(e) => { embedderRows[i].indexingModel = e.currentTarget.value; embeddersTouched = true; }} />
                  <input class="input input-bordered input-sm" placeholder="search source" value={row.searchSource} oninput={(e) => { embedderRows[i].searchSource = e.currentTarget.value; embeddersTouched = true; }} />
                  <input class="input input-bordered input-sm" placeholder="search model" value={row.searchModel} oninput={(e) => { embedderRows[i].searchModel = e.currentTarget.value; embeddersTouched = true; }} />
                {/if}
                <button class="btn btn-ghost btn-xs w-fit" type="button" onclick={() => { embedderRows = embedderRows.filter((_, index) => index !== i); embeddersTouched = true; }}>Xóa embedder</button>
              </div>
            {/each}
            <button class="btn btn-outline btn-xs w-fit" type="button" onclick={() => {
              embeddersTouched = true;
              embedderRows = [...embedderRows, { name: '', source: 'openAi', model: '', url: '', apiKey: '', documentTemplate: '', dimensions: '', indexingSource: '', indexingModel: '', searchSource: '', searchModel: '' }];
            }}>Thêm embedder</button>
          {:else if group.editor === 'string'}
            <input
              class="input input-bordered input-sm w-full"
              value={draft.distinctAttribute ?? ''}
              oninput={(e) => {
                if (draft) draft.distinctAttribute = e.currentTarget.value.trim() || null;
              }}
            />
          {:else if group.editor === 'boolean'}
            <label class="label cursor-pointer justify-start gap-2">
              <input
                type="checkbox"
                class="toggle toggle-sm"
                checked={!!draft.facetSearch}
                onchange={(e) => {
                  if (draft) draft.facetSearch = e.currentTarget.checked;
                }}
              />
              <span class="text-sm">Bật</span>
            </label>
          {:else if group.editor === 'select'}
            <select
              class="select select-bordered select-sm"
              value={String(draft[group.field] ?? group.options?.[0] ?? '')}
              onchange={(e) => {
                if (draft) (draft as Record<string, unknown>)[group.field] = e.currentTarget.value;
              }}
            >
              {#each group.options ?? [] as opt}
                <option value={opt}>{opt}</option>
              {/each}
            </select>
          {:else if group.editor === 'number'}
            <input
              type="number"
              class="input input-bordered input-sm w-40"
              value={draft.searchCutoffMs ?? ''}
              oninput={(e) => {
                if (!draft) return;
                const v = e.currentTarget.value;
                draft.searchCutoffMs = v === '' ? null : Number(v);
              }}
            />
          {:else if group.editor === 'pagination'}
            <label class="text-sm">
              maxTotalHits
              <input
                type="number"
                class="input input-bordered input-sm w-full mt-1"
                value={draft.pagination?.maxTotalHits ?? ''}
                oninput={(e) => {
                  if (!draft) return;
                  const v = e.currentTarget.value;
                  draft.pagination = {
                    ...(draft.pagination ?? {}),
                    maxTotalHits: v === '' ? null : Number(v)
                  };
                }}
              />
            </label>
          {:else if group.editor === 'faceting'}
            <label class="text-sm">
              maxValuesPerFacet
              <input
                type="number"
                class="input input-bordered input-sm w-full mt-1"
                value={draft.faceting?.maxValuesPerFacet ?? ''}
                oninput={(e) => {
                  if (!draft) return;
                  const v = e.currentTarget.value;
                  draft.faceting = {
                    ...(draft.faceting ?? {}),
                    maxValuesPerFacet: v === '' ? null : Number(v)
                  };
                }}
              />
            </label>
            <p class="text-xs text-base-content/50 mt-1">sortFacetValuesBy</p>
            {#each facetRows as row, i}
              <div class="flex gap-1">
                <input class="input input-bordered input-sm flex-1" placeholder="attribute hoặc *" value={row.attribute} oninput={(e) => {
                  facetRows[i].attribute = e.currentTarget.value;
                  if (draft) draft.faceting = { ...(draft.faceting ?? {}), sortFacetValuesBy: rowsToFacetSort(facetRows) };
                }} />
                <select class="select select-bordered select-sm w-28" value={row.order} onchange={(e) => {
                  facetRows[i].order = e.currentTarget.value as FacetSortRow['order'];
                  if (draft) draft.faceting = { ...(draft.faceting ?? {}), sortFacetValuesBy: rowsToFacetSort(facetRows) };
                }}>
                  <option value="alpha">alpha</option>
                  <option value="count">count</option>
                </select>
                <button class="btn btn-ghost btn-sm" type="button" onclick={() => {
                  facetRows = facetRows.filter((_, index) => index !== i);
                  if (draft) draft.faceting = { ...(draft.faceting ?? {}), sortFacetValuesBy: rowsToFacetSort(facetRows) };
                }}>✕</button>
              </div>
            {/each}
            <button class="btn btn-outline btn-xs w-fit" type="button" onclick={() => (facetRows = [...facetRows, { attribute: '', order: 'alpha' }])}>Thêm sort</button>
          {:else if group.editor === 'typo'}
            <label class="label cursor-pointer justify-start gap-2 py-0">
              <input
                type="checkbox"
                class="toggle toggle-sm"
                checked={draft.typoTolerance?.enabled !== false}
                onchange={(e) => {
                  if (draft) draft.typoTolerance = { ...(draft.typoTolerance ?? {}), enabled: e.currentTarget.checked };
                }}
              />
              <span class="text-sm">enabled</span>
            </label>
            <div class="grid grid-cols-2 gap-2">
              <label class="text-xs">
                oneTypo
                <input
                  type="number"
                  class="input input-bordered input-sm w-full mt-1"
                  value={draft.typoTolerance?.minWordSizeForTypos?.oneTypo ?? ''}
                  oninput={(e) => {
                    if (!draft) return;
                    const n = Number(e.currentTarget.value);
                    draft.typoTolerance = {
                      ...(draft.typoTolerance ?? {}),
                      minWordSizeForTypos: {
                        ...(draft.typoTolerance?.minWordSizeForTypos ?? {}),
                        oneTypo: Number.isFinite(n) ? n : undefined
                      }
                    };
                  }}
                />
              </label>
              <label class="text-xs">
                twoTypos
                <input
                  type="number"
                  class="input input-bordered input-sm w-full mt-1"
                  value={draft.typoTolerance?.minWordSizeForTypos?.twoTypos ?? ''}
                  oninput={(e) => {
                    if (!draft) return;
                    const n = Number(e.currentTarget.value);
                    draft.typoTolerance = {
                      ...(draft.typoTolerance ?? {}),
                      minWordSizeForTypos: {
                        ...(draft.typoTolerance?.minWordSizeForTypos ?? {}),
                        twoTypos: Number.isFinite(n) ? n : undefined
                      }
                    };
                  }}
                />
              </label>
            </div>
            <label class="label cursor-pointer justify-start gap-2 py-0">
              <input
                type="checkbox"
                class="toggle toggle-sm"
                checked={!!draft.typoTolerance?.disableOnNumbers}
                onchange={(e) => {
                  if (draft) draft.typoTolerance = { ...(draft.typoTolerance ?? {}), disableOnNumbers: e.currentTarget.checked };
                }}
              />
              <span class="text-sm">disableOnNumbers</span>
            </label>
            <p class="text-xs text-base-content/50">disableOnWords</p>
            <textarea
              class="textarea textarea-bordered textarea-sm w-full font-mono"
              rows="3"
              value={listTexts.typoDisableOnWords ?? ''}
              oninput={(e) => {
                listTexts.typoDisableOnWords = e.currentTarget.value;
                if (draft) {
                  draft.typoTolerance = {
                    ...(draft.typoTolerance ?? {}),
                    disableOnWords: linesToList(e.currentTarget.value)
                  };
                }
              }}
            ></textarea>
            <p class="text-xs text-base-content/50">disableOnAttributes</p>
            <textarea
              class="textarea textarea-bordered textarea-sm w-full font-mono"
              rows="3"
              value={listTexts.typoDisableOnAttributes ?? ''}
              oninput={(e) => {
                listTexts.typoDisableOnAttributes = e.currentTarget.value;
                if (draft) {
                  draft.typoTolerance = {
                    ...(draft.typoTolerance ?? {}),
                    disableOnAttributes: linesToList(e.currentTarget.value)
                  };
                }
              }}
            ></textarea>
          {:else if group.editor === 'chat'}
            <input
              class="input input-bordered input-sm w-full"
              placeholder="description"
              value={draft.chat?.description ?? ''}
              oninput={(e) => {
                if (draft) draft.chat = { ...(draft.chat ?? {}), description: e.currentTarget.value };
              }}
            />
            <textarea
              class="textarea textarea-bordered textarea-sm w-full font-mono"
              rows="5"
              placeholder="documentTemplate"
              value={draft.chat?.documentTemplate ?? ''}
              oninput={(e) => {
                if (draft) draft.chat = { ...(draft.chat ?? {}), documentTemplate: e.currentTarget.value };
              }}
            ></textarea>
            <label class="text-xs">
              documentTemplateMaxBytes
              <input
                type="number"
                class="input input-bordered input-sm w-full mt-1"
                value={draft.chat?.documentTemplateMaxBytes ?? ''}
                oninput={(e) => {
                  if (!draft) return;
                  const v = e.currentTarget.value;
                  draft.chat = {
                    ...(draft.chat ?? {}),
                    documentTemplateMaxBytes: v === '' ? null : Number(v)
                  };
                }}
              />
            </label>
            <p class="text-xs text-base-content/50">searchParameters</p>
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <input class="input input-bordered input-sm" placeholder="limit" value={chatFields.limit} oninput={(e) => {
                chatFields.limit = e.currentTarget.value;
                if (draft) draft.chat = { ...(draft.chat ?? {}), searchParameters: applyChatSearchFields(draft.chat?.searchParameters, chatFields) };
              }} />
              <input class="input input-bordered input-sm" placeholder="attributesToRetrieve, cách nhau bằng dấu phẩy" value={chatFields.attributes} oninput={(e) => {
                chatFields.attributes = e.currentTarget.value;
                if (draft) draft.chat = { ...(draft.chat ?? {}), searchParameters: applyChatSearchFields(draft.chat?.searchParameters, chatFields) };
              }} />
              <input class="input input-bordered input-sm sm:col-span-2" placeholder="filter" value={chatFields.filter} oninput={(e) => {
                chatFields.filter = e.currentTarget.value;
                if (draft) draft.chat = { ...(draft.chat ?? {}), searchParameters: applyChatSearchFields(draft.chat?.searchParameters, chatFields) };
              }} />
            </div>
          {/if}
        </div>
      </section>
    {/each}
  </div>
{:else}
  <div class="flex justify-center py-12"><span class="loading loading-spinner loading-md"></span></div>
{/if}
