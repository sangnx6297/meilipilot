export type PkgVersion = { major: number; minor: number; patch: number };

export type EngineCapability = {
  version: string;
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

function atLeast(v: PkgVersion, major: number, minor: number): boolean {
  return v.major > major || (v.major === major && v.minor >= minor);
}

export function capabilitiesFrom(
  pkgVersion: string,
  experimental?: Record<string, boolean> | null
): EngineCapability {
  const v = parsePkgVersion(pkgVersion);
  const exp = experimental ?? {};
  return {
    version: pkgVersion,
    chat: exp.chatCompletions === true,
    rules: atLeast(v, 1, 53),
    network: exp.network === true,
    metrics: exp.metrics === true
  };
}

export const DEFAULT_CAPS: EngineCapability = capabilitiesFrom('0.0.0', {});

export function navAllowed(href: string, caps: EngineCapability): boolean {
  if (href.includes('/chat')) return caps.chat;
  if (href.includes('/rules')) return caps.rules;
  return true;
}
