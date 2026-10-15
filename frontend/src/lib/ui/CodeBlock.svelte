<script lang="ts">
  import Copy from '@lucide/svelte/icons/copy';
  import Check from '@lucide/svelte/icons/check';
  import { copyText } from '../store/connection';

  let { value }: { value: unknown } = $props();
  const text = $derived(typeof value === 'string' ? value : JSON.stringify(value, null, 2));
  let copied = $state(false);

  async function copy() {
    if (!text) return;
    try {
      await copyText(text);
    } catch {
      await navigator.clipboard.writeText(text);
    }
    copied = true;
    setTimeout(() => (copied = false), 1500);
  }
</script>

<div class="relative min-w-0">
  <button
    type="button"
    class="btn btn-ghost btn-xs absolute top-2 right-2 z-10 gap-1 bg-base-100/90 text-base-content"
    onclick={copy}
    title="Copy JSON"
  >
    {#if copied}
      <Check class="size-3.5" /> Đã copy
    {:else}
      <Copy class="size-3.5" /> Copy
    {/if}
  </button>
  <pre class="max-h-[28rem] overflow-auto rounded-lg border border-base-300 bg-base-200/80 p-3 pr-20 font-mono text-xs leading-relaxed">{text}</pre>
</div>
