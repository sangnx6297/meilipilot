import { MeiliError, type ResponseError } from './errors';

type Method = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export type TransportReq = {
  method: Method;
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
};

export type TransportRes = { status: number; body: string };

export type Transport = (req: TransportReq) => Promise<TransportRes>;

let transport: Transport | null = null;

export function setTransport(t: Transport): void {
  transport = t;
}

export function decodeTransport<T>(res: TransportRes): T {
  const data = res.body ? JSON.parse(res.body) : {};
  if (res.status < 200 || res.status >= 300) {
    const err = data as ResponseError;
    throw new MeiliError(
      res.status,
      err.code ?? 'http_error',
      err.type ?? 'system',
      err.link ?? '',
      err.message ?? String(res.status)
    );
  }
  return data as T;
}

async function send(
  method: Method,
  path: string,
  body?: unknown,
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<TransportRes> {
  if (!transport) {
    throw new Error('transport not set');
  }
  return transport({ method, path, query, body });
}

export async function meili<T>(
  method: Method,
  path: string,
  body?: unknown,
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<T> {
  return decodeTransport<T>(await send(method, path, body, query));
}

export async function meiliText(
  method: Method,
  path: string,
  query?: Record<string, string | number | boolean | undefined | null>
): Promise<string> {
  const res = await send(method, path, undefined, query);
  if (res.status < 200 || res.status >= 300) {
    decodeTransport(res);
  }
  return res.body ?? '';
}

export { MeiliError };
