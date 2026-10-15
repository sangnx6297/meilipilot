import {
  Connect,
  Disconnect,
  Session as WailsSession,
  ListProfiles,
  UseProfile,
  DeleteProfile,
  CopyText,
  ForwardFor,
  SaveTextFile
} from '../../wailsjs/go/main/App';

export type Environment = 'dev' | 'staging' | 'production' | 'custom';

export type Session = {
  id?: string;
  host: string;
  name: string;
  environment?: Environment | string;
  readOnly?: boolean;
};

export type Profile = {
  id: string;
  name: string;
  host: string;
  environment: Environment | string;
  readOnly: boolean;
  hasKey: boolean;
};

export async function connect(input: {
  host: string;
  apiKey: string;
  name: string;
  environment?: string;
  readOnly?: boolean;
}): Promise<Session> {
  return Connect(input.host, input.apiKey, input.name, input.environment ?? 'dev', Boolean(input.readOnly));
}

export async function currentSession(): Promise<Session | null> {
  return WailsSession();
}

export async function disconnect(): Promise<void> {
  await Disconnect();
}

export async function listProfiles(): Promise<Profile[]> {
  return ListProfiles();
}

export async function useProfile(id: string): Promise<Session> {
  return UseProfile(id);
}

export async function deleteProfile(id: string): Promise<void> {
  await DeleteProfile(id);
}

export async function copyText(text: string): Promise<void> {
  await CopyText(text);
}

export async function saveTextFile(defaultName: string, content: string): Promise<string> {
  return SaveTextFile(defaultName, content);
}

export async function forwardFor(
  profileId: string,
  method: string,
  path: string,
  query: Record<string, string>,
  body: string
): Promise<{ status: number; body: string }> {
  return ForwardFor(profileId, method, path, query, body);
}

export function defaultReadOnlyForEnv(env?: string): boolean {
  return env === 'production';
}

export function envLabel(env?: string): string {
  if (env === 'production') return 'PROD';
  if (env === 'staging') return 'STAGING';
  if (env === 'dev') return 'DEV';
  return env ? env.toUpperCase() : 'CUSTOM';
}

export function envBadgeClass(env?: string): string {
  if (env === 'production') return 'badge-error';
  if (env === 'staging') return 'badge-warning';
  if (env === 'dev') return 'badge-success';
  return 'badge-ghost';
}

/** Compact chips — không dùng daisyUI .badge (fit-content + flex-shrink:0 làm tràn sidebar). */
export function envChipClass(env?: string): string {
  if (env === 'production') return 'chip-prod';
  if (env === 'staging') return 'chip-staging';
  if (env === 'dev') return 'chip-dev';
  return 'chip-muted';
}

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 8) return '••••';
  return `${key.slice(0, 4)}…${key.slice(-4)}`;
}
