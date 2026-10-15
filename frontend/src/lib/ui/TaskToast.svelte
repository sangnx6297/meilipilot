<script lang="ts">
  import type { SummarizedTaskView } from '../api/types';
  import { shellReader } from './shell-context';

  let { task }: { task: SummarizedTaskView | null } = $props();
  let hidden = $state(false);
  const readShell = shellReader();
  const prod = $derived(readShell().session?.environment === 'production');

  $effect(() => {
    hidden = false;
    if (!task) return;
    if (task.status === 'succeeded' || task.status === 'failed') {
      const id = setTimeout(() => {
        hidden = true;
      }, 8000);
      return () => clearTimeout(id);
    }
  });
</script>

{#if task && !hidden}
  <div
    role="status"
    class="fixed bottom-4 right-4 z-40 max-w-sm rounded-box border p-3 text-sm {prod
      ? 'border-warning bg-warning/10'
      : 'border-base-300 bg-base-100'}"
  >
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="font-medium">Task #{task.taskUid} · {task.status}</p>
        <p class="font-mono text-[11px] text-base-content/55">{task.type}</p>
        {#if prod}
          <p class="mt-1 text-xs text-warning">PROD — đọc kết quả, không giả định xong khi HTTP 202.</p>
        {/if}
        <a class="link link-hover text-xs" href="#/tasks/{task.taskUid}">Chi tiết</a>
      </div>
      <button class="btn btn-ghost btn-xs" type="button" onclick={() => (hidden = true)}>Đóng</button>
    </div>
  </div>
{/if}
