import { getContext, setContext } from 'svelte';
import { DEFAULT_CAPS, type EngineCapability } from '../api/capability';
import type { Session } from '../store/connection';

const KEY = 'meili-shell';

export type ShellCtx = {
  session: Session | null;
  caps: EngineCapability;
  refreshCaps: () => Promise<void>;
};

export function setShell(getter: () => ShellCtx): void {
  setContext(KEY, getter);
}

export function shellReader(): () => ShellCtx {
  const getter = getContext<() => ShellCtx>(KEY);
  return () => (getter ? getter() : { session: null, caps: DEFAULT_CAPS, refreshCaps: async () => {} });
}
