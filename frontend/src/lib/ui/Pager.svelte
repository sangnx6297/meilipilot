<script lang="ts">
  let {
    offset,
    limit,
    total,
    onchange
  }: { offset: number; limit: number; total: number; onchange: (offset: number) => void } = $props();
</script>
<div class="join mt-3">
  <button
    class="join-item btn btn-sm"
    disabled={offset <= 0}
    onclick={() => onchange(Math.max(0, offset - limit))}
  >Trước</button>
  <span class="join-item btn btn-sm btn-ghost pointer-events-none">
    {total === 0 ? 0 : offset + 1}–{Math.min(offset + limit, total)} / {total}
  </span>
  <button
    class="join-item btn btn-sm"
    disabled={offset + limit >= total}
    onclick={() => onchange(offset + limit)}
  >Sau</button>
</div>
