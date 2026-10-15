<script lang="ts">
  import { onMount } from 'svelte';
  import { getSettings, patchSettings, resetAllSettings, resetSetting } from '../lib/api/settings';
  import {
    SETTING_GROUPS,
    diffSettings,
    linesToList,
    listToLines,
    type SettingGroup
  } from '../lib/api/settings-form';
  import { waitTask } from '../lib/api/tasks';
  import type { Settings, SummarizedTaskView } from '../lib/api/types';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import IndexContext from '../lib/ui/IndexContext.svelte';
  import JsonEditor from '../lib/ui/JsonEditor.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import TaskToast from '../lib/ui/TaskToast.svelte';

  let { uid }: { uid: string } = $props();
  let original = $state<Settings | null>(null);
  let draft = $state<Settings | null>(null);
  let jsonTexts = $state<Record<string, string>>({});
  let listTexts = $state<Record<string, string>>({});
  let jsonErrors = $state<Record<string, string>>({});
  let error = $state<unknown>(null);
  let task = $state<SummarizedTaskView | null>(null);
  let saving = $state(false);

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

  function setList(group: SettingGroup, text: string) {
    if (!draft) return;
    listTexts[group.field] = text;
    (draft as Record<string, unknown>)[group.field] = linesToList(text);
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

  function applyJsonBuffers() {
    if (!draft) return;
    for (const g of SETTING_GROUPS) {
      if (g.editor !== 'json') continue;
      const text = jsonTexts[g.field];
      if (text === undefined) continue;
      (draft as Record<string, unknown>)[g.field] = JSON.parse(text);
    }
    if (jsonTexts.facetingSort && draft.faceting) {
      draft.faceting = { ...draft.faceting, sortFacetValuesBy: JSON.parse(jsonTexts.facetingSort) };
    }
    if (jsonTexts.chatSearchParameters) {
      draft.chat = { ...(draft.chat ?? {}), searchParameters: JSON.parse(jsonTexts.chatSearchParameters) };
    }
  }

  async function save() {
    if (!draft || !original) return;
    const bad = Object.entries(jsonErrors).find(([, msg]) => msg);
    if (bad) {
      error = new Error(`JSON không hợp lệ (${bad[0]}): ${bad[1]}`);
      return;
    }
    try {
      applyJsonBuffers();
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

<PageHeader title="Settings · {uid}" hint="Sửa từng group, lưu chỉ gửi field đã đổi" />
<IndexContext {uid} active="settings" />
<ErrorBanner {error} />
<TaskToast {task} />

{#if draft}
  <div class="flex flex-wrap items-center gap-2 mb-4 sticky top-0 z-10 bg-base-200/95 py-2 -mt-2">
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

  <div class="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-8">
    {#each SETTING_GROUPS as group}
      <section class="card bg-base-100 shadow-sm">
        <div class="card-body p-4 gap-2">
          <div class="flex items-start justify-between gap-2">
            <div>
              <h2 class="font-medium text-sm">{group.label}</h2>
              <p class="text-xs text-base-content/50">{group.hint}</p>
            </div>
            <div class="flex items-center gap-1 shrink-0">
              {#if groupDirty(group.field)}
                <span class="badge badge-warning badge-xs">dirty</span>
              {/if}
              <button class="btn btn-ghost btn-xs" onclick={() => resetOne(group.slug)}>Reset</button>
            </div>
          </div>

          {#if group.editor === 'list'}
            <textarea
              class="textarea textarea-bordered textarea-sm w-full font-mono"
              rows="5"
              value={listTexts[group.field] ?? ''}
              oninput={(e) => setList(group, e.currentTarget.value)}
            ></textarea>
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
          {:else if group.editor === 'json'}
            <JsonEditor
              bind:value={jsonTexts[group.field]}
              rows={8}
              onchange={(text) =>
                setJson(group.field, text, (v) => {
                  if (draft) (draft as Record<string, unknown>)[group.field] = v;
                })}
            />
            {#if jsonErrors[group.field]}<p class="text-error text-xs">{jsonErrors[group.field]}</p>{/if}
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
            <JsonEditor
              value={jsonTexts.facetingSort ?? '{}'}
              rows={5}
              onchange={(text) =>
                setJson('facetingSort', text, (v) => {
                  if (draft) draft.faceting = { ...(draft.faceting ?? {}), sortFacetValuesBy: v as Record<string, string> };
                })}
            />
            {#if jsonErrors.facetingSort}<p class="text-error text-xs">{jsonErrors.facetingSort}</p>{/if}
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
            <JsonEditor
              value={jsonTexts.chatSearchParameters ?? '{}'}
              rows={5}
              onchange={(text) =>
                setJson('chatSearchParameters', text, (v) => {
                  if (draft) draft.chat = { ...(draft.chat ?? {}), searchParameters: v as Record<string, unknown> };
                })}
            />
            {#if jsonErrors.chatSearchParameters}<p class="text-error text-xs">{jsonErrors.chatSearchParameters}</p>{/if}
          {/if}
        </div>
      </section>
    {/each}
  </div>
{:else}
  <div class="flex justify-center py-12"><span class="loading loading-spinner loading-md"></span></div>
{/if}
