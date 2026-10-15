<script lang="ts">
  import { onMount } from 'svelte';
  import { getTask, getTaskDocuments, getBatch, cancelTasks } from '../lib/api/async';
  import type { BatchView, TaskView } from '../lib/api/types';
  import { formatDuration, isLiveStatus, taskProgress } from '../lib/api/task-progress';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import CodeBlock from '../lib/ui/CodeBlock.svelte';
  import TaskProgressBar from '../lib/ui/TaskProgressBar.svelte';
  import StatusChip from '../lib/ui/StatusChip.svelte';
  let { uid }: { uid: number } = $props();
  let task = $state<TaskView | null>(null);
  let batch = $state<BatchView | null>(null);
  let payload = $state<unknown>(null);
  let error = $state<unknown>(null);
  const progress = $derived(task ? taskProgress(task, batch) : null);

  async function load() {
    error = null;
    task = await getTask(uid);
    if (task.batchUid != null) {
      try {
        batch = await getBatch(task.batchUid);
      } catch {
        batch = null;
      }
    } else {
      batch = null;
    }
    if (isLiveStatus(task.status)) {
      try {
        payload = await getTaskDocuments(uid);
      } catch {
        payload = null;
      }
    }
  }

  onMount(() => {
    load().catch((e) => {
      error = e;
    });
    const id = setInterval(() => {
      if (task && isLiveStatus(task.status)) load().catch((e) => { error = e; });
    }, 1000);
    return () => clearInterval(id);
  });

</script>
<PageHeader title="Task {uid}" hint={task?.type ?? ''} />
<ErrorBanner {error} />
{#if task && progress}
  <div class="card bg-base-100 shadow-sm mb-4">
    <div class="card-body p-4 gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <StatusChip status={task.status} />
        <span class="text-sm">{task.type}</span>
        {#if task.indexUid}
          <a class="link link-hover text-sm" href="#/indexes/{task.indexUid}">{task.indexUid}</a>
        {/if}
        {#if isLiveStatus(task.status)}
          <button class="btn btn-outline btn-error btn-xs ml-auto" onclick={async () => {
            await cancelTasks({ uids: String(uid) });
            await load();
          }}>Hủy task</button>
        {/if}
      </div>
      <TaskProgressBar {progress} wide />
      <dl class="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 text-sm">
        <div class="flex justify-between gap-2"><dt class="text-base-content/50">enqueued</dt><dd class="font-mono text-xs">{task.enqueuedAt}</dd></div>
        <div class="flex justify-between gap-2"><dt class="text-base-content/50">started</dt><dd class="font-mono text-xs">{task.startedAt ?? '—'}</dd></div>
        <div class="flex justify-between gap-2"><dt class="text-base-content/50">finished</dt><dd class="font-mono text-xs">{task.finishedAt ?? '—'}</dd></div>
        <div class="flex justify-between gap-2"><dt class="text-base-content/50">duration</dt><dd>{formatDuration(task.duration)}</dd></div>
        {#if task.batchUid != null}
          <div class="flex justify-between gap-2"><dt class="text-base-content/50">batch</dt><dd class="font-mono">{task.batchUid}</dd></div>
        {/if}
      </dl>
      {#if task.error}
        <div role="alert" class="alert alert-error text-sm">
          <span>{task.error.message} ({task.error.code})</span>
        </div>
      {/if}
    </div>
  </div>
  {#if task.details}
    <div class="card bg-base-100 shadow-sm mb-4">
      <div class="card-body p-4">
        <h2 class="font-medium mb-2">Details</h2>
        <CodeBlock value={task.details} />
      </div>
    </div>
  {/if}
  {#if payload}
    <div class="card bg-base-100 shadow-sm mb-4">
      <div class="card-body p-4">
        <h2 class="font-medium mb-2">Document payload</h2>
        <CodeBlock value={payload} />
      </div>
    </div>
  {/if}
  <details class="collapse collapse-arrow bg-base-100 shadow-sm">
    <summary class="collapse-title text-sm font-medium">Raw JSON</summary>
    <div class="collapse-content"><CodeBlock value={task} /></div>
  </details>
{:else}
  <div class="flex justify-center py-12"><span class="loading loading-spinner loading-md"></span></div>
{/if}
