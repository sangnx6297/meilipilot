<script lang="ts">
  import mark from './brand/logo.svg?url';
  let { size = 'h-8 w-8', alt = 'MeiliPilot' }: { size?: string; alt?: string } = $props();
</script>
<img src={mark} {alt} class="{size} shrink-0" />
