<script lang="ts">
  import { logSession } from '../log-session.svelte';

  let box = $state<HTMLPreElement | null>(null);

  $effect(() => {
    logSession.text;
    queueMicrotask(() => {
      if (box) box.scrollTop = box.scrollHeight;
    });
  });
</script>

<aside class="log-dock" aria-label="Log đang stream">
  <div class="flex items-center gap-2 border-b border-white/15 px-3 py-2">
    <p class="min-w-0 flex-1 text-sm font-medium">Logs · {logSession.level}</p>
    <a class="btn btn-ghost btn-xs text-[#f7f4ea]" href="#/logs">Mở full</a>
    <button class="btn btn-outline btn-xs border-white/30 text-[#f7f4ea]" type="button" onclick={() => logSession.stop()}>Dừng</button>
  </div>
  {#if logSession.error}
    <p class="px-3 pt-2 text-xs text-[#ffb4a8] break-all">{logSession.error}</p>
  {/if}
  <pre class="logs-stream log-dock-stream" bind:this={box}>{logSession.text || 'Đang chờ dòng log…'}</pre>
</aside>
