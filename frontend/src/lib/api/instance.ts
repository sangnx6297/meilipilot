import { meili, meiliText } from './client';
import type { SummarizedTaskView } from './types';

export const createDump = () => meili<SummarizedTaskView>('POST', '/dumps');
export const createSnapshot = () => meili<SummarizedTaskView>('POST', '/snapshots');
export const exportRemote = (body: {
  url: string;
  apiKey?: string;
  payloadSize?: string;
  indexes?: Record<string, unknown>;
}) => meili<SummarizedTaskView>('POST', '/export', body);

export const listWebhooks = () =>
  meili<{ results: { uuid: string; url: string; headers: Record<string, string> }[] }>('GET', '/webhooks');
export const createWebhook = (body: { url: string; headers?: Record<string, string> }) =>
  meili<unknown>('POST', '/webhooks', body);
export const getWebhook = (uuid: string) => meili<unknown>('GET', `/webhooks/${uuid}`);
export const updateWebhook = (uuid: string, body: { url?: string; headers?: Record<string, string> }) =>
  meili<unknown>('PATCH', `/webhooks/${uuid}`, body);
export const deleteWebhook = (uuid: string) => meili<void>('DELETE', `/webhooks/${uuid}`);

export const getExperimental = () => meili<Record<string, boolean>>('GET', '/experimental-features');
export const patchExperimental = (patch: Record<string, boolean>) =>
  meili<Record<string, boolean>>('PATCH', '/experimental-features', patch);

export const getNetwork = () => meili<unknown>('GET', '/network');
export const patchNetwork = (body: unknown) => meili<unknown>('PATCH', '/network', body);
export const networkControl = (body: unknown) => meili<unknown>('POST', '/network/control', body);

export const setLogStderr = (target: string) => meili<unknown>('POST', '/logs/stderr', { target });
export const stopLogStream = () => meili<unknown>('DELETE', '/logs/stream');

export const renderTemplate = (body: unknown) => meili<unknown>('POST', '/render-template', body);
export const postMcp = (body: unknown) => meili<unknown>('POST', '/mcp', body);
export const getMetrics = () => meiliText('GET', '/metrics');
