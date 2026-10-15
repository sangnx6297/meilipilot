<script lang="ts">
  import { onMount } from 'svelte';
  import { listIndexes, createIndex, deleteIndex, swapIndexes } from '../lib/api/indexes';
  import { meili } from '../lib/api/client';
  import { waitTask } from '../lib/api/tasks';
  import type { IndexStats, IndexView, InstanceStats, SummarizedTaskView } from '../lib/api/types';
  import { confirmBody } from '../lib/ui/confirm-copy';
  import ConfirmDialog from '../lib/ui/ConfirmDialog.svelte';
  import EmptyState from '../lib/ui/EmptyState.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import TaskToast from '../lib/ui/TaskToast.svelte';
  import Pager from '../lib/ui/Pager.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import Skeleton from '../lib/ui/Skeleton.svelte';
  import { shellReader } from '../lib/ui/shell-context';
  import { createPoll } from '../lib/ui/poll';
  let results = $state<IndexView[]>([]);
  let total = $state(0);
  let offset = $state(0);
  let uid = $state('');
  let primaryKey = $state('id');
  let swapA = $state('');
  let swapB = $state('');
  let error = $state<unknown>(null);
  let task = $state<SummarizedTaskView | null>(null);
  let statsByUid = $state<Record<string, IndexStats>>({});
  let loading = $state(true);
  let pendingDelete = $state<string | null>(null);
  const readShell = shellReader();
  const shell = $derived(readShell());
  async function load() {
    try {
      const page = await listIndexes(offset, 20);
      results = page.results;
      total = page.total;
      const inst = await meili<InstanceStats>('GET', '/stats');
      statsByUid = inst.indexes ?? {};
      error = null;
    } catch (e) {
      error = e;
    } finally {
      loading = false;
    }
  }
  onMount(() => createPoll(load, 2000));
  async function create() {
    try {
      task = await createIndex({ uid, primaryKey: primaryKey || null });
      await waitTask(task.taskUid);
      uid = '';
      await load();
    } catch (e) {
      error = e;
    }
  }
  function askRemove(id: string) {
    pendingDelete = id;
  }

  async function remove() {
    const id = pendingDelete;
    if (!id) return;
    pendingDelete = null;
    try {
      task = await deleteIndex(id);
      await waitTask(task.taskUid);
      await load();
    } catch (e) {
      error = e;
    }
  }
  async function swap() {
    try {
      task = await swapIndexes([[swapA, swapB]]);
      await waitTask(task.taskUid);
      await load();
    } catch (e) {
      error = e;
    }
  }
</script>
<PageHeader title="Indexes" hint="Tự refresh mỗi 2 giây — số documents và trạng thái indexing" />
<ErrorBanner {error} />
<TaskToast {task} />
<div class="card bg-base-100 mb-4">
  <div class="card-body p-4 gap-3">
    <div class="flex flex-wrap gap-2">
      <input class="input input-bordered input-sm min-w-0 flex-1" placeholder="Tên index (uid)" bind:value={uid} />
      <input class="input input-bordered input-sm w-44 shrink-0" placeholder="primaryKey" bind:value={primaryKey} />
      <button class="btn btn-primary btn-sm" onclick={create}>Tạo</button>
    </div>
    <div class="flex flex-wrap gap-2">
      <input class="input input-bordered input-sm min-w-0 flex-1" placeholder="Swap index A" bind:value={swapA} />
      <input class="input input-bordered input-sm min-w-0 flex-1" placeholder="Swap index B" bind:value={swapB} />
      <button class="btn btn-outline btn-sm" onclick={swap}>Swap</button>
    </div>
  </div>
</div>
{#if loading}
  <Skeleton rows={8} />
{:else if !results.length}
  <EmptyState title="Chưa có index" hint="Nhập uid rồi bấm Tạo." />
{:else}
<div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
  <table class="table table-sm">
    <thead><tr><th>uid</th><th>primaryKey</th><th>docs</th><th>indexing</th><th></th></tr></thead>
    <tbody>
      {#each results as idx}
        {@const st = statsByUid[idx.uid]}
        <tr>
          <td class="max-w-[12rem] truncate font-mono text-xs"><a class="link link-hover font-medium" href="#/indexes/{idx.uid}">{idx.uid}</a></td>
          <td>{idx.primaryKey ?? '—'}</td>
          <td>{st?.numberOfDocuments ?? '—'}</td>
          <td>
            {#if st?.isIndexing}
              <span class="status-chip status-chip-processing">indexing</span>
            {:else}
              <span class="status-chip status-chip-canceled">idle</span>
            {/if}
          </td>
          <td class="text-right">
            <button class="btn btn-ghost btn-xs text-error" onclick={() => askRemove(idx.uid)}>Xóa</button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
<Pager {offset} limit={20} {total} onchange={(o) => { offset = o; load(); }} />
{/if}
<ConfirmDialog
  open={pendingDelete != null}
  title="Xóa index"
  body={confirmBody({
    env: shell.session?.environment,
    host: shell.session?.host,
    uid: pendingDelete ?? '',
    detail: `Xóa index ${pendingDelete}? Không hoàn tác được.`
  })}
  confirmLabel="Xóa"
  oncancel={() => (pendingDelete = null)}
  onconfirm={remove}
/>
