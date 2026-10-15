<script lang="ts">
  import { connect, defaultReadOnlyForEnv, listProfiles, useProfile, deleteProfile, type Profile } from '../lib/store/connection';
  import { confirmBody } from '../lib/ui/confirm-copy';
  import ConfirmDialog from '../lib/ui/ConfirmDialog.svelte';
  import EnvChips from '../lib/ui/EnvChips.svelte';
  import { meili } from '../lib/api/client';
  import ErrorBanner from '../lib/ui/ErrorBanner.svelte';
  import BrandMark from '../lib/ui/BrandMark.svelte';
  import Search from '@lucide/svelte/icons/search';
  import GitCompare from '@lucide/svelte/icons/git-compare';
  import ListTodo from '@lucide/svelte/icons/list-todo';
  import ShieldCheck from '@lucide/svelte/icons/shield-check';
  import {
    APP_COPYRIGHT,
    APP_FEATURES,
    APP_INTRO,
    APP_NAME,
    APP_PITCH,
    APP_TAGLINE,
    APP_TRUST,
    APP_VERSION
  } from '../lib/app-meta';

  const featureIcons = {
    search: Search,
    settings: GitCompare,
    ops: ListTodo
  } as const;
  let { onconnected }: { onconnected: () => void } = $props();
  let host = $state('http://127.0.0.1:7700');
  let apiKey = $state('');
  let name = $state('local');
  let environment = $state('dev');
  let readOnly = $state(false);
  let error = $state<unknown>(null);
  let loading = $state(false);
  let profiles = $state<Profile[]>([]);

  async function refresh() {
    profiles = await listProfiles();
  }
  refresh();

  async function afterConnect() {
    await meili('GET', '/health');
    onconnected();
  }

  async function submit() {
    error = null;
    loading = true;
    try {
      await connect({ host, apiKey, name, environment, readOnly });
      await afterConnect();
    } catch (e) {
      error = e;
    } finally {
      loading = false;
    }
  }

  async function openProfile(p: Profile) {
    error = null;
    loading = true;
    try {
      await useProfile(p.id);
      await afterConnect();
    } catch (e) {
      error = e;
    } finally {
      loading = false;
    }
  }

  let pendingProfile = $state<Profile | null>(null);

  async function removeProfile() {
    if (!pendingProfile) return;
    const id = pendingProfile.id;
    pendingProfile = null;
    await deleteProfile(id);
    await refresh();
  }

  function fill(p: Profile) {
    name = p.name;
    host = p.host;
    apiKey = '';
    environment = p.environment || 'dev';
    readOnly = defaultReadOnlyForEnv(environment) ? true : p.readOnly;
  }

  function onEnvironmentChange(e: Event) {
    const v = (e.currentTarget as HTMLSelectElement).value;
    environment = v;
    if (defaultReadOnlyForEnv(v)) readOnly = true;
  }

  $effect(() => {
    if (defaultReadOnlyForEnv(environment)) readOnly = true;
  });
