<script lang="ts">
  import { renderTemplate } from '../api/instance';
  import { inlineRenderBody, renderPreview } from '../api/render-form';

  let template = $state('{{ doc.title }} — {{ doc.city }}');
  let documentText = $state('{\n  "title": "Quán mẫu",\n  "city": "Huế"\n}');
  let preview = $state<{ template: string; rendered: string } | null>(null);
  let error = $state('');
  let busy = $state(false);

  async function run() {
    busy = true;
    error = '';
    preview = null;
    try {
      const raw = await renderTemplate(inlineRenderBody(template, documentText));
      preview = renderPreview(raw);
    } catch (err) {
      error = err instanceof Error ? err.message : 'Không render được';
    } finally {
      busy = false;
    }
  }
</script>

<section class="card bg-base-100 shadow-sm lg:col-span-2">
  <div class="card-body p-4 gap-3">
    <h2 class="font-medium">Render template</h2>
    <p class="text-xs text-base-content/60">
      Xem trước chuỗi Meilisearch ghép từ template và một document. Dùng để thử document template của embedder hoặc chat.
      Không ghi document, không index.
    </p>
    <label class="text-xs flex flex-col gap-1">
      Template. Biến nằm trong document là <span class="font-mono">doc</span>.
      <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="3" bind:value={template}></textarea>
    </label>
    <label class="text-xs flex flex-col gap-1">
      Document JSON để thử
      <textarea class="textarea textarea-bordered textarea-sm font-mono" rows="5" bind:value={documentText}></textarea>
    </label>
    <button class="btn btn-primary btn-sm w-fit" type="button" disabled={busy} onclick={run}>Xem kết quả</button>
    {#if error}<p class="text-xs text-error break-all">{error}</p>{/if}
    {#if preview}
      <div class="rounded-box bg-base-200 p-3">
        <p class="text-xs text-base-content/50 mb-1">Đã ghép</p>
        <p class="text-sm whitespace-pre-wrap">{preview.rendered || '(rỗng)'}</p>
      </div>
    {/if}
  </div>
</section>
