<script lang="ts">
  import { onMount } from 'svelte';
  import { decodeTransport } from '../lib/api/client';
  import {
    compareSettings,
    downloadText,
    exportDiffJson,
    exportDiffMarkdown,
    hasSettingsDrift,
    migrationRisks,
    patchFromSource,
    previewPatchJson,
    selectedChanges,
    settingsFingerprint,
    type SettingChange
  } from '../lib/api/settings-diff';
  import { pollUntilDone } from '../lib/api/tasks';
  import type { IndexView, Pagination, Settings, SummarizedTaskView, TaskView } from '../lib/api/types';
  import { copyText, currentSession, forwardFor, listProfiles, saveTextFile, type Profile, type Session } from '../lib/store/connection';
  import { confirmBody } from '../lib/ui/confirm-copy';
  import CodeBlock from '../lib/ui/CodeBlock.svelte';
  import ConfirmDialog from '../lib/ui/ConfirmDialog.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import TaskToast from '../lib/ui/TaskToast.svelte';

  let profiles = $state<Profile[]>([]);
  let session = $state<Session | null>(null);
  let sourceProfile = $state('');
  let targetProfile = $state('');
  let sourceIndex = $state('');
  let targetIndex = $state('');
  let sourceIndexes = $state<string[]>([]);
  let targetIndexes = $state<string[]>([]);
  let diffs = $state<SettingChange[]>([]);
  let selected = $state<string[]>([]);
  let compared = $state(false);
  let error = $state<unknown>(null);
  let loading = $state(false);
  let applying = $state(false);
  let task = $state<SummarizedTaskView | null>(null);
  let exportNote = $state('');
  let targetFingerprint = $state('');
  let askMigrate = $state(false);

  const picked = $derived(selectedChanges(diffs, selected));
  const patch = $derived(patchFromSource(diffs, selected));
  const risks = $derived(migrationRisks(selected));
  const preview = $derived(previewPatchJson(patch));
  const sourceName = $derived(profiles.find((p) => p.id === sourceProfile)?.name ?? sourceProfile);
  const targetName = $derived(profiles.find((p) => p.id === targetProfile)?.name ?? targetProfile);
  const targetEnv = $derived(profiles.find((p) => p.id === targetProfile)?.environment ?? '');

  onMount(async () => {
    profiles = await listProfiles();
    session = await currentSession();
    sourceProfile = session?.id ?? profiles[0]?.id ?? '';
    targetProfile = sourceProfile;
    if (sourceProfile) await loadIndexes('source');
    if (targetProfile) await loadIndexes('target');
  });

  async function fetchIndexes(profileId: string): Promise<string[]> {
    const q: Record<string, string> = { offset: '0', limit: '100' };
    const res = await forwardFor(profileId, 'GET', '/indexes', q, '');
    const page = decodeTransport<Pagination<IndexView>>(res);
    return page.results.map((i) => i.uid);
  }

  async function fetchSettings(profileId: string, uid: string): Promise<Settings> {
    const res = await forwardFor(profileId, 'GET', `/indexes/${encodeURIComponent(uid)}/settings`, {}, '');
    return decodeTransport<Settings>(res);
  }

  async function loadIndexes(side: 'source' | 'target') {
    error = null;
    try {
      if (side === 'source') {
        sourceIndexes = await fetchIndexes(sourceProfile);
        if (!sourceIndexes.includes(sourceIndex)) sourceIndex = sourceIndexes[0] ?? '';
      } else {
        targetIndexes = await fetchIndexes(targetProfile);
        if (!targetIndexes.includes(targetIndex)) targetIndex = targetIndexes[0] ?? '';
      }
    } catch (e) {
      error = e;
    }
  }

  async function run() {
    if (!sourceProfile || !targetProfile || !sourceIndex || !targetIndex) return;
    error = null;
    loading = true;
    compared = false;
    try {
      const [a, b] = await Promise.all([
        fetchSettings(sourceProfile, sourceIndex),
        fetchSettings(targetProfile, targetIndex)
      ]);
      diffs = compareSettings(a, b);
      selected = diffs.map((d) => d.slug);
      targetFingerprint = settingsFingerprint(b);
      compared = true;
    } catch (e) {
      error = e;
    } finally {
      loading = false;
    }
  }

  function toggleSlug(slug: string, checked: boolean) {
    selected = checked ? [...selected.filter((s) => s !== slug), slug] : selected.filter((s) => s !== slug);
  }

  function exportMeta() {
    return {
      source: { profile: sourceName, index: sourceIndex },
      target: { profile: targetName, index: targetIndex },
      at: new Date().toISOString()
    };
  }

  async function exportFile(name: string, body: string) {
    exportNote = '';
    try {
      const path = await saveTextFile(name, body);
      if (path) {
        exportNote = `Đã lưu ${path}`;
        return;
      }
    } catch {
      /* dialog fail → clipboard */
    }
    try {
      await copyText(body);
      exportNote = `WebView không tải file — đã copy ${name} vào clipboard.`;
    } catch {
      downloadText(name, body);
      exportNote = `Đã tải ${name}`;
    }
  }

  function exportMd() {
    void exportFile(`settings-diff-${sourceIndex}-${targetIndex}.md`, exportDiffMarkdown(exportMeta(), picked));
  }

  function exportJson() {
    void exportFile(`settings-diff-${sourceIndex}-${targetIndex}.json`, exportDiffJson(exportMeta(), picked));
  }

  async function migrate() {
    const body = patch;
    const keys = Object.keys(body);
    if (!keys.length) return;
    error = null;
    applying = true;
    askMigrate = false;
    try {
      const current = await fetchSettings(targetProfile, targetIndex);
      if (targetFingerprint && hasSettingsDrift(targetFingerprint, current)) {
        error = new Error('Target đã đổi từ lúc so sánh (fingerprint drift). Bấm So sánh lại trước khi migrate.');
        return;
      }
      const res = await forwardFor(
        targetProfile,
        'PATCH',
        `/indexes/${encodeURIComponent(targetIndex)}/settings`,
        {},
        JSON.stringify(body)
      );
      const t = decodeTransport<SummarizedTaskView>(res);
      task = t;
      await pollUntilDone(async () => {
        const r = await forwardFor(targetProfile, 'GET', `/tasks/${t.taskUid}`, {}, '');
        return decodeTransport<TaskView>(r);
      });
      await run();
    } catch (e) {
      error = e;
    } finally {
      applying = false;
    }
  }
