<script lang="ts">
  let {
    value = $bindable(''),
    rows = 12,
    onchange
  }: { value: string; rows?: number; onchange?: (value: string) => void } = $props();
  let err = $state('');
  function validate() {
    try {
      JSON.parse(value);
      err = '';
    } catch (e) {
      err = e instanceof Error ? e.message : 'JSON không hợp lệ';
    }
    onchange?.(value);
  }
</script>
<textarea class="textarea textarea-bordered w-full font-mono text-sm leading-relaxed" {rows} bind:value oninput={validate}></textarea>
{#if err}<p class="text-error text-xs mt-1">{err}</p>{/if}
