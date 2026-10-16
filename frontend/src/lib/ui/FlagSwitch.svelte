<script lang="ts">
  import { flagOn } from '../api/capability';
  import { patchExperimental } from '../api/instance';
  import { featureHint } from '../experimental';
  import { shellReader } from './shell-context';

  let { name, label = '' }: { name: string; label?: string } = $props();
  const readShell = shellReader();
  const shell = $derived(readShell());
  const checked = $derived(flagOn(shell.caps, name));
  const capsReady = $derived(shell.caps.version !== '0.0.0');
  const known = $derived(name in shell.caps.flags);
  let pending = $state(false);
  let error = $state<unknown>(null);
  const endpoint = $derived(
    shell.session?.host ? `${shell.session.host.replace(/\/$/, '')}/experimental-features` : '/experimental-features'
  );

  async function onChange(e: Event) {
    const input = e.currentTarget as HTMLInputElement;
    const next = input.checked;
    if (shell.session?.readOnly || !known) {
      input.checked = checked;
      return;
    }
    pending = true;
    error = null;
    try {
      await patchExperimental({ [name]: next });
      await readShell().refreshCaps();
    } catch (err) {
      input.checked = !next;
      error = err;
    } finally {
      pending = false;
    }
  }
</script>

{#if capsReady && !known}
  <p class="text-sm">
    Engine không có field <span class="font-mono">{name}</span>. Không PATCH cờ này.
  </p>
{:else}
<label class="flex items-start gap-2 text-sm">
  <input
    type="checkbox"
    class="toggle toggle-sm mt-0.5"
    checked={checked}
    disabled={pending || !capsReady || !known || shell.session?.readOnly}
    onchange={onChange}
  />
  <span>
    <span class="font-mono">{label || name}</span>
    <span class="block text-xs text-base-content/50">{featureHint(name) || name}</span>
    <span class="block font-mono text-[10px] text-base-content/40">{endpoint}</span>
    {#if shell.session?.readOnly}
      <span class="block text-xs text-warning">Session read-only, không PATCH được.</span>
    {/if}
    {#if error}
      <span class="block text-xs text-error">{error instanceof Error ? error.message : 'Không bật được cờ.'}</span>
    {/if}
  </span>
</label>
{/if}
