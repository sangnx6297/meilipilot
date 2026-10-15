<script lang="ts">
  import { envChipClass, envLabel } from '../store/connection';

  let { env, readOnly = false }: { env?: string; readOnly?: boolean } = $props();
</script>

<div class="flex min-w-0 flex-wrap items-center gap-1">
  <span class="chip {envChipClass(env)}">{envLabel(env)}</span>
  {#if readOnly}<span class="chip chip-ro">RO</span>{/if}
</div>
