<script lang="ts">
  import { onMount } from 'svelte';
  import { listTasks, cancelTasks, deleteTasks, compactTasks, listBatches, getBatch } from '../lib/api/async';
  import { flagOn } from '../lib/api/capability';
  import { listAllIndexUids } from '../lib/api/dump';
  import { openStream } from '../lib/api/stream';
  import { CANCELABLE_STATUSES, DELETABLE_STATUSES, uidsWithStatus } from '../lib/api/task-actions';
  import { consumeNdjson, upsertByUid } from '../lib/experimental';
  import { shellReader } from '../lib/ui/shell-context';
  import type { BatchView, TaskKind, TaskView } from '../lib/api/types';
  import { formatDuration, isLiveStatus, taskProgress } from '../lib/api/task-progress';
  import EmptyState from '../lib/ui/EmptyState.svelte';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import PageHeader from '../lib/ui/PageHeader.svelte';
  import Skeleton from '../lib/ui/Skeleton.svelte';
  import TaskProgressBar from '../lib/ui/TaskProgressBar.svelte';
  import StatusChip from '../lib/ui/StatusChip.svelte';
  const STATUS_OPTIONS = [
    { id: 'enqueued', label: 'đang chờ' },
    { id: 'processing', label: 'đang chạy' },
    { id: 'succeeded', label: 'xong' },
    { id: 'failed', label: 'lỗi' },
    { id: 'canceled', label: 'đã hủy' }
  ] as const;
  const TASK_TYPES: TaskKind[] = [
    'documentAdditionOrUpdate',
    'documentEdition',
    'documentDeletion',
    'settingsUpdate',
    'indexCreation',
    'indexDeletion',
    'indexUpdate',
    'indexSwap',
    'taskCancelation',
    'taskDeletion',
    'dumpCreation',
    'snapshotCreation',
    'export',
    'upgradeDatabase',
    'indexCompaction',
    'networkTopologyChange',
    'dsrUpdate',
    'dsrClear'
  ];
  let results = $state<TaskView[]>([]);
  let batches = $state<BatchView[]>([]);
  let statusPick = $state<string[]>([]);
  let typePick = $state('');
  let indexPick = $state('');
  let indexes = $state<string[]>([]);
  let selected = $state<number[]>([]);
  let note = $state('');
  let error = $state<unknown>(null);
  let loading = $state(true);
  let acting = $state(false);
  const readShell = shellReader();
  const shell = $derived(readShell());
  const readOnly = $derived(Boolean(shell.session?.readOnly));
  const batchByUid = $derived(new Map(batches.map((b) => [b.uid, b])));
  const picked = $derived(results.filter((task) => selected.includes(task.uid)));
  const cancelIds = $derived(uidsWithStatus(picked, CANCELABLE_STATUSES));
  const deleteIds = $derived(uidsWithStatus(picked, DELETABLE_STATUSES));
  const allChecked = $derived(results.length > 0 && results.every((task) => selected.includes(task.uid)));

  function toggleStatus(id: string, on: boolean) {
    statusPick = on ? [...statusPick, id] : statusPick.filter((item) => item !== id);
  }

  function toggleTask(uid: number, on: boolean) {
    selected = on ? [...selected, uid] : selected.filter((id) => id !== uid);
  }

  function toggleAll(on: boolean) {
    selected = on ? results.map((task) => task.uid) : [];
  }

  async function load() {
    error = null;
    try {
    const page = await listTasks({
      statuses: statusPick.length ? statusPick.join(',') : undefined,
      types: typePick || undefined,
      indexUids: indexPick || undefined,
      limit: 50
    });
    results = page.results;
    const visible = new Set(results.map((task) => task.uid));
    selected = selected.filter((uid) => visible.has(uid));
    batches = (await listBatches({ limit: 20 })).results ?? [];
    } finally {
      loading = false;
    }
  }

  async function cancelSelected() {
    if (readOnly || acting || !cancelIds.length) return;
    if (prompt(`Gõ HUY để hủy ${cancelIds.length} task đang chờ hoặc đang chạy`) !== 'HUY') return;
    acting = true;
    error = null;
    note = '';
    try {
      const task = await cancelTasks({ uids: cancelIds.join(',') });
      note = `Đã gửi hủy ${cancelIds.length} task. Task hủy: ${task.taskUid}.`;
      selected = [];
      await load();
    } catch (err) {
      error = err;
    } finally {
      acting = false;
    }
  }

  async function deleteSelected() {
    if (readOnly || acting || !deleteIds.length) return;
    if (prompt(`Gõ XOA để xóa ${deleteIds.length} task đã xong khỏi hàng đợi`) !== 'XOA') return;
    acting = true;
    error = null;
    note = '';
    try {
      const task = await deleteTasks({ uids: deleteIds.join(',') });
      note = `Đã gửi xóa ${deleteIds.length} task. Task xóa: ${task.taskUid}.`;
      selected = [];
      await load();
    } catch (err) {
      error = err;
    } finally {
      acting = false;
    }
  }

  async function compactQueue() {
    if (readOnly || acting) return;
    if (prompt('Nén cả hàng đợi, không theo dòng đã tick. Gõ COMPACT') !== 'COMPACT') return;
    acting = true;
    error = null;
    note = '';
    try {
      const done = await compactTasks();
      const restart = done.actionRequired ? ` ${done.actionRequired}` : '';
      note = `Đã nén hàng đợi: ${done.preSize} → ${done.postSize}.${restart}`;
    } catch (err) {
      error = err;
    } finally {
      acting = false;
    }
  }
  onMount(() => {
    load();
    listAllIndexUids().then((uids) => {
      indexes = uids;
    }).catch(() => {});
    let feed = '';
    let stop = () => {};
    if (flagOn(readShell().caps, 'tasksStreamingRoute')) {
      const stopTasks = openStream('tasks', 'GET', '/tasks/stream', undefined, (chunk) => {
        const got = consumeNdjson(feed, chunk);
        feed = got.buffer;
        if (got.error) error = got.error;
        for (const line of got.lines) {
          try {
            const task = JSON.parse(line) as TaskView;
            if (typeof task?.uid !== 'number') continue;
            results = upsertByUid(results, task);
            if (task.batchUid != null) {
              void getBatch(task.batchUid).then((batch) => {
                batches = upsertByUid(batches, batch);
              }).catch(() => {});
            }
          } catch {
            /* skip a line that is not a task */
          }
        }
      });
      let batchFeed = '';
      const stopBatches = openStream('batches', 'GET', '/batches/stream', undefined, (chunk) => {
        const got = consumeNdjson(batchFeed, chunk);
        batchFeed = got.buffer;
        if (got.error) error = got.error;
        for (const line of got.lines) {
          try {
            const batch = JSON.parse(line) as BatchView;
            if (typeof batch?.uid !== 'number') continue;
            batches = upsertByUid(batches, batch);
          } catch {
            /* skip a line that is not a batch */
          }
        }
      });
      stop = () => {
        stopTasks();
        stopBatches();
      };
    } else {
      const id = setInterval(() => {
        if (results.some((t) => isLiveStatus(t.status))) load();
      }, 1000);
      stop = () => clearInterval(id);
    }
    return () => stop();
  });