</script>

<PageHeader title="Settings Diff" hint="So sánh per-group, export MD/JSON, copy source → target theo group đã chọn" />
<ErrorBanner {error} />
<TaskToast {task} />

<div class="card bg-base-100 shadow-sm mb-4">
  <div class="card-body p-4 gap-3">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <div>
        <p class="text-xs font-medium mb-1">Source</p>
        <select class="select select-bordered select-sm w-full mb-2" bind:value={sourceProfile} onchange={() => loadIndexes('source')}>
          {#each profiles as p}<option value={p.id}>{p.name} · {p.host}</option>{/each}
        </select>
        <select class="select select-bordered select-sm w-full" bind:value={sourceIndex}>
          {#each sourceIndexes as i}<option value={i}>{i}</option>{/each}
        </select>
      </div>
      <div>
        <p class="text-xs font-medium mb-1">Target</p>
        <select class="select select-bordered select-sm w-full mb-2" bind:value={targetProfile} onchange={() => loadIndexes('target')}>
          {#each profiles as p}<option value={p.id}>{p.name} · {p.host}</option>{/each}
        </select>
        <select class="select select-bordered select-sm w-full" bind:value={targetIndex}>
          {#each targetIndexes as i}<option value={i}>{i}</option>{/each}
        </select>
      </div>
    </div>
    <button class="btn btn-primary btn-sm w-fit" disabled={loading} onclick={run}>
      {loading ? 'Đang so sánh…' : 'So sánh'}
    </button>
  </div>
</div>

{#if compared}
  {#if diffs.length === 0}
    <p class="text-sm text-base-content/60">Không khác settings.</p>
  {:else}
    <div class="mb-3 flex flex-wrap items-center gap-2">
      <p class="text-xs text-base-content/60 mr-auto">{diffs.length} group khác · tick group rồi Export / Migrate ({picked.length} đang chọn)</p>
      <button type="button" class="btn btn-ghost btn-sm" onclick={() => (selected = diffs.map((d) => d.slug))}>Chọn hết</button>
      <button type="button" class="btn btn-ghost btn-sm" onclick={() => (selected = [])}>Bỏ chọn</button>
      <button type="button" class="btn btn-outline btn-sm" disabled={!picked.length} onclick={exportMd}>Export MD</button>
      <button type="button" class="btn btn-outline btn-sm" onclick={exportJson} disabled={!picked.length}>Export JSON</button>
      <button type="button" class="btn btn-primary btn-sm" disabled={!picked.length || applying} onclick={() => (askMigrate = true)}>
        {applying ? 'Đang PATCH…' : 'Migrate group đã chọn → target'}
      </button>
    </div>
    {#if risks.some((r) => r.level !== 'low')}
      <div class="mb-3 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-xs">
        {#each risks.filter((r) => r.level !== 'low') as r}
          <p>
            {#if r.level === 'secret'}<span class="font-medium text-error">Secret</span>{:else}<span class="font-medium text-warning">Reindex</span>{/if}
            · {r.label} ({r.slug})
          </p>
        {/each}
        <p class="mt-1 text-base-content/60">PATCH có thể kích hoạt reindex. Không rollback atomic — snapshot tay trước khi apply PROD.</p>
      </div>
    {/if}
    <div class="mb-4">
      <p class="mb-1 text-[10px] uppercase tracking-wide text-base-content/45">Preview PATCH</p>
      <CodeBlock value={preview} />
    </div>
    {#if exportNote}
      <p class="mb-3 text-xs text-success">{exportNote}</p>
    {/if}
    <div class="space-y-3">
      {#each diffs as d}
        <div class="card bg-base-100 shadow-sm" class:border={selected.includes(d.slug)} class:border-accent={selected.includes(d.slug)}>
          <div class="card-body p-4 gap-2">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                class="checkbox checkbox-sm"
                checked={selected.includes(d.slug)}
                onchange={(e) => toggleSlug(d.slug, (e.currentTarget as HTMLInputElement).checked)}
              />
              <h3 class="text-sm font-medium font-mono">{d.label} <span class="text-base-content/50">({d.slug})</span></h3>
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <p class="text-[10px] uppercase text-base-content/50 mb-1">Source</p>
                <CodeBlock value={d.source} />
              </div>
              <div>
                <p class="text-[10px] uppercase text-base-content/50 mb-1">Target</p>
                <CodeBlock value={d.target} />
              </div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
{/if}
<ConfirmDialog
  open={askMigrate}
  title="Migrate settings"
  body={confirmBody({
    env: targetEnv,
    host: profiles.find((p) => p.id === targetProfile)?.host,
    uid: targetIndex,
    detail: `PATCH ${Object.keys(patch).length} group từ ${sourceName}/${sourceIndex} → ${targetName}/${targetIndex}. Fingerprint sẽ được kiểm tra lại trước khi gửi.`
  })}
  confirmLabel="PATCH target"
  busy={applying}
  oncancel={() => (askMigrate = false)}
  onconfirm={migrate}
/>