</script>
<main class="grid min-h-screen lg:grid-cols-[minmax(280px,1.05fr)_minmax(420px,1fr)]">
  <aside class="relative hidden overflow-hidden flex-col justify-between bg-neutral px-10 py-10 text-neutral-content lg:flex">
    <div class="pointer-events-none absolute -top-24 -left-16 h-80 w-80 rounded-full bg-accent/20 blur-3xl"></div>
    <div class="pointer-events-none absolute bottom-20 -right-16 h-56 w-56 rounded-full bg-accent/10 blur-3xl"></div>
    <div class="relative max-w-md">
      <div class="flex items-center gap-3">
        <BrandMark size="h-11 w-11" />
        <div>
          <div class="text-2xl font-semibold tracking-tight">{APP_NAME}</div>
          <div class="mt-0.5 flex items-center gap-2 text-[11px] text-neutral-content/55">
            <span>{APP_TAGLINE}</span>
            <span class="rounded border border-white/15 px-1.5 py-0.5 font-mono text-[10px] text-accent">v{APP_VERSION}</span>
          </div>
        </div>
      </div>
      <h1 class="mt-10 text-[1.65rem] font-semibold leading-snug tracking-tight text-white whitespace-pre-line">{APP_PITCH}</h1>
      <p class="mt-4 max-w-sm text-sm leading-relaxed text-neutral-content/70">{APP_INTRO}</p>
      <ul class="mt-8 space-y-2.5">
        {#each APP_FEATURES as feat}
          {@const Icon = featureIcons[feat.id]}
          <li class="flex gap-3 rounded-lg border border-white/10 bg-white/5 p-3">
            <div class="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-accent/15 text-accent">
              <Icon class="size-4" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-medium text-white">{feat.title}</div>
              <p class="mt-0.5 text-xs leading-relaxed text-neutral-content/60">{feat.body}</p>
            </div>
          </li>
        {/each}
      </ul>
    </div>
    <div class="relative mt-8">
      <div class="mb-4 flex flex-wrap gap-2">
        {#each APP_TRUST as t}
          <span class="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-white/5 px-2.5 py-1 text-[11px] text-neutral-content/80" title={t.hint}>
            <ShieldCheck class="size-3 text-accent" />
            {t.label}
          </span>
        {/each}
      </div>
      <p class="text-xs text-neutral-content/45">{APP_COPYRIGHT}</p>
    </div>
  </aside>
  <section class="flex items-center justify-center bg-base-200 p-6 sm:p-10">
    <div class="card w-full max-w-md bg-base-100">
      <div class="card-body gap-3 p-6">
        <h1 class="flex items-center gap-2 text-lg font-semibold lg:hidden">
          <BrandMark size="h-8 w-8" />
          {APP_NAME}
        </h1>
        <p class="text-xs leading-relaxed text-base-content/55 lg:hidden">{APP_PITCH.replace('\n', ' ')} {APP_INTRO}</p>
        <div>
          <h2 class="text-lg font-semibold tracking-tight">Kết nối instance</h2>
          <p class="mt-1 text-sm text-base-content/55">Chọn session đã lưu hoặc tạo mới. Key mã DPAPI trên máy.</p>
        </div>
        <ErrorBanner {error} />

        {#if profiles.length}
          <h3 class="text-xs font-semibold uppercase tracking-wide text-base-content/45">Session đã lưu</h3>
          <ul class="divide-y divide-base-300 overflow-hidden rounded-lg border border-base-300">
            {#each profiles as p}
              <li class="flex min-w-0 items-center gap-2 px-3 py-2.5 text-sm">
                <div class="min-w-0 flex-1 overflow-hidden">
                  <p class="truncate font-medium" title={p.name}>{p.name}</p>
                  <div class="mt-1"><EnvChips env={p.environment} readOnly={p.readOnly} /></div>
                  <div class="mt-0.5 truncate font-mono text-[11px] text-base-content/45">{p.host} · {p.hasKey ? 'key đã lưu' : 'chưa có key'}</div>
                </div>
                <button class="btn btn-ghost btn-xs" onclick={() => fill(p)}>Sửa</button>
                <button class="btn btn-primary btn-xs" disabled={loading} onclick={() => openProfile(p)}>Kết nối</button>
                <button class="btn btn-ghost btn-xs text-error" onclick={() => (pendingProfile = p)}>Xóa</button>
              </li>
            {/each}
          </ul>
        {/if}

        <h3 class="text-xs font-semibold uppercase tracking-wide text-base-content/45">Kết nối mới</h3>
        <label class="form-control w-full">
          <span class="mb-1 text-xs text-base-content/60">Tên session</span>
          <input class="input input-bordered input-sm w-full" bind:value={name} />
        </label>
        <label class="form-control w-full">
          <span class="mb-1 text-xs text-base-content/60">Host</span>
          <input class="input input-bordered input-sm w-full font-mono" bind:value={host} />
        </label>
        <div class="grid grid-cols-2 gap-2">
          <label class="form-control">
            <span class="mb-1 text-xs text-base-content/60">Môi trường</span>
            <select class="select select-bordered select-sm w-full" bind:value={environment} onchange={onEnvironmentChange}>
              <option value="dev">dev</option>
              <option value="staging">staging</option>
              <option value="production">production</option>
              <option value="custom">custom</option>
            </select>
          </label>
          <label class="label mt-5 cursor-pointer justify-start gap-2">
            <input type="checkbox" class="checkbox checkbox-sm" bind:checked={readOnly} />
            <span class="text-xs">{environment === 'production' ? 'readOnly (bắt buộc mặc định trên PROD)' : 'readOnly'}</span>
          </label>
          {#if environment === 'production' && !readOnly}
            <p class="col-span-2 text-[11px] text-error">PROD đang mở ghi. Chỉ bỏ tick khi cố ý PATCH/DELETE.</p>
          {/if}
        </div>
        <label class="form-control w-full">
          <span class="mb-1 text-xs text-base-content/60">API key / master key</span>
          <input class="input input-bordered input-sm w-full" type="password" bind:value={apiKey} placeholder="trống = giữ key đã lưu" />
        </label>
        <button class="btn btn-primary mt-1" disabled={loading} onclick={submit}>
          {#if loading}<span class="loading loading-spinner loading-sm"></span>{/if}
          {loading ? 'Đang kết nối…' : 'Lưu và kết nối'}
        </button>
        <p class="text-center text-[11px] text-base-content/40 lg:hidden">{APP_COPYRIGHT}</p>
      </div>
    </div>
  </section>
</main>
<ConfirmDialog
  open={pendingProfile != null}
  title="Xóa session"
  body={confirmBody({
    env: pendingProfile?.environment,
    host: pendingProfile?.host,
    uid: pendingProfile?.name,
    detail: 'Xóa session đã lưu? API key trong vault cũng mất.'
  })}
  confirmLabel="Xóa"
  oncancel={() => (pendingProfile = null)}
  onconfirm={removeProfile}
/>
