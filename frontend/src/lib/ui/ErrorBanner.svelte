<script lang="ts">
  import CircleAlert from '@lucide/svelte/icons/circle-alert';
  import { errorLabel } from '../api/errors';
  let { error }: { error: unknown } = $props();
  const text = $derived(errorLabel(error));
</script>
{#if text}
  <div role="alert" class="alert alert-error mb-4 py-2.5 text-sm">
    <CircleAlert class="size-4 shrink-0" />
    <span class="min-w-0 break-words">{text}</span>
  </div>
{/if}
