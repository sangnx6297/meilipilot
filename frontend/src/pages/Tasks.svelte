<script lang="ts">
  import { onMount } from 'svelte';
  import { listTasks, cancelTasks, deleteTasks, compactTasks, listBatches } from '../lib/api/async';
  import type { BatchView, TaskView } from '../lib/api/types';
  import { formatDuration, isLiveStatus, taskProgress } from '../lib/api/task-progress';
  import EmptyState from '../lib/ui/EmptyState.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import Skeleton from '../lib/ui/Skeleton.svelte';
  import TaskProgressBar from '../lib/ui/TaskProgressBar.svelte';
  import StatusChip from '../lib/ui/StatusChip.svelte';
  let results = $state<TaskView[]>([]);
  let batches = $state<BatchView[]>([]);
  let statuses = $state('');
  let types = $state('');
  let indexUids = $state('');
  let error = $state<unknown>(null);
  let loading = $state(true);
  const batchByUid = $derived(new Map(batches.map((b) => [b.uid, b])));
  async function load() {
    error = null;
    try {
    const page = await listTasks({
      statuses: statuses || undefined,
      types: types || undefined,
      indexUids: indexUids || undefined,
      limit: 50
    });
    results = page.results;
    batches = (await listBatches({ limit: 20 })).results ?? [];
    } finally {
      loading = false;
    }
  }
  onMount(() => {
    load();
    const id = setInterval(() => {
      if (results.some((t) => isLiveStatus(t.status))) load();
    }, 1000);
    return () => clearInterval(id);
  });
</script>
<PageHeader title="Tasks" hint="Hàng đợi task — tiến trình tự refresh khi đang chạy" />
<ErrorBanner {error} />
<div class="card bg-base-100 shadow-sm mb-4">
  <div class="card-body p-4">
    <div class="flex flex-wrap gap-2">
      <input class="input input-bordered input-sm" placeholder="statuses" bind:value={statuses} />
      <input class="input input-bordered input-sm" placeholder="types" bind:value={types} />
      <input class="input input-bordered input-sm" placeholder="indexUids" bind:value={indexUids} />
      <button class="btn btn-primary btn-sm" onclick={load}>Lọc</button>
      <button class="btn btn-outline btn-sm" onclick={async () => { await cancelTasks({ statuses: 'enqueued,processing' }); load(); }}>Cancel enqueued</button>
      <button class="btn btn-outline btn-sm" onclick={async () => { await deleteTasks({ statuses: 'succeeded,failed,canceled' }); load(); }}>Xóa finished</button>
      <button class="btn btn-outline btn-sm" onclick={async () => alert(JSON.stringify(await compactTasks()))}>Compact queue</button>
    </div>
  </div>
</div>
{#if loading}
  <Skeleton rows={8} />
{:else if !results.length}
  <EmptyState title="Chưa có task" hint="Hàng đợi trống — thao tác index/document sẽ hiện ở đây." />
{:else}
<div class="overflow-x-auto bg-base-100 rounded-box shadow-sm">
  <table class="table table-sm">
    <thead>
      <tr>
        <th>uid</th>
        <th>status</th>
        <th>tiến trình</th>
        <th>type</th>
        <th>index</th>
        <th>duration</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      {#each results as t}
        {@const progress = taskProgress(t, t.batchUid != null ? batchByUid.get(t.batchUid) ?? null : null)}
        <tr>
          <td class="font-mono">{t.uid}</td>
          <td><StatusChip status={t.status} /></td>
          <td><TaskProgressBar {progress} /></td>
          <td>{t.type}</td>
          <td>{t.indexUid ?? '—'}</td>
          <td class="text-xs">{formatDuration(t.duration)}</td>
          <td class="text-right">
            <a class="btn btn-ghost btn-xs" href="#/tasks/{t.uid}">Chi tiết</a>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
{/if}
<div class="overflow-x-auto bg-base-100 rounded-box shadow-sm mt-4">
  <table class="table table-sm">
    <thead><tr><th>batch</th><th>tiến trình</th><th>tasks</th><th>duration</th></tr></thead>
    <tbody>
      {#each batches as b}
        <tr>
          <td class="font-mono">{b.uid}</td>
          <td>
            {#if b.progress}
              <progress class="progress progress-primary w-28" value={b.progress.percentage} max="100"></progress>
              <span class="text-xs ml-1">{Math.round(b.progress.percentage)}%</span>
            {:else}
              <span class="text-xs text-base-content/50">—</span>
            {/if}
          </td>
          <td class="text-xs">{b.stats?.totalNbTasks ?? '—'}</td>
          <td class="text-xs">{formatDuration(b.duration)}</td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>
