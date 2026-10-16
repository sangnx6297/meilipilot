<script lang="ts">
  import { onMount } from 'svelte';
  import {
    fetchDocuments,
    addOrReplace,
    addOrUpdate,
    deleteDocument,
    deleteAllDocuments,
    deleteByFilter,
    deleteBatch,
    editByFunction
  } from '../lib/api/documents';
  import { waitTask } from '../lib/api/tasks';
  import { confirmBody } from '../lib/ui/confirm-copy';
  import ConfirmDialog from '../lib/ui/ConfirmDialog.svelte';
  import EmptyState from '../lib/ui/EmptyState.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import IndexContext from '../lib/ui/IndexContext.svelte';
  import JsonEditor from '../lib/ui/JsonEditor.svelte';
  import Pager from '../lib/ui/Pager.svelte';
  import TaskToast from '../lib/ui/TaskToast.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import HitsViewer from '../lib/ui/HitsViewer.svelte';
  import Skeleton from '../lib/ui/Skeleton.svelte';
  import { shellReader } from '../lib/ui/shell-context';
  import { flagOn } from '../lib/api/capability';
  import type { SummarizedTaskView } from '../lib/api/types';
  let { uid }: { uid: string } = $props();
  let results = $state<Record<string, unknown>[]>([]);
  let total = $state(0);
  let offset = $state(0);
  let filter = $state('');
  let payload = $state('[]');
  let mode = $state<'replace' | 'update'>('replace');
  let rhai = $state('doc');
  let error = $state<unknown>(null);
  let task = $state<SummarizedTaskView | null>(null);
  let selected = $state<string[]>([]);
  let loading = $state(true);
  let pending = $state<{ title: string; detail: string; run: () => Promise<SummarizedTaskView> } | null>(null);
  const readShell = shellReader();
  const shell = $derived(readShell());
  async function load() {
    error = null;
    try {
      const page = await fetchDocuments(uid, { offset, limit: 20, filter: filter || undefined });
      results = page.results;
      total = page.total;
    } finally {
      loading = false;
    }
  }
  onMount(load);
  async function run(fn: () => Promise<SummarizedTaskView>) {
    try {
      task = await fn();
      await waitTask(task.taskUid);
      await load();
    } catch (e) {
      error = e;
    }
  }

  function ask(title: string, detail: string, fn: () => Promise<SummarizedTaskView>) {
    pending = { title, detail, run: fn };
  }

  async function confirmPending() {
    if (!pending) return;
    const fn = pending.run;
    pending = null;
    await run(fn);
  }
</script>
<PageHeader title="Documents · {uid}" />
<IndexContext {uid} active="documents" />
<ErrorBanner {error} />
<TaskToast {task} />
<div class="flex flex-wrap gap-2 mb-3">
  <input class="input input-bordered input-sm flex-1 min-w-48" placeholder="filter" bind:value={filter} />
  <button class="btn btn-outline btn-sm" onclick={load}>Lọc</button>
  <button class="btn btn-outline btn-sm" onclick={() => ask('Xóa theo filter', `Xóa documents khớp filter: ${filter || '(trống)'}?`, () => deleteByFilter(uid, filter))}>Xóa theo filter</button>
</div>
{#if loading}
  <Skeleton rows={8} />
{:else if !results.length}
  <EmptyState title="Chưa có document" hint="Chọn index và bấm Lọc, hoặc import JSON bên dưới." />
{:else}
<div class="mb-3">
  <HitsViewer
    rows={results}
    indexUid={uid}
    showSelect
    selectedIds={selected}
    onToggleSelect={(id, checked) => {
      selected = checked ? [...selected, id] : selected.filter((x) => x !== id);
    }}
    onDelete={(id) => ask('Xóa document', `Xóa document ${id}?`, () => deleteDocument(uid, id))}
  />
</div>
<Pager {offset} limit={20} {total} onchange={(o) => { offset = o; load(); }} />
{/if}
<div class="flex flex-wrap gap-2 mt-3">
  <button class="btn btn-outline btn-sm" onclick={() => ask('Xóa đã chọn', `Xóa ${selected.length} document đã chọn?`, () => deleteBatch(uid, selected))}>Xóa đã chọn</button>
  <button class="btn btn-outline btn-error btn-sm" onclick={() => ask('Xóa tất cả', `Xóa toàn bộ documents của index ${uid}?`, () => deleteAllDocuments(uid))}>Xóa tất cả</button>
</div>
<ConfirmDialog
  open={pending != null}
  title={pending?.title ?? ''}
  body={confirmBody({
    env: shell.session?.environment,
    host: shell.session?.host,
    uid,
    detail: pending?.detail ?? ''
  })}
  confirmLabel="Xóa"
  oncancel={() => (pending = null)}
  onconfirm={confirmPending}
/>
<div class="card bg-base-100 shadow-sm mt-6">
  <div class="card-body p-4">
    <h2 class="font-medium">Import JSON array</h2>
    <JsonEditor bind:value={payload} />
    <div class="flex flex-wrap gap-3 mt-2 items-center">
      <label class="label cursor-pointer gap-2 text-sm">
        <input type="radio" class="radio radio-sm" bind:group={mode} value="replace" /> Replace (PUT)
      </label>
      <label class="label cursor-pointer gap-2 text-sm">
        <input type="radio" class="radio radio-sm" bind:group={mode} value="update" /> Update (POST)
      </label>
      <button class="btn btn-primary btn-sm" onclick={() => run(() => {
        const docs = JSON.parse(payload);
        return mode === 'replace' ? addOrReplace(uid, docs) : addOrUpdate(uid, docs);
      })}>Import</button>
    </div>
  </div>
</div>
{#if flagOn(shell.caps, 'editDocumentsByFunction')}
<div class="card bg-base-100 shadow-sm mt-4">
  <div class="card-body p-4">
    <h2 class="font-medium">Edit by function (RHAI)</h2>
    <p class="text-xs text-base-content/50">Hàm nhận biến <span class="font-mono">doc</span>. Trả về <span class="font-mono">null</span> để xóa document. Filter phía trên giới hạn document được sửa.</p>
    <textarea class="textarea textarea-bordered w-full font-mono text-sm" rows="4" bind:value={rhai}></textarea>
    <button class="btn btn-outline btn-sm mt-2 w-fit" disabled={!rhai.trim()} onclick={() => {
      if (!rhai.trim()) return;
      run(() => editByFunction(uid, { function: rhai, filter: filter || undefined }));
    }}>Chạy</button>
  </div>
</div>
{/if}
