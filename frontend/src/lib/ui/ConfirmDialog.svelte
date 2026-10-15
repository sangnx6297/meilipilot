<script lang="ts">
  let {
    open = false,
    title,
    body,
    confirmLabel = 'Xác nhận',
    busy = false,
    oncancel,
    onconfirm
  }: {
    open?: boolean;
    title: string;
    body: string;
    confirmLabel?: string;
    busy?: boolean;
    oncancel: () => void;
    onconfirm: () => void;
  } = $props();
</script>

{#if open}
  <div class="modal modal-open" role="alertdialog" aria-modal="true" aria-labelledby="confirm-title">
    <div class="modal-box max-w-md">
      <h3 id="confirm-title" class="text-base font-semibold tracking-tight">{title}</h3>
      <pre class="mt-3 whitespace-pre-wrap font-mono text-xs text-base-content/80">{body}</pre>
      <div class="modal-action">
        <button class="btn btn-ghost btn-sm" type="button" disabled={busy} onclick={oncancel}>Hủy</button>
        <button class="btn btn-error btn-sm" type="button" disabled={busy} onclick={onconfirm}>{confirmLabel}</button>
      </div>
    </div>
    <button class="modal-backdrop bg-neutral/40" type="button" onclick={oncancel} aria-label="Đóng"></button>
  </div>
{/if}