</script>
<PageHeader title="Tasks" hint="Tick một hoặc nhiều task rồi Hủy hoặc Xóa. Lọc chỉ đổi danh sách, không đụng hàng đợi." />
<ErrorBanner {error} />
<div class="card bg-base-100 shadow-sm mb-4">
  <div class="card-body p-4 gap-3">
    <div class="flex flex-wrap items-end gap-2">
      <label class="text-xs flex flex-col gap-1">
        Index
        <select class="select select-bordered select-sm w-44" value={indexPick} onchange={(e) => (indexPick = e.currentTarget.value)}>
          <option value="">Tất cả</option>
          {#each indexes as uid}
            <option value={uid}>{uid}</option>
          {/each}
        </select>
      </label>
      <label class="text-xs flex flex-col gap-1">
        Loại task
        <select class="select select-bordered select-sm w-56" value={typePick} onchange={(e) => (typePick = e.currentTarget.value)}>
          <option value="">Tất cả</option>
          {#each TASK_TYPES as kind}
            <option value={kind}>{kind}</option>
          {/each}
        </select>
      </label>
      <button class="btn btn-primary btn-sm" type="button" onclick={load}>Lọc</button>
    </div>
    <div class="flex flex-wrap gap-3">
      {#each STATUS_OPTIONS as item}
        <label class="label cursor-pointer gap-1 py-0 text-xs">
          <input
            type="checkbox"
            class="checkbox checkbox-xs"
            checked={statusPick.includes(item.id)}
            onchange={(e) => toggleStatus(item.id, e.currentTarget.checked)}
          />
          {item.label}
        </label>
      {/each}
    </div>
    <div class="border-t border-base-200 pt-3 flex flex-col gap-2">
      <p class="text-xs text-base-content/60">Đã chọn {picked.length}. Hủy chỉ task đang chờ hoặc đang chạy. Xóa chỉ task đã xong, lỗi, hoặc đã hủy.</p>
      <div class="flex flex-wrap gap-2">
        <button class="btn btn-outline btn-sm" type="button" disabled={readOnly || acting || !cancelIds.length} onclick={cancelSelected}>
          Hủy task đã chọn{#if cancelIds.length} ({cancelIds.length}){/if}
        </button>
        <button class="btn btn-outline btn-error btn-sm" type="button" disabled={readOnly || acting || !deleteIds.length} onclick={deleteSelected}>
          Xóa task đã chọn{#if deleteIds.length} ({deleteIds.length}){/if}
        </button>
      </div>
      {#if readOnly}<p class="text-xs text-warning">Session read-only, không hủy, xóa, hoặc nén được.</p>{/if}
      {#if note}<p class="text-xs break-all">{note}</p>{/if}
    </div>
    {#if flagOn(shell.caps, 'taskQueueCompactionRoute')}
      <div class="border-t border-base-200 pt-3 flex flex-col gap-2">
        <p class="text-xs text-base-content/60">Nén hàng đợi áp lên cả database task, không theo dòng đã tick. Xong engine có thể yêu cầu restart.</p>
        <button class="btn btn-outline btn-sm w-fit" type="button" disabled={readOnly || acting} onclick={compactQueue}>Nén hàng đợi</button>
      </div>
    {/if}
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
        <th class="w-8">
          <input type="checkbox" class="checkbox checkbox-xs" checked={allChecked} onchange={(e) => toggleAll(e.currentTarget.checked)} />
        </th>
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
          <td>
            <input
              type="checkbox"
              class="checkbox checkbox-xs"
              checked={selected.includes(t.uid)}
              onchange={(e) => toggleTask(t.uid, e.currentTarget.checked)}
            />
          </td>
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
