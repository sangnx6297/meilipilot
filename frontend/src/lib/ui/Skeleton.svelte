<script lang="ts">
  let { rows = 6 }: { rows?: number } = $props();
</script>

<div class="space-y-2" aria-busy="true">
  {#each Array.from({ length: rows }) as _, i (i)}
    <div class="h-8 animate-pulse rounded bg-base-300"></div>
  {/each}
</div>
