<script lang="ts">
  let { title, hint = '' }: { title: string; hint?: string } = $props();
</script>
<header class="mb-5 border-b border-base-300 pb-4">
  <h1 class="text-xl font-semibold tracking-tight">{title}</h1>
  {#if hint}
    <p class="mt-1 font-mono text-xs text-base-content/45">{hint}</p>
  {/if}
</header>
