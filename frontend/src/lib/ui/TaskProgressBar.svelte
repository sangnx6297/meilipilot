<script lang="ts">
  import type { TaskProgress } from '../api/task-progress';
  let { progress, wide = false }: { progress: TaskProgress; wide?: boolean } = $props();
  const barTone = $derived(
    progress.tone === 'done'
      ? 'progress-done'
      : progress.tone === 'fail'
        ? 'progress-fail'
        : progress.tone === 'muted'
          ? 'progress-muted'
          : 'progress-active'
  );
</script>
<div class="flex flex-col gap-0.5 {wide ? 'w-full' : 'min-w-44'}">
  <div class="flex items-center gap-2">
    {#if progress.indeterminate}
      <progress class="progress {barTone} {wide ? 'w-full' : 'w-28'}"></progress>
    {:else}
      <progress class="progress {barTone} {wide ? 'w-full' : 'w-28'}" value={progress.percent ?? 0} max="100"></progress>
    {/if}
    {#if !wide}
      <span class="text-xs text-base-content/70 whitespace-nowrap">{progress.label}</span>
    {/if}
  </div>
  {#if wide}
    <span class="text-sm text-base-content/70">{progress.label}{#if progress.percent != null && !progress.indeterminate} · {Math.round(progress.percent)}%{/if}</span>
  {/if}
  {#if progress.step}
    <span class="text-[11px] text-base-content/50 truncate">{progress.step}</span>
  {/if}
</div>
