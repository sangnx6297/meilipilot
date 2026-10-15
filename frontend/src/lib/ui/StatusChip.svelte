<script lang="ts">
  import { statusChipClass } from './status-chip';

  let { status }: { status: string } = $props();
</script>

<span class={statusChipClass(status)}>{status}</span>
