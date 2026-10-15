<script lang="ts">
  let {
    title,
    hint = '',
    actionLabel = '',
    onclick
  }: {
    title: string;
    hint?: string;
    actionLabel?: string;
    onclick?: () => void;
  } = $props();
</script>

<div class="rounded-box border border-dashed border-base-300 bg-base-100 px-6 py-10 text-center">
  <p class="font-medium">{title}</p>
  {#if hint}
    <p class="mt-1 text-sm text-base-content/55">{hint}</p>
  {/if}
  {#if actionLabel && onclick}
    <button class="btn btn-primary btn-sm mt-4" type="button" onclick={onclick}>{actionLabel}</button>
  {/if}
</div>
