export type PkgVersion = { major: number; minor: number; patch: number };

export type EngineCapability = {
  version: string;
  flags: Record<string, boolean>;
  chat: boolean;
  rules: boolean;
  network: boolean;
  metrics: boolean;
};

export function parsePkgVersion(pkg: string): PkgVersion {
  const m = pkg.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  if (!m) return { major: 0, minor: 0, patch: 0 };
  return { major: Number(m[1]), minor: Number(m[2]), patch: Number(m[3] ?? 0) };
}

export function capabilitiesFrom(
  pkgVersion: string,
  experimental?: Record<string, boolean> | null
): EngineCapability {
  const flags: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(experimental ?? {})) {
    flags[key] = value === true;
  }
  return {
    version: pkgVersion,
    flags,
    chat: flags.chatCompletions === true,
    rules: flags.dynamicSearchRules === true,
    network: flags.network === true,
    metrics: flags.metrics === true
  };
}

export function flagOn(caps: EngineCapability, name: string): boolean {
  return caps.flags[name] === true;
}

export const DEFAULT_CAPS: EngineCapability = capabilitiesFrom('0.0.0', {});

export function navAllowed(href: string, _caps: EngineCapability): boolean {
  void href;
  return true;
}
