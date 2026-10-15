<script lang="ts">
  import EnvChips from './EnvChips.svelte';
  import { shellReader } from './shell-context';

  let {
    uid,
    active = ''
  }: {
    uid: string;
    active?: 'overview' | 'documents' | 'search' | 'settings' | '';
  } = $props();

  const readShell = shellReader();
  const env = $derived(readShell().session?.environment ?? '');
  const host = $derived(readShell().session?.host ?? '');
</script>

<div class="mb-4 flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-base-300 pb-3">
  <span class="font-mono text-sm font-medium">{uid}</span>
  {#if env}<EnvChips {env} />{/if}
  {#if host}<span class="truncate font-mono text-[11px] text-base-content/45" title={host}>{host}</span>{/if}
  <nav class="ml-auto flex flex-wrap gap-1 text-xs">
    <a class="btn btn-ghost btn-xs" class:btn-active={active === 'overview'} href="#/indexes/{uid}">Overview</a>
    <a class="btn btn-ghost btn-xs" class:btn-active={active === 'documents'} href="#/indexes/{uid}/documents">Documents</a>
    <a class="btn btn-ghost btn-xs" class:btn-active={active === 'search'} href="#/indexes/{uid}/search">Search</a>
    <a class="btn btn-ghost btn-xs" class:btn-active={active === 'settings'} href="#/indexes/{uid}/settings">Settings</a>
  </nav>
</div>
