import { envLabel } from '../store/connection';

export function confirmBody(opts: {
  env?: string;
  host?: string;
  uid?: string;
  detail: string;
}): string {
  const bits = [opts.env ? envLabel(opts.env) : '', opts.host ?? '', opts.uid ?? ''].filter(Boolean);
  if (!bits.length) return opts.detail;
  return `${bits.join(' · ')}\n${opts.detail}`;
}
